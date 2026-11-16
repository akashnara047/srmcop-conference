import React, { useEffect, useState } from 'react';
import {
  Building2,
  Camera,
  Check,
  Edit3,
  Eye,
  EyeOff,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  AccommodationCategory,
  AccommodationProperty,
  TouristAttraction,
  VERIFIED_ACCOMMODATION_PROPERTIES,
  VERIFIED_PLACES_TO_VISIT,
} from '../data/accommodationData';
import {
  deleteAccommodationOverride,
  deleteAttractionOverride,
  fetchAccommodationDirectory,
  fetchAttractionsDirectory,
  sanitizeSlugId,
  saveAccommodationRecord,
  saveAttractionRecord,
} from '../lib/hospitalityService';

interface AdminHospitalityManagerProps {
  adminEmail: string;
  onStatusMessage: (msg: string) => void;
}

const DEFAULT_ACCOMMODATION_IDS = new Set(
  VERIFIED_ACCOMMODATION_PROPERTIES.map((item) => item.id)
);
const DEFAULT_ATTRACTION_IDS = new Set(
  VERIFIED_PLACES_TO_VISIT.map((item) => item.id)
);

const EMPTY_STAY_FORM: AccommodationProperty = {
  id: '',
  name: '',
  category: 'Hotel',
  locality: 'Potheri',
  address: '',
  phone: '',
  secondaryPhone: '',
  phoneTypeNote: '',
  distanceKm: 1.0,
  driveMinutes: 5,
  mapsQuery: '',
  isActive: true,
};

const EMPTY_PLACE_FORM: TouristAttraction = {
  id: '',
  name: '',
  locality: 'Chennai',
  description: '',
  distanceKm: 10.0,
  driveMinutes: 15,
  image: '',
  mapsQuery: '',
  isActive: true,
};

