'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  RotateCw,
  Lock,
  Edit2,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { GroupPackage } from '@/lib/booking/booking-service';

interface AdminPackagesManagerProps {
  lang: 'en' | 'hi' | 'mr';
  userRole: 'owner' | 'manager' | 'kitchen';
  onToast: (msg: string) => void;
}

export function AdminPackagesManager({
  lang,
  userRole,
  onToast,
}: AdminPackagesManagerProps) {
  const [packages, setPackages] = useState<GroupPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPkg, setEditingPkg] = useState<GroupPackage | null>(null);
  const [nameMr, setNameMr] = useState<string>('');
  const [nameEn, setNameEn] = useState<string>('');
  const [pricePerHead, setPricePerHead] = useState<number>(0);
  const [minGuests, setMinGuests] = useState<number>(6);
  const [savingId, setSavingId] = useState<string | null>(null);

  const isKitchen = userRole === 'kitchen';

  // 1. Fetch Packages
  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/packages');
      const data = await res.json();
      if (data.success && Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
    } catch (err) {
      console.warn('Failed to fetch packages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  // 2. Broadcast sync to customer /book page
  const broadcastSync = (pkg: GroupPackage) => {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('shree-veg-realtime');
        bc.postMessage({ type: 'PACKAGE_UPDATED', package: pkg });
        bc.close();
      } catch {}
    }
  };

  // 3. Toggle Active status
  const handleToggleActive = async (pkg: GroupPackage) => {
    if (isKitchen) {
      alert(
        lang === 'mr'
          ? 'किचन भूमिका: केवळ वाचनाची परवानगी आहे. पॅकेज बदलू शकत नाही.'
          : 'Kitchen role is strictly read-only.'
      );
      return;
    }

    const newActive = !pkg.is_active;
    setSavingId(pkg.id);

    try {
      const res = await fetch('/api/admin/packages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': userRole,
        },
        body: JSON.stringify({
          id: pkg.id,
          is_active: newActive,
          role: userRole,
        }),
      });

      const data = await res.json();
      if (data.success && data.pkg) {
        setPackages((prev) =>
          prev.map((p) => (p.id === pkg.id ? { ...p, is_active: newActive } : p))
        );
        broadcastSync(data.pkg);
        onToast(
          lang === 'mr'
            ? `पॅकेज स्थिती बदलली: ${newActive ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}`
            : `Package status: ${newActive ? 'Active' : 'Inactive'}`
        );
      } else {
        alert(data.message_mr || data.error || 'Update failed');
      }
    } catch (err: any) {
      alert('Error updating package: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  // 4. Save Edited Package Details
  const handleSaveEdit = async () => {
    if (!editingPkg || isKitchen) return;

    if (pricePerHead <= 0 || minGuests <= 0) {
      alert(lang === 'mr' ? 'दर व किमान व्यक्ती संख्या योग्य टाका.' : 'Price and min guests must be positive.');
      return;
    }

    setSavingId(editingPkg.id);

    try {
      const res = await fetch('/api/admin/packages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': userRole,
        },
        body: JSON.stringify({
          id: editingPkg.id,
          name_mr: nameMr,
          name_en: nameEn,
          price_per_head: pricePerHead,
          min_guests: minGuests,
          role: userRole,
        }),
      });

      const data = await res.json();
      if (data.success && data.pkg) {
        setPackages((prev) =>
          prev.map((p) => (p.id === editingPkg.id ? { ...p, ...data.pkg } : p))
        );
        broadcastSync(data.pkg);
        setEditingPkg(null);
        onToast(
          lang === 'mr'
            ? `पंगत थाळी पॅकेज अद्यतनित झाले! दर: ₹${pricePerHead}/व्यक्ती, किमान ${minGuests} लोक.`
            : `Package updated! Rate: ₹${pricePerHead}/head, Min ${minGuests} guests.`
        );
      } else {
        alert(data.message_mr || data.error || 'Failed to update package');
      }
    } catch (err: any) {
      alert('Error saving package: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                {lang === 'mr' ? 'पंगत व कुटुंब थाळी पॅकेज व्यवस्थापन' : 'Group Meal Packages Management'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pilgrim & Family Packages
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'mr'
                ? 'भाविक मंडळे आणि मोठ्या कुटुंबांसाठी प्रति-व्यक्ती दर व किमान व्यक्ती संख्या नियंत्रित करा.'
                : 'Configure per-head pricing and minimum guests requirements for pilgrim group feasts.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isKitchen && (
            <span className="flex items-center gap-1 text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 px-2.5 py-1.5 rounded-xl font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'mr' ? 'किचन: फक्त वाचन' : 'Kitchen: Read-only'}</span>
            </span>
          )}

          <button
            onClick={fetchPackages}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl transition"
            title="Refresh Packages"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`p-5 rounded-2xl border transition-all ${
              !pkg.is_active
                ? 'bg-slate-950/60 border-slate-800 opacity-60'
                : 'bg-slate-900 border-slate-800 shadow-md hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  {pkg.id}
                </span>
                <h3 className="font-bold text-base text-white mt-1">
                  {lang === 'mr' ? pkg.name_mr : lang === 'hi' ? (pkg.name_hi || pkg.name_mr) : pkg.name_en}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'mr' ? pkg.name_en : lang === 'hi' ? pkg.name_en : (pkg.name_hi || pkg.name_mr)}
                </p>
              </div>

              {/* Active Toggle */}
              <button
                type="button"
                disabled={isKitchen}
                onClick={() => handleToggleActive(pkg)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  isKitchen
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : pkg.is_active
                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {pkg.is_active ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'mr' ? 'सक्रिय' : lang === 'hi' ? 'सक्रिय' : 'Active'}</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-slate-500" />
                    <span>{lang === 'mr' ? 'बंद' : lang === 'hi' ? 'निष्क्रिय' : 'Inactive'}</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 line-clamp-2">
              {lang === 'mr' ? pkg.description_mr : lang === 'hi' ? (pkg.description_hi || pkg.description_mr) : pkg.description_en}
            </p>

            {/* Price & Min Guests Badges */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    {lang === 'mr' ? 'प्रति व्यक्ती दर' : 'Price / Head'}
                  </span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    ₹{pkg.price_per_head}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    {lang === 'mr' ? 'किमान व्यक्ती' : 'Min Guests'}
                  </span>
                  <span className="text-sm font-bold text-slate-200">
                    {pkg.min_guests} {lang === 'mr' ? 'लोक' : 'guests'}
                  </span>
                </div>
              </div>

              {!isKitchen && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPkg(pkg);
                    setNameMr(pkg.name_mr);
                    setNameEn(pkg.name_en);
                    setPricePerHead(pkg.price_per_head);
                    setMinGuests(pkg.min_guests);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{lang === 'mr' ? 'बदला' : 'Edit'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Package Modal */}
      {editingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">
              {lang === 'mr' ? 'पंगत थाळी पॅकेज संपादन' : 'Edit Group Package'}
            </h3>

            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1">
                {lang === 'mr' ? 'मराठी नाव:' : 'Marathi Name:'}
              </label>
              <input
                type="text"
                value={nameMr}
                onChange={(e) => setNameMr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1">
                {lang === 'mr' ? 'English Name:' : 'English Name:'}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  {lang === 'mr' ? 'प्रति व्यक्ती दर (₹):' : 'Price / Head (₹):'}
                </label>
                <input
                  type="number"
                  value={pricePerHead}
                  onChange={(e) => setPricePerHead(Number(e.target.value))}
                  min="50"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  {lang === 'mr' ? 'किमान व्यक्ती संख्या:' : 'Min Guests:'}
                </label>
                <input
                  type="number"
                  value={minGuests}
                  onChange={(e) => setMinGuests(Number(e.target.value))}
                  min="2"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingId === editingPkg.id}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                {lang === 'mr' ? 'जतन करा व लागू करा' : 'Save & Apply'}
              </button>
              <button
                type="button"
                onClick={() => setEditingPkg(null)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl border border-slate-700"
              >
                {lang === 'mr' ? 'रद्द' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
