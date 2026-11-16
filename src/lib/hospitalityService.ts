import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  AccommodationProperty,
  TouristAttraction,
  VERIFIED_ACCOMMODATION_PROPERTIES,
  VERIFIED_PLACES_TO_VISIT,
  sortAccommodationsByDistance,
  sortAttractionsByDistance,
} from '../data/accommodationData';

const ACCOMMODATION_COLLECTION = 'accommodationProperties';
const ATTRACTIONS_COLLECTION = 'touristAttractions';

/**
 * Merges default verified records with Firestore overrides/additions.
 * Records with `isActive === false` in Firestore are hidden from public view
 * while still visible to administrators in the Org. Secretary Dashboard.
 */
export function mergeAccommodationRecords(
  firestoreDocs: AccommodationProperty[],
  includeInactive = false
): AccommodationProperty[] {
  const map = new Map<string, AccommodationProperty>();
  for (const item of VERIFIED_ACCOMMODATION_PROPERTIES) {
    map.set(item.id, { ...item, isActive: item.isActive ?? true });
  }
  for (const remote of firestoreDocs) {
    if (!remote || !remote.id) continue;
    map.set(remote.id, { ...remote, isActive: remote.isActive ?? true });
  }
  const merged = Array.from(map.values()).filter(
    (item) => includeInactive || item.isActive !== false
  );
  return sortAccommodationsByDistance(merged, 'nearest');
}

export function mergeAttractionRecords(
  firestoreDocs: TouristAttraction[],
  includeInactive = false
): TouristAttraction[] {
  const map = new Map<string, TouristAttraction>();
  for (const item of VERIFIED_PLACES_TO_VISIT) {
    map.set(item.id, { ...item, isActive: item.isActive ?? true });
  }
  for (const remote of firestoreDocs) {
    if (!remote || !remote.id) continue;
    map.set(remote.id, { ...remote, isActive: remote.isActive ?? true });
  }
  const merged = Array.from(map.values()).filter(
    (item) => includeInactive || item.isActive !== false
  );
  return sortAttractionsByDistance(merged);
}

export async function fetchAccommodationDirectory(
  includeInactive = false
): Promise<{ items: AccommodationProperty[]; remoteIds: Set<string> }> {
  try {
    const snapshot = await getDocs(collection(db, ACCOMMODATION_COLLECTION));
    const remoteDocs = snapshot.docs.map((d) => ({
      ...(d.data() as AccommodationProperty),
      id: d.id,
    }));
    const remoteIds = new Set(remoteDocs.map((r) => r.id));
    return {
      items: mergeAccommodationRecords(remoteDocs, includeInactive),
      remoteIds,
    };
  } catch (error) {
    console.warn('Unable to read Firestore accommodation directory, using verified defaults:', error);
    return {
      items: sortAccommodationsByDistance(
        VERIFIED_ACCOMMODATION_PROPERTIES.filter((item) => includeInactive || item.isActive !== false),
        'nearest'
      ),
      remoteIds: new Set<string>(),
    };
  }
}

export async function fetchAttractionsDirectory(
  includeInactive = false
): Promise<{ items: TouristAttraction[]; remoteIds: Set<string> }> {
  try {
    const snapshot = await getDocs(collection(db, ATTRACTIONS_COLLECTION));
    const remoteDocs = snapshot.docs.map((d) => ({
      ...(d.data() as TouristAttraction),
      id: d.id,
    }));
    const remoteIds = new Set(remoteDocs.map((r) => r.id));
    return {
      items: mergeAttractionRecords(remoteDocs, includeInactive),
      remoteIds,
    };
  } catch (error) {
    console.warn('Unable to read Firestore attractions directory, using verified defaults:', error);
    return {
      items: sortAttractionsByDistance(
        VERIFIED_PLACES_TO_VISIT.filter((item) => includeInactive || item.isActive !== false)
      ),
      remoteIds: new Set<string>(),
    };
  }
}

export function sanitizeSlugId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  if (cleaned && /^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`;
}

export async function saveAccommodationRecord(
  record: AccommodationProperty,
  adminEmail: string
): Promise<AccommodationProperty> {
  const id = sanitizeSlugId(record.id || record.name, 'stay');
  const distanceKm = Math.max(0, Math.min(500, Number(record.distanceKm) || 0));
  const payload: Record<string, unknown> = {
    id,
    name: record.name.trim().slice(0, 150),
    category: record.category,
    locality: record.locality.trim().slice(0, 100),
    address: record.address.trim().slice(0, 400),
    phone: record.phone.trim().slice(0, 50),
    distanceKm: Number(distanceKm.toFixed(1)),
    mapsQuery: (record.mapsQuery || `${record.name}, ${record.address}`).trim().slice(0, 300),
    isActive: record.isActive !== false,
    updatedAt: new Date().toISOString().slice(0, 50),
    updatedBy: (adminEmail || 'org.secy.cp@srmist.edu.in').slice(0, 150),
  };

  if (record.secondaryPhone && record.secondaryPhone.trim()) {
    payload.secondaryPhone = record.secondaryPhone.trim().slice(0, 50);
  }
  if (record.phoneTypeNote && record.phoneTypeNote.trim()) {
    payload.phoneTypeNote = record.phoneTypeNote.trim().slice(0, 120);
  }
  if (typeof record.driveMinutes === 'number' && Number.isFinite(record.driveMinutes)) {
    payload.driveMinutes = Math.max(0, Math.min(1000, Math.round(record.driveMinutes)));
  }

  try {
    await setDoc(doc(db, ACCOMMODATION_COLLECTION, id), payload);
    return payload as unknown as AccommodationProperty;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ACCOMMODATION_COLLECTION}/${id}`);
  }
}

export async function deleteAccommodationOverride(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ACCOMMODATION_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ACCOMMODATION_COLLECTION}/${id}`);
  }
}

export async function saveAttractionRecord(
  record: TouristAttraction,
  adminEmail: string
): Promise<TouristAttraction> {
  const id = sanitizeSlugId(record.id || record.name, 'place');
  const distanceKm = Math.max(0, Math.min(500, Number(record.distanceKm) || 0));
  const payload: Record<string, unknown> = {
    id,
    name: record.name.trim().slice(0, 150),
    locality: record.locality.trim().slice(0, 120),
    description: record.description.trim().slice(0, 400),
    distanceKm: Number(distanceKm.toFixed(1)),
    image: record.image && record.image.trim() ? record.image.trim().slice(0, 500) : null,
    mapsQuery: (record.mapsQuery || `${record.name}, ${record.locality}`).trim().slice(0, 300),
    isActive: record.isActive !== false,
    updatedAt: new Date().toISOString().slice(0, 50),
    updatedBy: (adminEmail || 'org.secy.cp@srmist.edu.in').slice(0, 150),
  };

  if (typeof record.driveMinutes === 'number' && Number.isFinite(record.driveMinutes)) {
    payload.driveMinutes = Math.max(0, Math.min(1000, Math.round(record.driveMinutes)));
  }

  try {
    await setDoc(doc(db, ATTRACTIONS_COLLECTION, id), payload);
    return payload as unknown as TouristAttraction;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ATTRACTIONS_COLLECTION}/${id}`);
  }
}

export async function deleteAttractionOverride(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ATTRACTIONS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ATTRACTIONS_COLLECTION}/${id}`);
  }
}
