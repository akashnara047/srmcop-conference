import JSZip from 'jszip';
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  Timestamp,
  GeoPoint,
  DocumentReference,
  Bytes,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  getBlob,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  StorageReference,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  auth,
  db,
  storage,
  testConnection,
  handleFirestoreError,
  OperationType,
} from './firebase';

export const AUTHORIZED_ADMIN_EMAILS = [
  'org.secy.cp@srmist.edu.in',
  'dean.pharmacy.ktr@srmist.edu.in',
  'akashnara047@gmail.com',
  'narayanj@srmist.edu.in',
];

export const BACKUP_PROGRESS_STAGES = [
  'Connecting to Firebase',
  'Collecting registration records',
  'Collecting abstract records',
  'Collecting payment and evaluation records',
  'Collecting presentation allocation records',
  'Downloading supporting documents',
  'Generating ZIP archive',
  'Downloading backup',
] as const;

export type BackupStageLabel = (typeof BACKUP_PROGRESS_STAGES)[number];

export interface BackupProgressUpdate {
  stageIndex: number; // 0..7
  stageLabel: BackupStageLabel;
  percent: number; // 0..100 (100 ONLY on final completion)
  detail?: string;
}

export interface BackupErrorEntry {
  stage: string;
  source: 'firestore' | 'storage' | 'inline_attachment' | 'archive';
  targetId?: string;
  path?: string;
  message: string;
}

export interface BackupStorageFileEntry {
  archivePath: string;
  sourceType: 'firebase_storage' | 'firestore_inline_data' | 'referenced_url';
  category: 'payment_proof' | 'abstract_document' | 'supporting_document' | 'other_storage';
  originalFileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  registrationId?: string | null;
  abstractId?: string | null;
  docId?: string | null;
  note?: string;
}

export interface BackupRecordCounts {
  registrations: number;
  abstracts: number;
  payments: number;
  evaluations: number;
  presentationAllocations: number;
  administrativeDocs: number;
  otherDocs: number;
}

export interface BackupManifest {
  conference: string;
  conferenceFullTitle: string;
  backupVersion: string;
  appVersion: string;
  createdAt: string;
  createdBy: string;
  status: 'complete' | 'incomplete';
  firebaseProjectId: string;
  firestoreDatabaseId: string;
  backupMethod: string;
  storageListingNote?: string;
  backupScope: {
    includedFirestoreFiles: string[];
    collections: Record<string, number>;
    derivedDatasets: {
      payments: number;
      evaluations: number;
      presentationAllocations: number;
    };
    storageFiles: {
      totalExtractedFiles: number;
      paymentProofFiles: number;
      supportingDocumentFiles: number;
      firebaseStorageFiles: number;
      totalBytes: number;
    };
  };
  authAccountsNote: string;
  restoreNote: string;
  errors: BackupErrorEntry[];
}

export interface DatabaseBackupLogRecord {
  id: string;
  createdAt: string;
  filename: string;
  initiatedBy: string;
  status: 'complete' | 'incomplete';
  errorCount: number;
  storageFilesCount: number;
  totalArchiveBytes: number;
  recordCounts: BackupRecordCounts;
  storageSummary?: {
    totalExtractedFiles: number;
    paymentProofFiles: number;
    supportingDocumentFiles: number;
    firebaseStorageFiles: number;
    totalBytes: number;
  };
  errors?: BackupErrorEntry[];
}

export interface BackupExecutionResult {
  backupId: string;
  filename: string;
  blob: Blob;
  totalArchiveBytes: number;
  manifest: BackupManifest;
  recordCounts: BackupRecordCounts;
  storageSummary: BackupManifest['backupScope']['storageFiles'];
  historySaved: boolean;
  historySaveWarning?: string;
}

export interface SerializedFirestoreDoc {
  _docId: string;
  _collection: string;
  _path: string;
  data: Record<string, unknown>;
}

const CREDENTIAL_FIELD_KEYS = new Set([
  'password',
  'passwordHash',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'privateKey',
]);

/**
 * Checks if the given Firebase User is an authorised conference administrator
 * via either exact allowlisted email OR an existing /admins/{uid} document.
 */
export async function isAuthorizedAdminUser(user: User | null): Promise<boolean> {
  if (!user) return false;
  const email = (user.email || '').trim().toLowerCase();
  if (email && AUTHORIZED_ADMIN_EMAILS.some((allowed) => allowed.toLowerCase() === email)) {
    return true;
  }
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch {
    return false;
  }
}

/**
 * Runtime authorization gate invoked at the start of every backup operation.
 */
export async function verifyBackupAuthorization(): Promise<User> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required. Please sign in as the Organising Secretary.');
  }
  const authorized = await isAuthorizedAdminUser(currentUser);
  if (!authorized) {
    throw new Error(
      'Unauthorized access. Only authorised Organising Secretary accounts may create database backups.'
    );
  }
  return currentUser;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Lossless recursive serializer preserving Firestore Timestamps, DocumentReferences,
 * GeoPoints, Bytes, Dates, nulls, booleans, arrays, and nested maps.
 */
