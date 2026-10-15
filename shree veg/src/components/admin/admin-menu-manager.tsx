'use client';

import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  RotateCw,
  CheckCircle,
  AlertCircle,
  Lock,
  Tag,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { MenuItem } from '@/lib/booking/booking-service';

interface AdminMenuManagerProps {
  lang: 'en' | 'hi' | 'mr';
  userRole: 'owner' | 'manager' | 'kitchen';
  onToast: (msg: string) => void;
}

export function AdminMenuManager({
  lang,
  userRole,
  onToast,
}: AdminMenuManagerProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editNameMr, setEditNameMr] = useState<string>('');
  const [editNameEn, setEditNameEn] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const isKitchen = userRole === 'kitchen';

  // 1. Fetch menu items
  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/menu');
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch (err) {
      console.warn('Failed to fetch menu items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  // 2. Broadcast local update so /book sees changes within milliseconds
  const broadcastSync = (updatedItem: MenuItem) => {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('shree-veg-realtime');
        bc.postMessage({ type: 'MENU_UPDATED', item: updatedItem });
        bc.close();
      } catch {}
    }
  };

  // 3. Toggle Sold Out
  const handleToggleSoldOut = async (item: MenuItem) => {
    if (isKitchen) {
      alert(
        lang === 'mr'
          ? 'किचन भूमिका: केवळ वाचनाची परवानगी आहे. मेनू बदल करू शकत नाही.'
          : 'Kitchen role is strictly read-only. Menu changes forbidden.'
      );
      return;
    }

    const newSoldOut = !item.is_sold_out;
    setSavingId(item.id);

    // Optimistic UI update
    setItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, is_sold_out: newSoldOut } : m))
    );

    try {
      const res = await fetch('/api/admin/menu', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': userRole,
        },
        body: JSON.stringify({
          id: item.id,
          is_sold_out: newSoldOut,
          role: userRole,
        }),
      });

      const data = await res.json();
      if (data.success && data.item) {
        broadcastSync(data.item);
        onToast(
          lang === 'mr'
            ? newSoldOut
              ? `🔴 "${item.name_mr}" संपले (Sold Out) म्हणून चिन्हांकित केले. /book वर त्वरित दिसले!`
              : `🟢 "${item.name_mr}" पुन्हा उपलब्ध केले. /book वर त्वरित दिसले!`
            : newSoldOut
            ? `🔴 "${item.name_en}" marked as Sold Out. Synced to /book!`
            : `🟢 "${item.name_en}" marked In Stock. Synced to /book!`
        );
      } else {
        // Revert on failure
        setItems((prev) =>
          prev.map((m) => (m.id === item.id ? { ...m, is_sold_out: item.is_sold_out } : m))
        );
        alert(data.message_mr || data.message_en || data.error || 'Update failed');
      }
    } catch (err: any) {
      alert('Error updating item: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  // 4. Save Edited Price and Name
  const handleSaveEdit = async (item: MenuItem) => {
    if (isKitchen) return;

    if (editPrice < 0) {
      alert(lang === 'mr' ? 'किंमत योग्य टाका.' : 'Price must be positive.');
      return;
    }

    setSavingId(item.id);

    try {
      const res = await fetch('/api/admin/menu', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': userRole,
        },
        body: JSON.stringify({
          id: item.id,
          price: editPrice,
          name_mr: editNameMr || item.name_mr,
          name_en: editNameEn || item.name_en,
          role: userRole,
        }),
      });

      const data = await res.json();
      if (data.success && data.item) {
        setItems((prev) =>
          prev.map((m) => (m.id === item.id ? { ...m, ...data.item } : m))
        );
        broadcastSync(data.item);
        setEditingId(null);
        onToast(
          lang === 'mr'
            ? `₹${editPrice} किंमत अद्यतनित झाली! ग्राहक बुकिंग पेजवर सेकंदांत बदल दिसेल.`
            : `Price updated to ₹${editPrice}! Reflected on /book immediately.`
        );
      } else {
        alert(data.message_mr || data.error || 'Failed to update price');
      }
    } catch (err: any) {
      alert('Error saving price: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const categories = [
    { key: 'all', mr: 'सर्व पदार्थ', en: 'All Items' },
    { key: 'thali', mr: 'थाळी', en: 'Thali' },
    { key: 'breakfast', mr: 'नाश्ता', en: 'Breakfast' },
    { key: 'main_course', mr: 'मुख्य जेवण', en: 'Main Course' },
    { key: 'dessert', mr: 'मिष्टान्न', en: 'Dessert' },
  ];

  const filteredItems = items.filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                {lang === 'mr' ? 'मेनू व किंमत व्यवस्थापन' : 'Menu & Pricing Management'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ⚡ Realtime Sync to /book
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'mr'
                ? 'येथे किंमत बदलल्यास किंवा विक्री बंद केल्यास ग्राहक बुकिंग पेजवर सेकंदांत बदल होतो.'
                : 'Price changes and Sold-out toggles sync to customer page /book within seconds.'}
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
            onClick={fetchMenuItems}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl transition"
            title="Refresh Menu"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeCategory === c.key
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {lang === 'mr' ? c.mr : c.en}
          </button>
        ))}
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredItems.map((item) => {
          const isEditing = editingId === item.id;
          const isSaving = savingId === item.id;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                item.is_sold_out
                  ? 'bg-slate-950/60 border-slate-800/80 opacity-80'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                      {item.category}
                    </span>

                    {item.is_sold_out ? (
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
                        🔴 {lang === 'mr' ? 'विक्री संपली (Sold Out)' : 'Sold Out'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                        🟢 {lang === 'mr' ? 'उपलब्ध (In Stock)' : 'In Stock'}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  {isEditing ? (
                    <div className="space-y-2 pt-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block">मराठी नाव:</label>
                        <input
                          type="text"
                          value={editNameMr}
                          onChange={(e) => setEditNameMr(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">English Name:</label>
                        <input
                          type="text"
                          value={editNameEn}
                          onChange={(e) => setEditNameEn(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-sm text-white pt-1">
                        {lang === 'mr' ? item.name_mr : lang === 'hi' ? (item.name_hi || item.name_mr) : item.name_en}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {lang === 'mr' ? item.description_mr : lang === 'hi' ? (item.description_hi || item.description_mr) : item.description_en}
                      </p>
                    </>
                  )}

                  {/* Price display / editor */}
                  <div className="pt-2 flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-black text-sm">₹</span>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-24 bg-slate-950 border border-amber-500 rounded-lg px-2.5 py-1 text-xs font-black text-amber-300"
                          min="0"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item)}
                          disabled={isSaving}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{lang === 'mr' ? 'जतन करा' : 'Save'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-black text-amber-400 tracking-wide font-mono">
                          ₹{item.price}
                        </div>
                        {!isKitchen && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditPrice(item.price);
                              setEditNameMr(item.name_mr);
                              setEditNameEn(item.name_en);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                            title="किंमत बदला (Edit Price)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* SOLD OUT TOGGLE SWITCH */}
                <div className="flex flex-col items-end gap-1 shrink-0 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {lang === 'mr' ? 'उपलब्धता स्थिती' : 'Availability'}
                  </span>
                  <button
                    type="button"
                    disabled={isKitchen || isSaving}
                    onClick={() => handleToggleSoldOut(item)}
                    title={
                      isKitchen
                        ? 'किचन भूमिका: केवळ वाचन'
                        : item.is_sold_out
                        ? 'उपलब्ध करण्यासाठी दाबा'
                        : 'विक्री बंद करण्यासाठी दाबा'
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                      isKitchen
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                        : item.is_sold_out
                        ? 'bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-700/80'
                        : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/80'
                    }`}
                  >
                    {item.is_sold_out ? (
                      <>
                        <ToggleLeft className="w-4 h-4 text-rose-400" />
                        <span>{lang === 'mr' ? 'संपले' : 'Sold Out'}</span>
                      </>
                    ) : (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-400" />
                        <span>{lang === 'mr' ? 'उपलब्ध' : 'Available'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
