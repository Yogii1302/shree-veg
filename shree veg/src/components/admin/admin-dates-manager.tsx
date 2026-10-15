'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  Lock,
  RotateCw,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  Info,
} from 'lucide-react';
import { DateRule } from '@/lib/booking/booking-service';

interface AdminDatesManagerProps {
  lang: 'en' | 'hi' | 'mr';
  userRole: 'owner' | 'manager' | 'kitchen';
  onToast: (msg: string) => void;
}

interface DayItem {
  dateStr: string;
  dateObj: Date;
  dayIndex: number;
  dayNameMr: string;
  dayNameHi: string;
  dayNameEn: string;
  formattedDate: string;
  isToday: boolean;
  isTomorrow: boolean;
}

export function AdminDatesManager({
  lang,
  userRole,
  onToast,
}: AdminDatesManagerProps) {
  const [rules, setRules] = useState<DateRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDateModal, setActiveDateModal] = useState<DayItem | null>(null);
  const [ruleKind, setRuleKind] = useState<'festival' | 'blocked'>('festival');
  const [noteMr, setNoteMr] = useState<string>('');
  const [noteEn, setNoteEn] = useState<string>('');
  const [savingDate, setSavingDate] = useState<string | null>(null);

  const isKitchen = userRole === 'kitchen';

  // 1. Generate Next 14 Days
  const days: DayItem[] = React.useMemo(() => {
    const list: DayItem[] = [];
    const daysMr = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरूवार', 'शुक्रवार', 'शनिवार'];
    const daysHi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      list.push({
        dateStr,
        dateObj: d,
        dayIndex: i,
        dayNameMr: daysMr[d.getDay()],
        dayNameHi: daysHi[d.getDay()],
        dayNameEn: daysEn[d.getDay()],
        formattedDate: `${day}/${m}/${y}`,
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }
    return list;
  }, []);

  // 2. Fetch Active Date Rules
  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/date-rules');
      const data = await res.json();
      if (data.success && Array.isArray(data.rules)) {
        setRules(data.rules);
      }
    } catch (err) {
      console.warn('Failed to fetch date rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // 3. Broadcast sync to customer /book page
  const broadcastSync = () => {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('shree-veg-realtime');
        bc.postMessage({ type: 'DATE_RULE_UPDATED' });
        bc.close();
      } catch {}
    }
  };

  // 4. Set Rule (Festival or Blocked)
  const handleSetRule = async (dateStr: string, kind: 'festival' | 'blocked', customNoteMr?: string, customNoteEn?: string) => {
    if (isKitchen) {
      alert(
        lang === 'mr'
          ? 'किचन भूमिका: केवळ वाचनाची परवानगी आहे. तारीख नियम बदलू शकत नाही.'
          : 'Kitchen role is strictly read-only.'
      );
      return;
    }

    setSavingDate(dateStr);

    try {
      const res = await fetch('/api/admin/date-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': userRole,
        },
        body: JSON.stringify({
          date: dateStr,
          kind,
          note_mr: customNoteMr,
          note_en: customNoteEn,
          role: userRole,
        }),
      });

      const data = await res.json();
      if (data.success && data.rule) {
        setRules((prev) => [
          ...prev.filter((r) => r.date !== dateStr),
          data.rule,
        ]);
        broadcastSync();
        setActiveDateModal(null);
        onToast(
          lang === 'mr'
            ? kind === 'festival'
              ? `✨ ${dateStr} सण दिवस म्हणून घोषित! (जागा १२/स्लॉट, टेबल कमाल १०). ग्राहक पेजवर त्वरित दिसेल.`
              : `⛔ ${dateStr} तारीख ब्लॉक केली (बुकिंग बंद). ग्राहक पेजवर त्वरित दिसेल.`
            : kind === 'festival'
            ? `✨ ${dateStr} marked as Festival Day (limited 12 seats/slot, max table size 10). Synced to /book!`
            : `⛔ ${dateStr} blocked for bookings. Synced to /book!`
        );
      } else {
        alert(data.message_mr || data.message_en || data.error || 'Failed to set rule');
      }
    } catch (err: any) {
      alert('Error setting date rule: ' + err.message);
    } finally {
      setSavingDate(null);
    }
  };

  // 5. Reset to Normal
  const handleResetRule = async (dateStr: string) => {
    if (isKitchen) return;

    setSavingDate(dateStr);

    try {
      const res = await fetch('/api/admin/date-rules', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': userRole,
        },
        body: JSON.stringify({
          date: dateStr,
          role: userRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRules((prev) => prev.filter((r) => r.date !== dateStr));
        broadcastSync();
        onToast(
          lang === 'mr'
            ? `🟢 ${dateStr} सामान्य दिवस म्हणून पूर्ववत केले (३० जागा/स्लॉट). /book वर रिअलटाइम सिंक झाले.`
            : `🟢 ${dateStr} restored to Normal Day (30 seats/slot). Synced to /book!`
        );
      } else {
        alert(data.message_mr || data.error || 'Failed to reset date');
      }
    } catch (err: any) {
      alert('Error resetting date: ' + err.message);
    } finally {
      setSavingDate(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                {lang === 'mr' ? 'पुढील १४ दिवसांचे नियम व सण व्यवस्थापन' : 'Next 14 Days Rules & Festival Control'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                14-Day Calendar
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'mr'
                ? 'कोणताही दिवस सण दिवस घोषित करा (मर्यादित १२ जागा, टेबल कमाल १०) किंवा पूर्ण ब्लॉक करा. डेटाबेस व ग्राहक पेजवर त्वरित लागू होते.'
                : 'Mark any day as Festival Day (limited 12 seats/slot, max table size 10) or Block date entirely. Read by create_booking.'}
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
            onClick={fetchRules}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl transition"
            title="Refresh Rules"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Rules Summary Pill Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            🟢
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              {lang === 'mr' ? 'सामान्य दिवस (Normal Days)' : 'Normal Capacity'}
            </div>
            <div className="text-[11px] text-slate-400">
              {lang === 'mr' ? '३० जागा प्रति स्लॉट • टेबल कमाल १२ व्यक्ती' : '30 seats/slot • Max 12 per table'}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
            ✨
          </div>
          <div>
            <div className="text-xs font-bold text-amber-300">
              {lang === 'mr' ? 'सण / उत्सव दिवस (Festival)' : 'Festival / Rush Days'}
            </div>
            <div className="text-[11px] text-amber-400/90">
              {lang === 'mr' ? 'मर्यादित १२ जागा • टेबल कमाल १० व्यक्ती' : 'Limited 12 seats • Max 10 per table'}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold">
            ⛔
          </div>
          <div>
            <div className="text-xs font-bold text-rose-300">
              {lang === 'mr' ? 'तारीख ब्लॉक (Blocked)' : 'Blocked Dates'}
            </div>
            <div className="text-[11px] text-rose-400/90">
              {lang === 'mr' ? 'आरक्षण पूर्ण बंद (डीप-क्लिनिंग / प्रायव्हेट)' : 'Bookings closed (maintenance)'}
            </div>
          </div>
        </div>
      </div>

      {/* 14 Days List Grid */}
      <div className="space-y-2.5">
        {days.map((day) => {
          const rule = rules.find((r) => r.date === day.dateStr);
          const isFestival = rule?.kind === 'festival';
          const isBlocked = rule?.kind === 'blocked';
          const isNormal = !rule;
          const isSaving = savingDate === day.dateStr;

          return (
            <div
              key={day.dateStr}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isBlocked
                  ? 'bg-rose-950/30 border-rose-800/80'
                  : isFestival
                  ? 'bg-amber-950/25 border-amber-700/80 shadow-md shadow-amber-950/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-750'
              }`}
            >
              {/* Date Info */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border font-mono shrink-0 ${
                    isBlocked
                      ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                      : isFestival
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-bold leading-none">
                    {day.dayNameMr.substring(0, 3)}
                  </span>
                  <span className="text-base font-black leading-tight">
                    {day.dateObj.getDate()}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white">
                      {lang === 'mr' ? day.dayNameMr : lang === 'hi' ? day.dayNameHi : day.dayNameEn},{' '}
                      <span className="font-mono text-slate-300">{day.formattedDate}</span>
                    </span>

                    {day.isToday && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {lang === 'mr' ? 'आज' : lang === 'hi' ? 'आज' : 'Today'}
                      </span>
                    )}

                    {day.isTomorrow && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        {lang === 'mr' ? 'उद्या' : lang === 'hi' ? 'कल' : 'Tomorrow'}
                      </span>
                    )}

                    {/* Status Badge */}
                    {isFestival ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{lang === 'mr' ? 'सण दिवस (कमाल १० टेबल)' : lang === 'hi' ? 'त्योहार (अधिकतम १० टेबल)' : 'Festival (Max 10 Table)'}</span>
                      </span>
                    ) : isBlocked ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <Ban className="w-3 h-3 text-rose-400" />
                        <span>{lang === 'mr' ? 'आरक्षण बंद (Blocked)' : lang === 'hi' ? 'बुकिंग बंद (Blocked)' : 'Blocked'}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {lang === 'mr' ? 'सामान्य दिवस (३० जागा)' : lang === 'hi' ? 'सामान्य दिवस (३० सीटें)' : 'Normal (30 Seats)'}
                      </span>
                    )}
                  </div>

                  {/* Rule Note if active */}
                  {rule && (
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-1 font-medium">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{lang === 'mr' ? rule.note_mr : rule.note_en || rule.note_mr}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isNormal ? (
                  <>
                    <button
                      type="button"
                      disabled={isKitchen || isSaving}
                      onClick={() => {
                        setActiveDateModal(day);
                        setRuleKind('festival');
                        setNoteMr('सण/यात्रा गर्दी दिवस (मर्यादित जागा: १२ प्रति स्लॉट, टेबल कमाल १० व्यक्ती)');
                        setNoteEn('Festival Pilgrim Rush (Limited Seats: 12 per slot, Max 10 per table)');
                      }}
                      className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lang === 'mr' ? 'सण दिवस घोषित करा' : 'Mark Festival'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isKitchen || isSaving}
                      onClick={() => {
                        setActiveDateModal(day);
                        setRuleKind('blocked');
                        setNoteMr('हॉटेल स्वच्छता देखभाल व खाजगी कार्यक्रम (आरक्षण बंद)');
                        setNoteEn('Kitchen Deep Cleaning & Maintenance (Bookings Closed)');
                      }}
                      className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-400" />
                      <span>{lang === 'mr' ? 'ब्लॉक करा' : 'Block Date'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isKitchen || isSaving}
                    onClick={() => handleResetRule(day.dateStr)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'mr' ? 'सामान्य करा (Reset to Normal)' : 'Reset to Normal'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Set Rule Custom Note Modal */}
      {activeDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-base text-white">
                {ruleKind === 'festival'
                  ? lang === 'mr'
                    ? 'सण/उत्सव दिवस घोषित करा'
                    : 'Mark as Festival Day'
                  : lang === 'mr'
                  ? 'तारीख ब्लॉक करा (आरक्षण बंद)'
                  : 'Block Date for Bookings'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {activeDateModal.dayNameMr} • {activeDateModal.dateStr}
              </p>
            </div>

            {ruleKind === 'festival' && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 space-y-1">
                <span className="font-bold block flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  सण दिवसाचे नियम (Database Enforced):
                </span>
                <p className="text-[11px] text-amber-300/90">
                  • प्रति स्लॉट क्षमता: कमाल १२ जागा (सामान्य ३० ऐवजी)<br />
                  • टेबल आरक्षण: कमाल १० व्यक्ती मर्यादा (११+ साठी पंगत थाळी अनिवार्य)<br />
                  • ग्राहक बुकिंग पेजवर विशेष सूचना बॅनर दिसेल
                </p>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1">
                {lang === 'mr' ? 'पाहुण्यांना दिसणारी सूचना (Marathi Note):' : 'Notice (Marathi):'}
              </label>
              <input
                type="text"
                value={noteMr}
                onChange={(e) => setNoteMr(e.target.value)}
                placeholder="उदा. अंगारकी संकष्टी चतुर्थी (अमर्यादित भाविक गर्दी)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1">
                {lang === 'mr' ? 'इंग्रजी सूचना (English Note):' : 'Notice (English):'}
              </label>
              <input
                type="text"
                value={noteEn}
                onChange={(e) => setNoteEn(e.target.value)}
                placeholder="e.g. Festival Rush (Limited seats: 12 per slot)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  handleSetRule(activeDateModal.dateStr, ruleKind, noteMr, noteEn)
                }
                className={`flex-1 py-3 text-white font-bold text-xs rounded-xl shadow-lg transition ${
                  ruleKind === 'festival'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {lang === 'mr' ? 'नियम जतन करा व लागू करा' : 'Save & Apply Rule'}
              </button>
              <button
                type="button"
                onClick={() => setActiveDateModal(null)}
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