export function serializeFirestoreValue(val: unknown): unknown {
  if (val === null || val === undefined) {
    return val === undefined ? null : null;
  }
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return val;
  }
  if (val instanceof Date) {
    return {
      __type: 'date',
      iso: val.toISOString(),
    };
  }
  if (
    val instanceof Timestamp ||
    (typeof val === 'object' &&
      val !== null &&
      typeof (val as Timestamp).toDate === 'function' &&
      'seconds' in val &&
      'nanoseconds' in val)
  ) {
    const ts = val as Timestamp;
    return {
      __type: 'firestore_timestamp',
      iso: ts.toDate().toISOString(),
      seconds: ts.seconds,
      nanoseconds: ts.nanoseconds,
    };
  }
  if (
    val instanceof GeoPoint ||
    (typeof val === 'object' &&
      val !== null &&
      'latitude' in val &&
      'longitude' in val &&
      typeof (val as GeoPoint).latitude === 'number' &&
      typeof (val as GeoPoint).longitude === 'number' &&
      Object.keys(val).length <= 3)
  ) {
    const gp = val as GeoPoint;
    return {
      __type: 'firestore_geopoint',
      latitude: gp.latitude,
      longitude: gp.longitude,
    };
  }
  if (
    val instanceof DocumentReference ||
    (typeof val === 'object' &&
      val !== null &&
      'path' in val &&
      'firestore' in val &&
      typeof (val as DocumentReference).path === 'string')
  ) {
    return {
      __type: 'firestore_reference',
      path: (val as DocumentReference).path,
    };
  }
  if (
    val instanceof Bytes ||
    (typeof val === 'object' &&
      val !== null &&
      typeof (val as Bytes).toUint8Array === 'function')
  ) {
    return {
      __type: 'firestore_bytes',
      base64: uint8ArrayToBase64((val as Bytes).toUint8Array()),
    };
  }
  if (val instanceof Uint8Array) {
    return {
      __type: 'uint8array',
      base64: uint8ArrayToBase64(val),
    };
  }
  if (Array.isArray(val)) {
    return val.map((item) => serializeFirestoreValue(item));
  }
  if (typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = serializeFirestoreValue(v);
      }
    }
    return out;
  }
  return String(val);
}

function sanitizeAdminDocData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (CREDENTIAL_FIELD_KEYS.has(key)) continue;
    sanitized[key] = serializeFirestoreValue(value);
  }
  return sanitized;
}

/**
 * Fetches all documents in a Firestore collection using deterministic documentId pagination
 * (chunk size 500) to avoid single-query memory/RPC bottlenecks as collections scale.
 */
async function fetchCollectionPaginated(
  collectionName: string,
  sanitizeCredentials = false
): Promise<{ docs: SerializedFirestoreDoc[]; rawDocs: Array<{ id: string; raw: DocumentData }> }> {
  const pageSize = 500;
  const serializedDocs: SerializedFirestoreDoc[] = [];
  const rawDocs: Array<{ id: string; raw: DocumentData }> = [];
  let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

  while (true) {
    const q: Query<DocumentData> = lastDoc
      ? query(
          collection(db, collectionName),
          orderBy(documentId()),
          startAfter(lastDoc),
          limit(pageSize)
        )
      : query(collection(db, collectionName), orderBy(documentId()), limit(pageSize));

    const snap: QuerySnapshot<DocumentData> = await getDocs(q);
    if (snap.empty) break;

    for (const d of snap.docs) {
      const raw = d.data();
      rawDocs.push({ id: d.id, raw });
      serializedDocs.push({
        _docId: d.id,
        _collection: collectionName,
        _path: d.ref.path,
        data: sanitizeCredentials
          ? sanitizeAdminDocData(raw)
          : (serializeFirestoreValue(raw) as Record<string, unknown>),
      });
    }

    if (snap.docs.length < pageSize) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  return { docs: serializedDocs, rawDocs };
}

function sanitizeFileName(name: string, fallback: string): string {
  const cleaned = (name || fallback)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

function getExtensionFromMime(mimeType: string): string {
  const normalized = (mimeType || '').toLowerCase().split(';')[0].trim();
  const map: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
  };
  return map[normalized] || '';
}

function decodeDataUrlToBytes(
  dataUrl: string
): { bytes: Uint8Array; mimeType: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (dataUrl.includes('...[secured]')) return null;

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;

  const mimeType = match[1].trim();
  const base64Body = match[2].replace(/\s+/g, '');
  const binaryStr = atob(base64Body);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return { bytes, mimeType };
}

async function listStorageItemsRecursive(
  folderRef: StorageReference,
  visited = new Set<string>()
): Promise<StorageReference[]> {
  if (visited.has(folderRef.fullPath)) return [];
  visited.add(folderRef.fullPath);

  const res = await listAll(folderRef);
  let items: StorageReference[] = [...res.items];
  for (const prefixRef of res.prefixes) {
    const nested = await listStorageItemsRecursive(prefixRef, visited);
    items = items.concat(nested);
  }
  return items;
}

async function downloadStorageItemBytes(
  itemRef: StorageReference
): Promise<{ bytes: Uint8Array; mimeType: string; originalName: string }> {
  let mimeType = 'application/octet-stream';
  try {
    const meta = await getMetadata(itemRef);
    if (meta.contentType) mimeType = meta.contentType;
  } catch {
    // Metadata optional if object read succeeds
  }

  try {
    const blob = await getBlob(itemRef);
    const buf = await blob.arrayBuffer();
    if (blob.type) mimeType = blob.type;
    return {
      bytes: new Uint8Array(buf),
      mimeType,
      originalName: itemRef.name,
    };
  } catch (blobErr) {
    // Fallback to signed download URL fetch
    const url = await getDownloadURL(itemRef);
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(
        `HTTP ${resp.status} while downloading ${itemRef.fullPath} (getBlob: ${
          blobErr instanceof Error ? blobErr.message : String(blobErr)
        })`
      );
    }
    const contentType = resp.headers.get('content-type');
    if (contentType) mimeType = contentType.split(';')[0].trim();
    const buf = await resp.arrayBuffer();
    return {
      bytes: new Uint8Array(buf),
      mimeType,
      originalName: itemRef.name,
    };
  }
}