export const AdminHospitalityManager: React.FC<AdminHospitalityManagerProps> = ({
  adminEmail,
  onStatusMessage,
}) => {
  const [subTab, setSubTab] = useState<'accommodations' | 'attractions'>('accommodations');
  const [loading, setLoading] = useState(true);

  const [stays, setStays] = useState<AccommodationProperty[]>([]);
  const [stayRemoteIds, setStayRemoteIds] = useState<Set<string>>(new Set());

  const [places, setPlaces] = useState<TouristAttraction[]>([]);
  const [placeRemoteIds, setPlaceRemoteIds] = useState<Set<string>>(new Set());

  const [editingStay, setEditingStay] = useState<AccommodationProperty | null>(null);
  const [isNewStay, setIsNewStay] = useState(false);

  const [editingPlace, setEditingPlace] = useState<TouristAttraction | null>(null);
  const [isNewPlace, setIsNewPlace] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [stayRes, placeRes] = await Promise.all([
        fetchAccommodationDirectory(true),
        fetchAttractionsDirectory(true),
      ]);
      setStays(stayRes.items);
      setStayRemoteIds(stayRes.remoteIds);
      setPlaces(placeRes.items);
      setPlaceRemoteIds(placeRes.remoteIds);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load directory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveStay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStay) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const effectiveId = isNewStay
        ? sanitizeSlugId(editingStay.id || editingStay.name, 'stay')
        : editingStay.id;

      await saveAccommodationRecord(
        {
          ...editingStay,
          id: effectiveId,
          mapsQuery:
            editingStay.mapsQuery.trim() ||
            `${editingStay.name.trim()}, ${editingStay.address.trim()}`,
        },
        adminEmail
      );

      onStatusMessage(
        `Accommodation "${editingStay.name.trim()}" saved and synced to public directory.`
      );
      setEditingStay(null);
      setIsNewStay(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save accommodation record.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStayActive = async (item: AccommodationProperty) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const nextActive = item.isActive === false;
      await saveAccommodationRecord({ ...item, isActive: nextActive }, adminEmail);
      onStatusMessage(
        `${item.name} is now ${nextActive ? 'visible' : 'hidden'} on the public Accommodation page.`
      );
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update property visibility.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStayOverride = async (item: AccommodationProperty) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await deleteAccommodationOverride(item.id);
      const isDefault = DEFAULT_ACCOMMODATION_IDS.has(item.id);
      onStatusMessage(
        isDefault
          ? `Restored "${item.name}" to verified default values.`
          : `Deleted custom accommodation "${item.name}".`
      );
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to remove Firestore accommodation record.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlace) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const effectiveId = isNewPlace
        ? sanitizeSlugId(editingPlace.id || editingPlace.name, 'place')
        : editingPlace.id;

      await saveAttractionRecord(
        {
          ...editingPlace,
          id: effectiveId,
          image: editingPlace.image && editingPlace.image.trim() ? editingPlace.image.trim() : null,
          mapsQuery:
            editingPlace.mapsQuery.trim() ||
            `${editingPlace.name.trim()}, ${editingPlace.locality.trim()}`,
        },
        adminEmail
      );

      onStatusMessage(
        `Attraction "${editingPlace.name.trim()}" saved and synced to Places to Visit.`
      );
      setEditingPlace(null);
      setIsNewPlace(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save attraction record.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePlaceActive = async (item: TouristAttraction) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const nextActive = item.isActive === false;
      await saveAttractionRecord({ ...item, isActive: nextActive }, adminEmail);
      onStatusMessage(
        `${item.name} is now ${nextActive ? 'visible' : 'hidden'} on the public Places to Visit section.`
      );
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update attraction visibility.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePlaceOverride = async (item: TouristAttraction) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await deleteAttractionOverride(item.id);
      const isDefault = DEFAULT_ATTRACTION_IDS.has(item.id);
      onStatusMessage(
        isDefault
          ? `Restored "${item.name}" to verified default values.`
          : `Deleted custom attraction "${item.name}".`
      );
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to remove Firestore attraction record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-heading">
            Accommodation &amp; Places to Visit Management
          </h2>
          <p className="text-xs text-slate-500">
            Update verified hotel listings, road distances, contact numbers, and Places to Visit entries. Public listings automatically sort by driving distance from SRMIST.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs self-start">
          <button
            type="button"
            onClick={() => setSubTab('accommodations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              subTab === 'accommodations'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Accommodations ({stays.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('attractions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              subTab === 'attractions'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Places to Visit ({places.length})</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-500 hover:text-red-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          SUBTAB 1: ACCOMMODATION DIRECTORY MANAGER
         ===================================================================== */}
      {subTab === 'accommodations' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">{stays.filter((s) => s.isActive !== false).length}</strong> active listings displayed to delegates · Sorted ascending by road distance (km).
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewStay(true);
                setEditingStay({ ...EMPTY_STAY_FORM });
              }}
              className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Accommodation</span>
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading accommodation directory...
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stays.map((item) => {
                const hasRemoteOverride = stayRemoteIds.has(item.id);
                const isDefault = DEFAULT_ACCOMMODATION_IDS.has(item.id);
                const isHidden = item.isActive === false;

                return (
                  <div
                    key={item.id}
                    className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                      isHidden ? 'bg-slate-50 opacity-70' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold font-mono tabular-nums">
                          {item.distanceKm.toFixed(1)} km
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">
                          {item.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10.5px] font-semibold">
                          {item.category}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 text-[10.5px] font-semibold">
                          {item.locality}
                        </span>
                        {hasRemoteOverride && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            Firestore Synced
                          </span>
                        )}
                        {isHidden && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                            Hidden
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>{item.address}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Phone className="w-3 h-3 text-cyan-700 shrink-0" />
                          <span>
                            {item.phone}
                            {item.secondaryPhone ? ` / ${item.secondaryPhone}` : ''}
                            {item.phoneTypeNote ? ` (${item.phoneTypeNote})` : ''}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewStay(false);
                          setEditingStay({ ...item });
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-400 text-slate-700 hover:text-purple-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleToggleStayActive(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title={isHidden ? 'Show on public page' : 'Hide from public page'}
                      >
                        {isHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Show</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                            <span>Hide</span>
                          </>
                        )}
                      </button>

                      {hasRemoteOverride && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleRemoveStayOverride(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-red-300 text-red-600 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title={isDefault ? 'Revert to verified default' : 'Delete custom entry'}
                        >
                          {isDefault ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUBTAB 2: PLACES TO VISIT MANAGER
         ===================================================================== */}
      {subTab === 'attractions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">{places.filter((p) => p.isActive !== false).length}</strong> active attractions displayed · Sorted ascending by driving distance from SRMIST.
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewPlace(true);
                setEditingPlace({ ...EMPTY_PLACE_FORM });
              }}
              className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Attraction</span>
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading attractions directory...
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {places.map((item) => {
                const hasRemoteOverride = placeRemoteIds.has(item.id);
                const isDefault = DEFAULT_ATTRACTION_IDS.has(item.id);
                const isHidden = item.isActive === false;

                return (
                  <div
                    key={item.id}
                    className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                      isHidden ? 'bg-slate-50 opacity-70' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MapPin className="w-4 h-4 text-purple-500" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold font-mono tabular-nums">
                            {item.distanceKm.toFixed(1)} km
                          </span>
                          <h3 className="text-sm font-bold text-slate-900">
                            {item.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 text-[10.5px] font-semibold">
                            {item.locality}
                          </span>
                          {hasRemoteOverride && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                              Firestore Synced
                            </span>
                          )}
                          {isHidden && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewPlace(false);
                          setEditingPlace({ ...item });
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-400 text-slate-700 hover:text-purple-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleTogglePlaceActive(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Show</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                            <span>Hide</span>
                          </>
                        )}
                      </button>

                      {hasRemoteOverride && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleRemovePlaceOverride(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-red-300 text-red-600 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isDefault ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL: EDIT / ADD ACCOMMODATION
         ===================================================================== */}
      {editingStay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#0B112C] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading">
                {isNewStay ? 'Add Verified Accommodation' : `Edit ${editingStay.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingStay(null);
                  setIsNewStay(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStay} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Property Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={editingStay.name}
                    onChange={(e) => setEditingStay({ ...editingStay, name: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Category *</label>
                  <select
                    value={editingStay.category}
                    onChange={(e) =>
                      setEditingStay({
                        ...editingStay,
                        category: e.target.value as AccommodationCategory,
                      })
                    }
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500 bg-white"
                  >
                    <option value="Hotel">Hotel</option>
                    <option value="Guest House">Guest House</option>
                    <option value="Residency">Residency</option>
                    <option value="Homestay">Homestay</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Locality *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={editingStay.locality}
                    onChange={(e) => setEditingStay({ ...editingStay, locality: e.target.value })}
                    placeholder="e.g. Potheri, Kattankulathur, Guduvanchery"
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Distance (km) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="500"
                      required
                      value={editingStay.distanceKm}
                      onChange={(e) =>
                        setEditingStay({
                          ...editingStay,
                          distanceKm: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Drive Time (min)</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={editingStay.driveMinutes ?? ''}
                      onChange={(e) =>
                        setEditingStay({
                          ...editingStay,
                          driveMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Complete Postal Address *</label>
                <textarea
                  rows={2}
                  required
                  maxLength={400}
                  value={editingStay.address}
                  onChange={(e) => setEditingStay({ ...editingStay, address: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Primary Telephone *</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={editingStay.phone}
                    onChange={(e) => setEditingStay({ ...editingStay, phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Secondary Telephone</label>
                  <input
                    type="text"
                    maxLength={50}
                    value={editingStay.secondaryPhone || ''}
                    onChange={(e) =>
                      setEditingStay({ ...editingStay, secondaryPhone: e.target.value })
                    }
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contact Desk Note</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={editingStay.phoneTypeNote || ''}
                    onChange={(e) =>
                      setEditingStay({ ...editingStay, phoneTypeNote: e.target.value })
                    }
                    placeholder="Optional (e.g. OYO Central Booking Helpline)"
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Google Maps Destination Query</label>
                  <input
                    type="text"
                    maxLength={300}
                    value={editingStay.mapsQuery}
                    onChange={(e) => setEditingStay({ ...editingStay, mapsQuery: e.target.value })}
                    placeholder="Property Name, Locality, Tamil Nadu"
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editingStay.isActive !== false}
                  onChange={(e) =>
                    setEditingStay({ ...editingStay, isActive: e.target.checked })
                  }
                  className="rounded border-slate-300 text-purple-600"
                />
                <span className="font-medium text-slate-700">
                  Visible on public Accommodation page
                </span>
              </label>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingStay(null);
                    setIsNewStay(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Property'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EDIT / ADD TOURIST ATTRACTION
         ===================================================================== */}
      {editingPlace && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#0B112C] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading">
                {isNewPlace ? 'Add Tourist Attraction' : `Edit ${editingPlace.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingPlace(null);
                  setIsNewPlace(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlace} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Attraction Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={editingPlace.name}
                    onChange={(e) => setEditingPlace({ ...editingPlace, name: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Locality / Area *</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={editingPlace.locality}
                    onChange={(e) => setEditingPlace({ ...editingPlace, locality: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Distance (km) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="500"
                      required
                      value={editingPlace.distanceKm}
                      onChange={(e) =>
                        setEditingPlace({
                          ...editingPlace,
                          distanceKm: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Drive Time (min)</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={editingPlace.driveMinutes ?? ''}
                      onChange={(e) =>
                        setEditingPlace({
                          ...editingPlace,
                          driveMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Verified Photo URL / Path</label>
                  <input
                    type="text"
                    maxLength={500}
                    value={editingPlace.image || ''}
                    onChange={(e) => setEditingPlace({ ...editingPlace, image: e.target.value })}
                    placeholder="Leave empty for neutral pin card"
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Short Visitor Description *</label>
                <textarea
                  rows={2}
                  required
                  maxLength={400}
                  value={editingPlace.description}
                  onChange={(e) =>
                    setEditingPlace({ ...editingPlace, description: e.target.value })
                  }
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Google Maps Destination Query</label>
                <input
                  type="text"
                  maxLength={300}
                  value={editingPlace.mapsQuery}
                  onChange={(e) => setEditingPlace({ ...editingPlace, mapsQuery: e.target.value })}
                  placeholder="Attraction Name, Locality, Tamil Nadu, India"
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editingPlace.isActive !== false}
                  onChange={(e) =>
                    setEditingPlace({ ...editingPlace, isActive: e.target.checked })
                  }
                  className="rounded border-slate-300 text-purple-600"
                />
                <span className="font-medium text-slate-700">
                  Visible on public Places to Visit section
                </span>
              </label>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlace(null);
                    setIsNewPlace(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Attraction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