async function downloadByUrlOrStoragePath(
  urlOrPath: string
): Promise<{ bytes: Uint8Array; mimeType: string; originalName: string; resolvedStoragePath: string }> {
  if (urlOrPath.startsWith('gs://') || urlOrPath.includes('firebasestorage.googleapis.com')) {
    const itemRef = ref(storage, urlOrPath);
    const downloaded = await downloadStorageItemBytes(itemRef);
    return {
      ...downloaded,
      resolvedStoragePath: itemRef.fullPath || urlOrPath,
    };
  }

  const resp = await fetch(urlOrPath);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} fetching referenced document URL`);
  }
  const mimeType = (resp.headers.get('content-type') || 'application/octet-stream')
    .split(';')[0]
    .trim();
  const buf = await resp.arrayBuffer();
  const rawName = decodeURIComponent(urlOrPath.split('?')[0].split('/').pop() || 'document');
  return {
    bytes: new Uint8Array(buf),
    mimeType,
    originalName: rawName,
    resolvedStoragePath: urlOrPath,
  };
}

export function formatBackupFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const sec = pad(date.getSeconds());
  return `SRMCON_2027_Full_Backup_${yyyy}-${mm}-${dd}_${hh}-${min}-${sec}.zip`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
}

/**
 * Reads lightweight backup history metadata from `databaseBackups`.
 * Returns empty array if none created yet.
 */
export async function fetchBackupHistory(): Promise<DatabaseBackupLogRecord[]> {
  await verifyBackupAuthorization();
  try {
    const q = query(
      collection(db, 'databaseBackups'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      ...(d.data() as DatabaseBackupLogRecord),
      id: d.id,
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'databaseBackups');
  }
}

/**
 * Reads quick overview stats for the Database Backup dashboard cards.
 */
export async function fetchBackupOverviewStats(): Promise<{
  registrationsCount: number;
  abstractsCount: number;
  paymentsCount: number;
  uploadedFilesCount: number;
  history: DatabaseBackupLogRecord[];
}> {
  await verifyBackupAuthorization();

  const [regSnap, absSnap, history] = await Promise.all([
    getDocs(collection(db, 'registrations')),
    getDocs(collection(db, 'abstractSubmissions')),
    fetchBackupHistory(),
  ]);

  let uploadedFilesCount = 0;
  let paymentsCount = 0;

  regSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.transactionReference || data.paymentStatus || data.amount || data.paymentAmount) {
      paymentsCount += 1;
    }
    const proof = data.paymentProofData || data.paymentProofUrl || data.paymentReceiptData || data.paymentReceiptUrl;
    if (typeof proof === 'string' && proof.length > 20 && !proof.includes('...[secured]')) {
      uploadedFilesCount += 1;
    }
  });

  absSnap.docs.forEach((d) => {
    const data = d.data();
    if (
      (typeof data.supportingDocumentUrl === 'string' && data.supportingDocumentUrl.length > 0) ||
      (typeof data.supportingDocumentData === 'string' &&
        data.supportingDocumentData.length > 20 &&
        !data.supportingDocumentData.includes('...[secured]'))
    ) {
      uploadedFilesCount += 1;
    }
  });

  return {
    registrationsCount: regSnap.size,
    abstractsCount: absSnap.size,
    paymentsCount,
    uploadedFilesCount,
    history,
  };
}

function buildReadmeText(
  manifest: BackupManifest,
  filename: string,
  recordCounts: BackupRecordCounts,
  archiveBytes: number
): string {
  const lines: string[] = [
    '================================================================================',
    'SRMCON 2027 - CONFERENCE DATABASE BACKUP ARCHIVE',
    'International Conference on AI-Powered Innovations in Drug Discovery & Development',
    'Organised by SRM College of Pharmacy, SRMIST (15-16 February 2027)',
    '================================================================================',
    '',
    `Archive Filename   : ${filename}`,
    `Created At (UTC)   : ${manifest.createdAt}`,
    `Initiated By       : ${manifest.createdBy}`,
    `Backup Status      : ${manifest.status.toUpperCase()}`,
    `Archive Size       : ${formatBytes(archiveBytes)} (${archiveBytes} bytes)`,
    `Firebase Project   : ${manifest.firebaseProjectId}`,
    `Firestore Database : ${manifest.firestoreDatabaseId}`,
    `Backup Method      : ${manifest.backupMethod}`,
    '',
    '--------------------------------------------------------------------------------',
    '1. RECORD & FILE COUNTS',
    '--------------------------------------------------------------------------------',
    `- Registrations             : ${recordCounts.registrations}`,
    `- Abstract Submissions      : ${recordCounts.abstracts}`,
    `- Payment Records           : ${recordCounts.payments}`,
    `- Abstract Evaluations      : ${recordCounts.evaluations}`,
    `- Presentation Allocations  : ${recordCounts.presentationAllocations}`,
    `- Administrative Documents  : ${recordCounts.administrativeDocs}`,
    `- Other Collections Docs    : ${recordCounts.otherDocs}`,
    `- Uploaded Files Extracted  : ${manifest.backupScope.storageFiles.totalExtractedFiles} (${formatBytes(manifest.backupScope.storageFiles.totalBytes)})`,
    `  * Payment Proofs          : ${manifest.backupScope.storageFiles.paymentProofFiles}`,
    `  * Abstract Supporting Docs: ${manifest.backupScope.storageFiles.supportingDocumentFiles}`,
    `  * Firebase Storage Objects: ${manifest.backupScope.storageFiles.firebaseStorageFiles}`,
    '',
    '--------------------------------------------------------------------------------',
    '2. FOLDER STRUCTURE INSIDE THIS ARCHIVE',
    '--------------------------------------------------------------------------------',
    'SRMCON_2027_Backup/',
    '  ├── manifest.json            Complete machine-readable backup metadata & errors',
    '  ├── README.txt               This documentation file',
    '  ├── firestore/               Lossless JSON exports preserving doc IDs & types',
    '  │   ├── registrations.json',
    '  │   ├── abstracts.json',
    '  │   ├── payments.json',
    '  │   ├── evaluations.json',
    '  │   ├── presentation_allocations.json',
    '  │   ├── administrative_data.json',
    '  │   └── other_collections.json (included if non-empty)',
    '  └── storage/                 Extracted binary documents & storage file index',
    '      ├── files_index.json',
    '      ├── payment_proofs/',
    '      └── supporting_documents/',
    '',
    '--------------------------------------------------------------------------------',
    '3. AUTHENTICATION & SECURITY SCOPE',
    '--------------------------------------------------------------------------------',
    '- Firebase Authentication user passwords and private account credentials are NOT exported.',
    '- No Firebase API keys, private secrets, or OAuth tokens are stored in this archive.',
    '- Non-standard Firestore types (Timestamp, GeoPoint, DocumentReference, Bytes) are',
    '  serialized with explicit __type markers so values remain unambiguous and lossless.',
    '',
    '--------------------------------------------------------------------------------',
    '4. MANUAL STORAGE IN GOOGLE DRIVE (RECOMMENDED)',
    '--------------------------------------------------------------------------------',
    '1. Open https://drive.google.com using the official conference Google account.',
    '2. Create or open folder: "SRMCON 2027 – Database Backups".',
    '3. Upload this downloaded ZIP file without renaming or modifying its contents.',
    '4. Retain dated snapshots for conference continuity and disaster recovery.',
    '',
    '--------------------------------------------------------------------------------',
    '5. IMPORTANT RESTORE WARNING',
    '--------------------------------------------------------------------------------',
    manifest.restoreNote,
  ];

  if (manifest.errors.length > 0) {
    lines.push(
      '',
      '--------------------------------------------------------------------------------',
      `6. BACKUP WARNINGS / ERRORS (${manifest.errors.length})`,
      '--------------------------------------------------------------------------------',
      'This backup is marked INCOMPLETE because one or more items could not be retrieved:'
    );
    manifest.errors.forEach((err, idx) => {
      lines.push(
        `${idx + 1}. [${err.stage}] (${err.source}) ${err.path || err.targetId || ''}: ${err.message}`
      );
    });
  }

  return lines.join('\n');
}

/**
 * Executes a full client-side Firestore + Storage/Attachments backup into a structured ZIP file
 * compatible with Firebase Spark plan, triggers automatic browser download, and logs lightweight
 * audit metadata to `databaseBackups`.
 */
export async function executeFullDatabaseBackup(
  onProgress: (update: BackupProgressUpdate) => void
): Promise<BackupExecutionResult> {
  const errors: BackupErrorEntry[] = [];
  const createdAt = new Date();
  const createdAtIso = createdAt.toISOString();
  const filename = formatBackupFilename(createdAt);
  const backupId = `BACKUP-${createdAt.getTime()}`;

  // STAGE 1: Connecting to Firebase
  onProgress({
    stageIndex: 0,
    stageLabel: BACKUP_PROGRESS_STAGES[0],
    percent: 8,
    detail: 'Verifying Organising Secretary authorisation and Firebase connectivity...',
  });

  const adminUser = await verifyBackupAuthorization();
  const adminEmail = adminUser.email || 'org.secy.cp@srmist.edu.in';
  const connected = await testConnection();
  if (!connected) {
    throw new Error(
      'Unable to reach Firebase Firestore. Please check your internet connection and try again.'
    );
  }

  // STAGE 2: Collecting registration records
  onProgress({
    stageIndex: 1,
    stageLabel: BACKUP_PROGRESS_STAGES[1],
    percent: 22,
    detail: 'Reading conference registration documents...',
  });

  let registrationsRes: { docs: SerializedFirestoreDoc[]; rawDocs: Array<{ id: string; raw: DocumentData }> } = {
    docs: [],
    rawDocs: [],
  };
  try {
    registrationsRes = await fetchCollectionPaginated('registrations');
  } catch (err) {
    errors.push({
      stage: BACKUP_PROGRESS_STAGES[1],
      source: 'firestore',
      path: 'registrations',
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // STAGE 3: Collecting abstract records
  onProgress({
    stageIndex: 2,
    stageLabel: BACKUP_PROGRESS_STAGES[2],
    percent: 36,
    detail: 'Reading scientific abstract submissions...',
  });

  let abstractsRes: { docs: SerializedFirestoreDoc[]; rawDocs: Array<{ id: string; raw: DocumentData }> } = {
    docs: [],
    rawDocs: [],
  };
  try {
    abstractsRes = await fetchCollectionPaginated('abstractSubmissions');
  } catch (err) {
    errors.push({
      stage: BACKUP_PROGRESS_STAGES[2],
      source: 'firestore',
      path: 'abstractSubmissions',
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // STAGE 4: Collecting payment and evaluation records
  onProgress({
    stageIndex: 3,
    stageLabel: BACKUP_PROGRESS_STAGES[3],
    percent: 50,
    detail: 'Structuring payment verification & abstract evaluation datasets...',
  });

  const paymentsRecords = registrationsRes.rawDocs.map(({ id, raw }) => ({
    registrationDocId: id,
    registrationId: raw.registrationId ?? null,
    fullName: raw.fullName ?? null,
    email: raw.email ?? null,
    mobile: raw.mobile ?? null,
    category: raw.category ?? null,
    institutionCategory: raw.institutionCategory ?? null,
    recordType: raw.recordType ?? null,
    paymentMode: raw.paymentMode ?? null,
    transactionReference: raw.transactionReference ?? null,
    amount: raw.amount ?? null,
    paymentAmount: raw.paymentAmount ?? null,
    currency: raw.currency ?? null,
    paymentStatus: raw.paymentStatus ?? null,
    registrationStatus: raw.registrationStatus ?? null,
    paymentProofName: raw.paymentProofName ?? null,
    paymentProofUrl: raw.paymentProofUrl ?? null,
    paymentReceiptName: raw.paymentReceiptName ?? null,
    paymentReceiptUrl: raw.paymentReceiptUrl ?? null,
    hasInlinePaymentProof: Boolean(raw.paymentProofData || raw.paymentReceiptData),
    verifiedBy: raw.verifiedBy ?? null,
    verifiedAt: serializeFirestoreValue(raw.verifiedAt ?? null),
    adminRemarks: raw.adminRemarks ?? null,
    createdAt: serializeFirestoreValue(raw.createdAt ?? null),
    updatedAt: serializeFirestoreValue(raw.updatedAt ?? null),
  }));

  const evaluationRecords = abstractsRes.rawDocs.map(({ id, raw }) => ({
    abstractId: id,
    registrationId: raw.registrationId ?? null,
    title: raw.title ?? null,
    trackId: raw.trackId ?? null,
    recordType: raw.recordType ?? null,
    status: raw.status ?? null,
    reviewNotes: raw.reviewNotes ?? null,
    reviewedBy: raw.reviewedBy ?? null,
    reviewedAt: serializeFirestoreValue(raw.reviewedAt ?? null),
    createdAt: serializeFirestoreValue(raw.createdAt ?? null),
    updatedAt: serializeFirestoreValue(raw.updatedAt ?? null),
  }));

  // STAGE 5: Collecting presentation allocation records & administrative/other collections
  onProgress({
    stageIndex: 4,
    stageLabel: BACKUP_PROGRESS_STAGES[4],
    percent: 64,
    detail: 'Collecting presentation allocations and administrative records...',
  });

  const regByOfficialId = new Map<string, { id: string; raw: DocumentData }>();
  for (const reg of registrationsRes.rawDocs) {
    if (typeof reg.raw.registrationId === 'string' && reg.raw.registrationId.trim()) {
      regByOfficialId.set(reg.raw.registrationId.trim().toUpperCase(), reg);
    }
    regByOfficialId.set(reg.id.trim().toUpperCase(), reg);
  }

  const presentationAllocations = abstractsRes.rawDocs.map(({ id, raw }) => {
    const regKey = typeof raw.registrationId === 'string' ? raw.registrationId.trim().toUpperCase() : '';
    const linkedReg = regKey ? regByOfficialId.get(regKey) : undefined;
    const presentingAuthor = (raw.presentingAuthor as Record<string, unknown> | undefined) || {};

    return {
      abstractId: id,
      registrationId: raw.registrationId ?? null,
      registrationDocId: linkedReg?.id ?? null,
      presentingAuthorName:
        presentingAuthor.fullName || presentingAuthor.name || linkedReg?.raw.fullName || null,
      presentingAuthorEmail:
        presentingAuthor.email || linkedReg?.raw.email || null,
      title: raw.title ?? null,
      trackId: raw.trackId ?? null,
      abstractStatus: raw.status ?? null,
      presentationPreference: raw.presentationPreference ?? null,
      allottedPresentationFormat: raw.allottedPresentationFormat ?? null,
      allottedBy: raw.allottedBy ?? null,
      allottedAt: serializeFirestoreValue(raw.allottedAt ?? null),
      registrationPresentationPlan: linkedReg?.raw.presentationPlan ?? null,
    };
  });

  // Fetch administrative collections
  const adminCollectionNames = ['systemCounters', 'adminAuditLogs', 'admins', 'databaseBackups'] as const;
  const adminCollectionsData: Record<string, SerializedFirestoreDoc[]> = {};
  let administrativeDocsTotal = 0;

  for (const colName of adminCollectionNames) {
    try {
      const res = await fetchCollectionPaginated(colName, colName === 'admins');
      if (res.docs.length > 0) {
        adminCollectionsData[colName] = res.docs;
        administrativeDocsTotal += res.docs.length;
      }
    } catch (err) {
      errors.push({
        stage: BACKUP_PROGRESS_STAGES[4],
        source: 'firestore',
        path: colName,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Fetch secondary/other conference collections
  const otherCollectionNames = [
    'paymentTransactions',
    'contactEnquiries',
    'emailLogs',
    'accommodationProperties',
    'touristAttractions',
  ] as const;
  const otherCollectionsData: Record<string, SerializedFirestoreDoc[]> = {};
  let otherDocsTotal = 0;

  for (const colName of otherCollectionNames) {
    try {
      const res = await fetchCollectionPaginated(colName);
      if (res.docs.length > 0) {
        otherCollectionsData[colName] = res.docs;
        otherDocsTotal += res.docs.length;
      }
    } catch (err) {
      errors.push({
        stage: BACKUP_PROGRESS_STAGES[4],
        source: 'firestore',
        path: colName,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // STAGE 6: Downloading supporting documents & payment proofs
  onProgress({
    stageIndex: 5,
    stageLabel: BACKUP_PROGRESS_STAGES[5],
    percent: 78,
    detail: 'Retrieving uploaded payment proofs and supporting documents...',
  });

  const zip = new JSZip();
  const rootFolder = zip.folder('SRMCON_2027_Backup')!;
  const firestoreFolder = rootFolder.folder('firestore')!;
  const storageFolder = rootFolder.folder('storage')!;

  const storageEntries: BackupStorageFileEntry[] = [];
  const usedArchivePaths = new Set<string>();
  const downloadedStoragePaths = new Set<string>();
  let totalStorageBytes = 0;
  let paymentProofFilesCount = 0;
  let supportingDocFilesCount = 0;
  let firebaseStorageFilesCount = 0;
  let storageListingNote: string | undefined;

  const reserveUniqueArchivePath = (desiredPath: string): string => {
    if (!usedArchivePaths.has(desiredPath)) {
      usedArchivePaths.add(desiredPath);
      return desiredPath;
    }
    const dotIdx = desiredPath.lastIndexOf('.');
    const base = dotIdx > 0 ? desiredPath.slice(0, dotIdx) : desiredPath;
    const ext = dotIdx > 0 ? desiredPath.slice(dotIdx) : '';
    let counter = 2;
    while (usedArchivePaths.has(`${base}_${counter}${ext}`)) {
      counter += 1;
    }
    const unique = `${base}_${counter}${ext}`;
    usedArchivePaths.add(unique);
    return unique;
  };

  // 6A. Extract inline & URL payment proofs from registrations
  for (const { id: regDocId, raw } of registrationsRes.rawDocs) {
    const regKey = sanitizeFileName(String(raw.registrationId || regDocId), regDocId);

    const proofDataFields: Array<{ dataKey: string; nameKey: string; urlKey: string; label: string }> = [
      {
        dataKey: 'paymentProofData',
        nameKey: 'paymentProofName',
        urlKey: 'paymentProofUrl',
        label: 'payment_proof',
      },
      {
        dataKey: 'paymentReceiptData',
        nameKey: 'paymentReceiptName',
        urlKey: 'paymentReceiptUrl',
        label: 'payment_receipt',
      },
    ];

    for (const field of proofDataFields) {
      const inlineVal = raw[field.dataKey];
      const rawUrl = raw[field.urlKey];
      const rawName = typeof raw[field.nameKey] === 'string' ? raw[field.nameKey] : '';

      if (typeof inlineVal === 'string' && inlineVal.length > 0) {
        if (inlineVal.includes('...[secured]')) {
          storageEntries.push({
            archivePath: '',
            sourceType: 'firestore_inline_data',
            category: 'payment_proof',
            originalFileName: rawName || `${regKey}_${field.label}`,
            storagePath: `registrations/${regDocId}/${field.dataKey}`,
            mimeType: 'unknown/redacted-placeholder',
            sizeBytes: 0,
            registrationId: raw.registrationId ?? null,
            docId: regDocId,
            note: 'Legacy masked placeholder (...[secured]); no binary attachment stored on record.',
          });
        } else {
          try {
            const decoded = decodeDataUrlToBytes(inlineVal);
            if (!decoded) {
              throw new Error(`Invalid base64 data URL in registrations/${regDocId}.${field.dataKey}`);
            }
            const ext = getExtensionFromMime(decoded.mimeType);
            const baseName = sanitizeFileName(rawName, `${regKey}_${field.label}${ext}`);
            const fileNameWithExt =
              ext && !baseName.toLowerCase().includes('.') ? `${baseName}${ext}` : baseName;
            const archiveRelPath = reserveUniqueArchivePath(
              `storage/payment_proofs/${regKey}_${fileNameWithExt}`
            );
            rootFolder.file(archiveRelPath, decoded.bytes);
            totalStorageBytes += decoded.bytes.byteLength;
            paymentProofFilesCount += 1;
            storageEntries.push({
              archivePath: archiveRelPath,
              sourceType: 'firestore_inline_data',
              category: 'payment_proof',
              originalFileName: rawName || fileNameWithExt,
              storagePath: `registrations/${regDocId}/${field.dataKey}`,
              mimeType: decoded.mimeType,
              sizeBytes: decoded.bytes.byteLength,
              registrationId: raw.registrationId ?? null,
              docId: regDocId,
            });
          } catch (err) {
            errors.push({
              stage: BACKUP_PROGRESS_STAGES[5],
              source: 'inline_attachment',
              targetId: regDocId,
              path: `registrations/${regDocId}/${field.dataKey}`,
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }
      } else if (typeof rawUrl === 'string' && rawUrl.trim().length > 0 && !rawUrl.includes('...[secured]')) {
        try {
          const downloaded = await downloadByUrlOrStoragePath(rawUrl.trim());
          downloadedStoragePaths.add(downloaded.resolvedStoragePath);
          const ext = getExtensionFromMime(downloaded.mimeType);
          const baseName = sanitizeFileName(rawName || downloaded.originalName, `${regKey}_${field.label}${ext}`);
          const archiveRelPath = reserveUniqueArchivePath(
            `storage/payment_proofs/${regKey}_${baseName}`
          );
          rootFolder.file(archiveRelPath, downloaded.bytes);
          totalStorageBytes += downloaded.bytes.byteLength;
          paymentProofFilesCount += 1;
          firebaseStorageFilesCount += 1;
          storageEntries.push({
            archivePath: archiveRelPath,
            sourceType: 'referenced_url',
            category: 'payment_proof',
            originalFileName: rawName || downloaded.originalName,
            storagePath: downloaded.resolvedStoragePath,
            mimeType: downloaded.mimeType,
            sizeBytes: downloaded.bytes.byteLength,
            registrationId: raw.registrationId ?? null,
            docId: regDocId,
          });
        } catch (err) {
          errors.push({
            stage: BACKUP_PROGRESS_STAGES[5],
            source: 'storage',
            targetId: regDocId,
            path: rawUrl,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  // 6B. Extract URL & inline supporting documents from abstractSubmissions
  for (const { id: absId, raw } of abstractsRes.rawDocs) {
    const absKey = sanitizeFileName(absId, 'abstract');
    const docName =
      typeof raw.supportingDocumentName === 'string' ? raw.supportingDocumentName : '';
    const docUrl =
      typeof raw.supportingDocumentUrl === 'string' ? raw.supportingDocumentUrl.trim() : '';
    const docData =
      typeof raw.supportingDocumentData === 'string' ? raw.supportingDocumentData : '';

    if (docUrl && !docUrl.includes('...[secured]')) {
      try {
        const downloaded = await downloadByUrlOrStoragePath(docUrl);
        downloadedStoragePaths.add(downloaded.resolvedStoragePath);
        const ext = getExtensionFromMime(downloaded.mimeType);
        const baseName = sanitizeFileName(
          docName || downloaded.originalName,
          `${absKey}_supporting${ext}`
        );
        const archiveRelPath = reserveUniqueArchivePath(
          `storage/supporting_documents/${absKey}_${baseName}`
        );
        rootFolder.file(archiveRelPath, downloaded.bytes);
        totalStorageBytes += downloaded.bytes.byteLength;
        supportingDocFilesCount += 1;
        firebaseStorageFilesCount += 1;
        storageEntries.push({
          archivePath: archiveRelPath,
          sourceType: 'firebase_storage',
          category: 'supporting_document',
          originalFileName: docName || downloaded.originalName,
          storagePath: downloaded.resolvedStoragePath,
          mimeType: downloaded.mimeType,
          sizeBytes: downloaded.bytes.byteLength,
          registrationId: raw.registrationId ?? null,
          abstractId: absId,
          docId: absId,
        });
      } catch (err) {
        errors.push({
          stage: BACKUP_PROGRESS_STAGES[5],
          source: 'storage',
          targetId: absId,
          path: docUrl,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } else if (docData && !docData.includes('...[secured]')) {
      try {
        const decoded = decodeDataUrlToBytes(docData);
        if (!decoded) {
          throw new Error(`Invalid base64 data URL in abstractSubmissions/${absId}.supportingDocumentData`);
        }
        const ext = getExtensionFromMime(decoded.mimeType);
        const baseName = sanitizeFileName(docName, `${absKey}_supporting${ext}`);
        const fileNameWithExt =
          ext && !baseName.toLowerCase().includes('.') ? `${baseName}${ext}` : baseName;
        const archiveRelPath = reserveUniqueArchivePath(
          `storage/supporting_documents/${absKey}_${fileNameWithExt}`
        );
        rootFolder.file(archiveRelPath, decoded.bytes);
        totalStorageBytes += decoded.bytes.byteLength;
        supportingDocFilesCount += 1;
        storageEntries.push({
          archivePath: archiveRelPath,
          sourceType: 'firestore_inline_data',
          category: 'supporting_document',
          originalFileName: docName || fileNameWithExt,
          storagePath: `abstractSubmissions/${absId}/supportingDocumentData`,
          mimeType: decoded.mimeType,
          sizeBytes: decoded.bytes.byteLength,
          registrationId: raw.registrationId ?? null,
          abstractId: absId,
          docId: absId,
        });
      } catch (err) {
        errors.push({
          stage: BACKUP_PROGRESS_STAGES[5],
          source: 'inline_attachment',
          targetId: absId,
          path: `abstractSubmissions/${absId}/supportingDocumentData`,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // 6C. Crawl Firebase Storage prefixes ('abstract-documents' and root '') for any additional files
  const prefixesToCheck = ['abstract-documents', ''];
  const discoveredRefs: StorageReference[] = [];
  let listUnauthorizedOnly = false;

  for (const prefix of prefixesToCheck) {
    try {
      const items = await listStorageItemsRecursive(ref(storage, prefix));
      for (const item of items) {
        if (!discoveredRefs.some((existing) => existing.fullPath === item.fullPath)) {
          discoveredRefs.push(item);
        }
      }
    } catch (err: any) {
      const code = String(err?.code || '');
      const msg = err instanceof Error ? err.message : String(err);
      if (code === 'storage/unauthorized') {
        listUnauthorizedOnly = true;
      } else if (code !== 'storage/object-not-found') {
        errors.push({
          stage: BACKUP_PROGRESS_STAGES[5],
          source: 'storage',
          path: prefix || '/',
          message: `Failed listing Firebase Storage folder "${prefix || '/'}": ${msg}`,
        });
      }
    }
  }

  if (listUnauthorizedOnly) {
    storageListingNote =
      'Firebase Storage root listing is restricted by bucket rules; all document URLs referenced in Firestore records were verified and downloaded directly.';
  }

  for (const itemRef of discoveredRefs) {
    if (downloadedStoragePaths.has(itemRef.fullPath)) continue;
    try {
      const downloaded = await downloadStorageItemBytes(itemRef);
      downloadedStoragePaths.add(itemRef.fullPath);
      const isAbstractDoc = itemRef.fullPath.startsWith('abstract-documents/');
      const subFolder = isAbstractDoc ? 'abstract_documents' : 'other_storage';
      const safeRelPath = itemRef.fullPath
        .split('/')
        .map((seg) => sanitizeFileName(seg, 'file'))
        .join('/');
      const archiveRelPath = reserveUniqueArchivePath(`storage/${subFolder}/${safeRelPath}`);
      rootFolder.file(archiveRelPath, downloaded.bytes);
      totalStorageBytes += downloaded.bytes.byteLength;
      if (isAbstractDoc) supportingDocFilesCount += 1;
      firebaseStorageFilesCount += 1;
      storageEntries.push({
        archivePath: archiveRelPath,
        sourceType: 'firebase_storage',
        category: isAbstractDoc ? 'abstract_document' : 'other_storage',
        originalFileName: downloaded.originalName,
        storagePath: itemRef.fullPath,
        mimeType: downloaded.mimeType,
        sizeBytes: downloaded.bytes.byteLength,
      });
    } catch (err) {
      errors.push({
        stage: BACKUP_PROGRESS_STAGES[5],
        source: 'storage',
        path: itemRef.fullPath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (storageEntries.length > 0) {
    storageFolder.file(
      'files_index.json',
      JSON.stringify(
        {
          exportedAt: createdAtIso,
          totalFiles: storageEntries.length,
          totalBinaryBytes: totalStorageBytes,
          files: storageEntries,
        },
        null,
        2
      )
    );
  }

  // Write Firestore datasets cleanly (no empty/misleading placeholder files for non-existent collections)
  const includedFirestoreFiles: string[] = [];

  firestoreFolder.file(
    'registrations.json',
    JSON.stringify(
      {
        collection: 'registrations',
        exportedAt: createdAtIso,
        count: registrationsRes.docs.length,
        records: registrationsRes.docs,
      },
      null,
      2
    )
  );
  includedFirestoreFiles.push('firestore/registrations.json');

  firestoreFolder.file(
    'abstracts.json',
    JSON.stringify(
      {
        collection: 'abstractSubmissions',
        exportedAt: createdAtIso,
        count: abstractsRes.docs.length,
        records: abstractsRes.docs,
      },
      null,
      2
    )
  );
  includedFirestoreFiles.push('firestore/abstracts.json');

  firestoreFolder.file(
    'payments.json',
    JSON.stringify(
      {
        derivedFrom: 'registrations',
        exportedAt: createdAtIso,
        count: paymentsRecords.length,
        records: paymentsRecords,
      },
      null,
      2
    )
  );
  includedFirestoreFiles.push('firestore/payments.json');

  firestoreFolder.file(
    'evaluations.json',
    JSON.stringify(
      {
        derivedFrom: 'abstractSubmissions',
        exportedAt: createdAtIso,
        count: evaluationRecords.length,
        records: evaluationRecords,
      },
      null,
      2
    )
  );
  includedFirestoreFiles.push('firestore/evaluations.json');

  firestoreFolder.file(
    'presentation_allocations.json',
    JSON.stringify(
      {
        derivedFrom: ['abstractSubmissions', 'registrations'],
        exportedAt: createdAtIso,
        count: presentationAllocations.length,
        records: presentationAllocations,
      },
      null,
      2
    )
  );
  includedFirestoreFiles.push('firestore/presentation_allocations.json');

  if (administrativeDocsTotal > 0) {
    firestoreFolder.file(
      'administrative_data.json',
      JSON.stringify(
        {
          exportedAt: createdAtIso,
          note: 'Sensitive authentication credentials are excluded from admin metadata.',
          collections: adminCollectionsData,
        },
        null,
        2
      )
    );
    includedFirestoreFiles.push('firestore/administrative_data.json');
  }

  if (otherDocsTotal > 0) {
    firestoreFolder.file(
      'other_collections.json',
      JSON.stringify(
        {
          exportedAt: createdAtIso,
          collections: otherCollectionsData,
        },
        null,
        2
      )
    );
    includedFirestoreFiles.push('firestore/other_collections.json');
  }

  // STAGE 7: Generating ZIP archive
  onProgress({
    stageIndex: 6,
    stageLabel: BACKUP_PROGRESS_STAGES[6],
    percent: 90,
    detail: 'Compressing JSON datasets, uploaded files, manifest, and README...',
  });

  const recordCounts: BackupRecordCounts = {
    registrations: registrationsRes.docs.length,
    abstracts: abstractsRes.docs.length,
    payments: paymentsRecords.length,
    evaluations: evaluationRecords.length,
    presentationAllocations: presentationAllocations.length,
    administrativeDocs: administrativeDocsTotal,
    otherDocs: otherDocsTotal,
  };

  const storageSummary = {
    totalExtractedFiles: storageEntries.filter((f) => Boolean(f.archivePath)).length,
    paymentProofFiles: paymentProofFilesCount,
    supportingDocumentFiles: supportingDocFilesCount,
    firebaseStorageFiles: firebaseStorageFilesCount,
    totalBytes: totalStorageBytes,
  };

  const collectionsCounts: Record<string, number> = {
    registrations: registrationsRes.docs.length,
    abstractSubmissions: abstractsRes.docs.length,
  };
  for (const [k, docs] of Object.entries(adminCollectionsData)) {
    collectionsCounts[k] = docs.length;
  }
  for (const [k, docs] of Object.entries(otherCollectionsData)) {
    collectionsCounts[k] = docs.length;
  }

  const manifest: BackupManifest = {
    conference: 'SRMCON 2027',
    conferenceFullTitle:
      'International Conference on AI-Powered Innovations in Drug Discovery and Development',
    backupVersion: '1.0',
    appVersion: '1.0.0',
    createdAt: createdAtIso,
    createdBy: adminEmail,
    status: errors.length === 0 ? 'complete' : 'incomplete',
    firebaseProjectId: firebaseConfig.projectId,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    backupMethod: 'Manual Client-Side Export (Firebase Spark Compatible)',
    ...(storageListingNote ? { storageListingNote } : {}),
    backupScope: {
      includedFirestoreFiles,
      collections: collectionsCounts,
      derivedDatasets: {
        payments: paymentsRecords.length,
        evaluations: evaluationRecords.length,
        presentationAllocations: presentationAllocations.length,
      },
      storageFiles: storageSummary,
    },
    authAccountsNote:
      'Firebase Authentication user passwords and private credentials are not exported.',
    restoreNote:
      'Restoring a database backup is a separate administrative operation. Do not manually import backup files into the live database.',
    errors,
  };

  rootFolder.file('manifest.json', JSON.stringify(manifest, null, 2));
  // Temporary README pass to calculate final archive size cleanly after generation
  rootFolder.file('README.txt', buildReadmeText(manifest, filename, recordCounts, 0));

  const initialBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Update README with accurate byte size and rebuild final ZIP blob
  rootFolder.file(
    'README.txt',
    buildReadmeText(manifest, filename, recordCounts, initialBlob.size)
  );
  const finalBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // STAGE 8: Downloading backup
  onProgress({
    stageIndex: 7,
    stageLabel: BACKUP_PROGRESS_STAGES[7],
    percent: 96,
    detail: `Initiating browser download for ${filename}...`,
  });

  triggerBlobDownload(finalBlob, filename);

  // Persist lightweight metadata history in Firestore (NEVER store binary ZIP in Firestore)
  let historySaved = false;
  let historySaveWarning: string | undefined;

  try {
    const historyPayload: DatabaseBackupLogRecord = {
      id: backupId,
      createdAt: createdAtIso,
      filename,
      initiatedBy: adminEmail,
      status: manifest.status,
      errorCount: errors.length,
      storageFilesCount: storageSummary.totalExtractedFiles,
      totalArchiveBytes: finalBlob.size,
      recordCounts,
      storageSummary,
      ...(errors.length > 0 ? { errors: errors.slice(0, 50) } : {}),
    };
    await setDoc(doc(db, 'databaseBackups', backupId), historyPayload);
    historySaved = true;
  } catch (err) {
    historySaveWarning =
      err instanceof Error
        ? `Backup ZIP downloaded, but backup history log could not be saved: ${err.message}`
        : 'Backup ZIP downloaded, but backup history log could not be saved.';
    console.warn('Could not save databaseBackups history record:', err);
  }

  onProgress({
    stageIndex: 7,
    stageLabel: BACKUP_PROGRESS_STAGES[7],
    percent: 100,
    detail:
      manifest.status === 'complete'
        ? 'Full database backup created successfully.'
        : 'Backup finished with warnings (incomplete). Review affected items below.',
  });

  return {
    backupId,
    filename,
    blob: finalBlob,
    totalArchiveBytes: finalBlob.size,
    manifest,
    recordCounts,
    storageSummary,
    historySaved,
    historySaveWarning,
  };
}
