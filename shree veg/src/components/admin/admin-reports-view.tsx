'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  UserX,
  RotateCw,
  UtensilsCrossed,
  Calendar,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Award,
  ChevronRight,
  Filter,
  Flame,
  PieChart,
  BarChart3,
  Hash,
} from 'lucide-react';
import {
  AdminReportsData,
  ReportKPIs,
  DayGuestReport,
  BookingTypeReport,
  TopDishReport,
} from '@/lib/booking/booking-service';
import { formatNum, formatInr } from '@/lib/marathi-numerals';

interface AdminReportsViewProps {
  lang: 'en' | 'hi' | 'mr';
  userRole?: 'owner' | 'manager' | 'kitchen';
  onToast?: (msg: string) => void;
}

export function AdminReportsView({
  lang,
  userRole = 'owner',
  onToast,
}: AdminReportsViewProps) {
  const [data, setData] = useState<AdminReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [useMarathiNumerals, setUseMarathiNumerals] = useState(lang === 'mr' || lang === 'hi');
  const [activeTooltipDay, setActiveTooltipDay] = useState<DayGuestReport | null>(null);

  // Sync numeral preference if language switches, but allow manual toggle
  useEffect(() => {
    setUseMarathiNumerals(lang === 'mr' || lang === 'hi');
  }, [lang]);

  // Fetch report data from API (computed in PostgreSQL RPC get_admin_reports)
  const fetchReports = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch('/api/admin/reports', { cache: 'no-store' });
      const json = await res.json();

      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || 'Failed to load reports');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (onToast) {
        onToast(lang === 'mr' ? 'अहवाल लोड अयशस्वी' : 'Failed to refresh reports');
      }
      console.warn('Reports fetch error:', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang, onToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Calculate highest guest count in 7 days for responsive chart scaling
  const maxDayGuests = useMemo(() => {
    if (!data?.next_7_days || data.next_7_days.length === 0) return 30;
    const peak = Math.max(...data.next_7_days.map((d) => d.total_guests));
    return Math.max(peak, 20); // minimum ceiling for aesthetic proportion
  }, [data]);

  // Max quantity among top dishes for relative bar scaling
  const maxDishQty = useMemo(() => {
    if (!data?.top_dishes || data.top_dishes.length === 0) return 10;
    return Math.max(...data.top_dishes.map((d) => d.total_quantity), 1);
  }, [data]);

  const kpis = data?.kpis || {
    total_requests: 0,
    confirmed: 0,
    pending: 0,
    no_shows: 0,
    seated: 0,
    cancelled: 0,
    rejected: 0,
    total_guests: 0,
    confirmed_guests: 0,
    pending_guests: 0,
  };

  const next7Days = data?.next_7_days || [];
  const bookingsByType = data?.bookings_by_type || [];
  const topDishes = data?.top_dishes || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ==================================================================== */}
      {/* 1. HEADER & CONTROLS TOOLBAR                                         */}
      {/* ==================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white shadow-md shadow-amber-500/20">
              📊
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{lang === 'mr' ? 'आरक्षण अहवाल व विश्लेषण' : 'Reports & Booking Analytics'}</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  {lang === 'mr' ? 'डेटाबेस RPC द्वारे थेट गणना' : 'SQL RPC Computed'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'mr'
                  ? 'पुणे-सोलापूर महामार्ग हॉटेल श्री प्युअर व्हेज: पुढील ७ दिवसांचा पाहुण्यांचा अंदाज व पदार्थ मागणी'
                  : 'Pune-Solapur Highway (NH-65): 7-Day guest forecast, booking types & popular dishes'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Marathi Numerals Toggle (०-९ vs 0-9) */}
          <button
            onClick={() => setUseMarathiNumerals(!useMarathiNumerals)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-sm ${
              useMarathiNumerals
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={lang === 'mr' ? 'मराठी आकडे (०-९) किंवा इंग्रजी (0-9) बदला' : 'Toggle Marathi / English Numerals'}
          >
            <Hash className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {useMarathiNumerals
                ? lang === 'mr'
                  ? 'मराठी आकडे (०-९) चालू'
                  : 'Marathi Digits (०-९)'
                : lang === 'mr'
                ? 'इंग्रजी आकडे (0-9)'
                : 'English Digits (0-9)'}
            </span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchReports(true)}
            disabled={refreshing || loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
            title={lang === 'mr' ? 'डेटाबेसवरून ताजे अहवाल आणा' : 'Refresh reports from database'}
          >
            <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{lang === 'mr' ? 'ताजे करा' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. CORE KPI SUMMARY CARDS                                            */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: TOTAL REQUESTS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold">{lang === 'mr' ? 'एकूण विनंत्या' : 'Total Requests'}</span>
            <span className="p-1.5 bg-slate-800/80 rounded-lg text-slate-300 group-hover:text-white transition">
              <TrendingUp className="w-4 h-4 text-sky-400" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatNum(kpis.total_requests, useMarathiNumerals)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Users className="w-3 h-3 text-sky-400 shrink-0" />
            <span>
              {lang === 'mr' ? 'एकूण पाहुणे:' : 'Total guests:'}{' '}
              <strong className="text-slate-200">{formatNum(kpis.total_guests, useMarathiNumerals)}</strong>
            </span>
          </div>
        </div>

        {/* KPI 2: CONFIRMED */}
        <div className="bg-slate-900 border border-emerald-950/60 bg-gradient-to-b from-emerald-950/20 to-slate-900 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-800/60 transition shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-300/80 mb-1.5">
            <span className="font-semibold">{lang === 'mr' ? 'निश्चित आरक्षणे' : 'Confirmed'}</span>
            <span className="p-1.5 bg-emerald-950/80 rounded-lg text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
            {formatNum(kpis.confirmed, useMarathiNumerals)}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
            <span>
              {lang === 'mr' ? 'निश्चित पाहुणे:' : 'Confirmed guests:'}{' '}
              <strong className="text-emerald-300 font-bold">{formatNum(kpis.confirmed_guests, useMarathiNumerals)}</strong>
            </span>
          </div>
        </div>

        {/* KPI 3: PENDING */}
        <div className="bg-slate-900 border border-amber-950/60 bg-gradient-to-b from-amber-950/20 to-slate-900 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-amber-800/60 transition shadow-lg">
          <div className="flex items-center justify-between text-xs text-amber-300/80 mb-1.5">
            <span className="font-semibold">{lang === 'mr' ? 'प्रलंबित (Pending)' : 'Pending'}</span>
            <span className="p-1.5 bg-amber-950/80 rounded-lg text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
            {formatNum(kpis.pending, useMarathiNumerals)}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1 flex items-center gap-1">
            <span>
              {lang === 'mr' ? 'प्रतीक्षेत पाहुणे:' : 'Waiting guests:'}{' '}
              <strong className="text-amber-300 font-bold">{formatNum(kpis.pending_guests, useMarathiNumerals)}</strong>
            </span>
          </div>
        </div>

        {/* KPI 4: NO-SHOWS */}
        <div className="bg-slate-900 border border-rose-950/60 bg-gradient-to-b from-rose-950/20 to-slate-900 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-rose-800/60 transition shadow-lg">
          <div className="flex items-center justify-between text-xs text-rose-300/80 mb-1.5">
            <span className="font-semibold">{lang === 'mr' ? 'गैरहजर (No-Shows)' : 'No-Shows'}</span>
            <span className="p-1.5 bg-rose-950/80 rounded-lg text-rose-400">
              <UserX className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
            {formatNum(kpis.no_shows, useMarathiNumerals)}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1 flex items-center gap-1">
            <span>
              {lang === 'mr' ? 'वेळेवर न आलेले टेबल' : 'Guests did not arrive'}
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. GUESTS PER DAY FOR NEXT 7 DAYS (CUSTOM SVG/CSS BAR CHART)          */}
      {/* ==================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>{lang === 'mr' ? 'पुढील ७ दिवसांचे पाहुणे (दैनिक बार आलेख)' : 'Guests Per Day for the Next 7 Days'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'mr'
                ? 'निश्चित (हिरवा) व प्रलंबित (पिवळा) पाहुण्यांचे प्रमाण; सण व ब्लॉक्ड दिवसांच्या नोंदीसह'
                : 'Confirmed (Emerald) and Pending (Amber) guests per date, with festival & maintenance notes'}
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-sm" />
              <span>{lang === 'mr' ? 'निश्चित' : 'Confirmed'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shadow-sm" />
              <span>{lang === 'mr' ? 'प्रलंबित' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80 shadow-sm" />
              <span>{lang === 'mr' ? 'सण/मर्यादा' : 'Festival Cap'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-600 shadow-sm" />
              <span>{lang === 'mr' ? 'आरक्षण बंद' : 'Blocked'}</span>
            </div>
          </div>
        </div>

        {/* Responsive Custom SVG/CSS Bar Chart Container (No heavy libraries) */}
        <div className="pt-6 pb-2">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-4 items-end min-h-[220px] sm:min-h-[260px] border-b border-slate-800 pb-3 relative">
            {/* Horizontal Guide Lines */}
            <div className="absolute inset-x-0 top-0 border-b border-slate-800/40 pointer-events-none" />
            <div className="absolute inset-x-0 top-1/2 border-b border-slate-800/30 border-dashed pointer-events-none" />

            {next7Days.map((day) => {
              const isToday = day.day_offset === 0;
              const isTomorrow = day.day_offset === 1;
              const hasGuests = day.total_guests > 0;

              // Proportional height calculations
              const totalHeightPct = Math.min(100, Math.max(12, (day.total_guests / maxDayGuests) * 100));
              const confirmedHeightPct =
                day.total_guests > 0 ? (day.confirmed_guests / day.total_guests) * 100 : 0;
              const pendingHeightPct =
                day.total_guests > 0 ? (day.pending_guests / day.total_guests) * 100 : 0;

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setActiveTooltipDay(day)}
                  onMouseLeave={() => setActiveTooltipDay(null)}
                  onClick={() => setActiveTooltipDay(activeTooltipDay?.date === day.date ? null : day)}
                >
                  {/* Top Badge: Total Guests Count */}
                  <div className="mb-2 transition-transform duration-200 group-hover:-translate-y-1">
                    {day.is_blocked ? (
                      <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {lang === 'mr' ? 'बंद' : 'Off'}
                      </span>
                    ) : hasGuests ? (
                      <span
                        className={`text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded-full border shadow-md flex items-center gap-0.5 ${
                          isToday
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-white border-slate-700 group-hover:border-amber-500/50'
                        }`}
                      >
                        <span>{formatNum(day.total_guests, useMarathiNumerals)}</span>
                        <span className="text-[9px] font-normal hidden sm:inline">
                          {lang === 'mr' ? 'पाहुणे' : 'g'}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-bold">
                        {formatNum(0, useMarathiNumerals)}
                      </span>
                    )}
                  </div>

                  {/* Vertical Bar Stack */}
                  <div
                    className="w-full max-w-[42px] sm:max-w-[56px] rounded-t-xl overflow-hidden flex flex-col justify-end transition-all duration-300 relative group-hover:brightness-110 shadow-lg"
                    style={{ height: day.is_blocked ? '22%' : `${totalHeightPct}%` }}
                  >
                    {day.is_blocked ? (
                      // Blocked day pattern
                      <div className="w-full h-full bg-slate-800/80 border-t-2 border-slate-600 flex items-center justify-center">
                        <span className="text-[10px] text-slate-500 font-mono select-none">✕</span>
                      </div>
                    ) : (
                      <>
                        {/* Pending portion (amber) */}
                        {pendingHeightPct > 0 && (
                          <div
                            className="w-full bg-gradient-to-t from-amber-600 to-amber-500 transition-all duration-300 relative"
                            style={{ height: `${pendingHeightPct}%` }}
                          />
                        )}

                        {/* Confirmed portion (emerald) */}
                        {confirmedHeightPct > 0 && (
                          <div
                            className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-300"
                            style={{ height: `${confirmedHeightPct}%` }}
                          />
                        )}

                        {/* Empty/Zero state fallback bar */}
                        {day.total_guests === 0 && (
                          <div className="w-full h-full bg-slate-800/40 border-t border-slate-700/50" />
                        )}
                      </>
                    )}

                    {/* Special indicator for festival day */}
                    {day.is_festival && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-400 shadow animate-ping" />
                    )}
                  </div>

                  {/* Day Label & Date Pill under the baseline */}
                  <div className="mt-2.5 text-center w-full">
                    <div
                      className={`text-[11px] sm:text-xs font-black truncate ${
                        isToday
                          ? 'text-amber-400'
                          : isTomorrow
                          ? 'text-sky-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {isToday
                        ? lang === 'mr'
                          ? 'आज'
                          : 'Today'
                        : isTomorrow
                        ? lang === 'mr'
                          ? 'उद्या'
                          : 'Tom'
                        : lang === 'mr'
                        ? day.day_name_mr
                        : day.day_name_en}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium truncate">
                      {formatNum(
                        lang === 'mr' ? day.formatted_date_mr : day.formatted_date_en,
                        useMarathiNumerals
                      )}
                    </div>

                    {/* Rule Indicator Pill */}
                    {day.is_festival && (
                      <div className="mt-0.5">
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 py-0.2 rounded font-black">
                          {lang === 'mr' ? '🚩 सण' : 'Fest'}
                        </span>
                      </div>
                    )}
                    {day.is_blocked && (
                      <div className="mt-0.5">
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-bold">
                          {lang === 'mr' ? 'बंद' : 'Off'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Tooltip Card on Day Selection / Hover */}
        {activeTooltipDay && (
          <div className="p-3.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 shadow-xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white">
                  {lang === 'mr' ? activeTooltipDay.day_name_mr : activeTooltipDay.day_name_en},{' '}
                  {formatNum(
                    lang === 'mr'
                      ? activeTooltipDay.formatted_date_mr
                      : activeTooltipDay.formatted_date_en,
                    useMarathiNumerals
                  )}
                </span>
                {activeTooltipDay.note && (
                  <span className="text-amber-300 text-[11px] block sm:inline sm:ml-2">
                    • {activeTooltipDay.note}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <div>
                <span className="text-slate-400">{lang === 'mr' ? 'एकूण पाहुणे:' : 'Total Guests:'} </span>
                <strong className="text-white text-xs">
                  {formatNum(activeTooltipDay.total_guests, useMarathiNumerals)}
                </strong>
              </div>
              <div>
                <span className="text-emerald-400">{lang === 'mr' ? 'निश्चित:' : 'Confirmed:'} </span>
                <strong className="text-emerald-300 font-bold">
                  {formatNum(activeTooltipDay.confirmed_guests, useMarathiNumerals)}
                </strong>
              </div>
              <div>
                <span className="text-amber-400">{lang === 'mr' ? 'प्रलंबित:' : 'Pending:'} </span>
                <strong className="text-amber-300 font-bold">
                  {formatNum(activeTooltipDay.pending_guests, useMarathiNumerals)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">{lang === 'mr' ? 'टेबल/बुकिंग्स:' : 'Bookings:'} </span>
                <strong className="text-white">
                  {formatNum(activeTooltipDay.booking_count, useMarathiNumerals)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 4. DUAL COLUMN: BOOKINGS BY TYPE & TOP PRE-ORDERED DISHES             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================================================================== */}
        {/* LEFT COLUMN: BOOKINGS BY TYPE                                      */}
        {/* ================================================================== */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-sky-400" />
                <span>{lang === 'mr' ? 'आरक्षण प्रकारानुसार वर्गीकरण' : 'Bookings by Type'}</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {lang === 'mr' ? 'एकूण' : 'Total'}:{' '}
                <strong className="text-white">{formatNum(kpis.total_requests, useMarathiNumerals)}</strong>{' '}
                {lang === 'mr' ? 'बुकिंग्स' : 'bookings'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {lang === 'mr'
                ? 'डायनिंग टेबल, भाविक पंगत थाळी आणि महामार्ग आगाऊ ऑर्डरचे प्रमाण'
                : 'Distribution between standard tables, pilgrim feasts, and order ahead halts'}
            </p>

            {/* Composite Horizontal Stacked Ratio Bar */}
            <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex shadow-inner mb-5">
              {bookingsByType.map((item) => {
                const color =
                  item.type === 'table'
                    ? 'bg-emerald-500'
                    : item.type === 'group_meal'
                    ? 'bg-amber-500'
                    : 'bg-sky-500';
                return (
                  <div
                    key={item.type}
                    style={{ width: `${item.percentage}%` }}
                    className={`${color} h-full transition-all duration-500 relative group`}
                    title={`${item.name_mr}: ${item.percentage}%`}
                  />
                );
              })}
            </div>

            {/* Breakdown Cards */}
            <div className="space-y-3">
              {bookingsByType.map((item) => {
                const badgeColor =
                  item.type === 'table'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : item.type === 'group_meal'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : 'border-sky-500/40 bg-sky-500/10 text-sky-300';

                return (
                  <div
                    key={item.type}
                    className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{lang === 'mr' ? item.name_mr : item.name_en}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>
                            {lang === 'mr' ? 'पाहुणे:' : 'Guests:'}{' '}
                            <strong className="text-slate-300">{formatNum(item.guests, useMarathiNumerals)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            {lang === 'mr' ? 'बुकिंग्स:' : 'Bookings:'}{' '}
                            <strong className="text-slate-300">{formatNum(item.count, useMarathiNumerals)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${badgeColor}`}>
                        {formatNum(item.percentage, useMarathiNumerals)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {lang === 'mr'
                ? '💡 भाविक पंगत थाळीत सर्वाधिक प्रवासी एकाच वेळी जेवतात.'
                : '💡 Pilgrim group meals accommodate the highest passenger volumes.'}
            </span>
          </div>
        </div>

        {/* ================================================================== */}
        {/* RIGHT COLUMN: TOP PRE-ORDERED DISHES LEADERBOARD                    */}
        {/* ================================================================== */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{lang === 'mr' ? 'सर्वाधिक मागणी असलेले पदार्थ (Top Pre-Orders)' : 'Top Pre-Ordered Dishes'}</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              {lang === 'mr' ? 'आगाऊ नोंदवलेले पदार्थ' : 'Advance Highway Orders'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {lang === 'mr'
              ? 'ग्राहकांनी टेबल आरक्षणासोबत आगाऊ निवडलेल्या खास महाराष्ट्रीयन पदार्थांची यादी'
              : 'Ranked by pre-ordered quantities across table and express halt reservations'}
          </p>

          {topDishes.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              {lang === 'mr' ? 'अद्याप आगाऊ पदार्थ नोंदवलेले नाहीत.' : 'No pre-ordered dishes recorded yet.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {topDishes.map((dish, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const fillPct = Math.min(100, Math.max(8, (dish.total_quantity / maxDishQty) * 100));

                const rankBadgeClass =
                  rank === 1
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : rank === 2
                    ? 'bg-slate-300 text-slate-950 font-black'
                    : rank === 3
                    ? 'bg-amber-700 text-amber-100 font-bold'
                    : 'bg-slate-800 text-slate-400 font-semibold';

                return (
                  <div
                    key={dish.id}
                    className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 hover:border-slate-700 transition relative overflow-hidden group"
                  >
                    {/* Background Proportional Progress Fill */}
                    <div
                      className="absolute inset-y-0 left-0 bg-amber-500/10 transition-all duration-500 pointer-events-none"
                      style={{ width: `${fillPct}%` }}
                    />

                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 shadow-sm ${rankBadgeClass}`}
                        >
                          {formatNum(rank, useMarathiNumerals)}
                        </div>

                        {/* Dish Details */}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{lang === 'mr' ? dish.name_mr : dish.name_en}</span>
                            {rank === 1 && (
                              <span className="text-[10px] text-amber-400 flex items-center gap-0.5 shrink-0">
                                <Flame className="w-3 h-3 fill-amber-400" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 capitalize">
                              {dish.category === 'thali'
                                ? lang === 'mr'
                                  ? 'थाळी'
                                  : 'Thali'
                                : dish.category === 'breakfast'
                                ? lang === 'mr'
                                  ? 'नाश्ता'
                                  : 'Snack'
                                : dish.category === 'dessert'
                                ? lang === 'mr'
                                  ? 'गोड'
                                  : 'Sweet'
                                : lang === 'mr'
                                ? 'जेवण'
                                : 'Main'}
                            </span>
                            <span>•</span>
                            <span>
                              {formatInr(dish.price, useMarathiNumerals)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity & Revenue Badges */}
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-amber-300 flex items-center justify-end gap-1">
                          <span>{formatNum(dish.total_quantity, useMarathiNumerals)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {lang === 'mr' ? 'प्लेट्स' : 'qty'}
                          </span>
                        </div>
                        {dish.total_revenue > 0 && (
                          <div className="text-[10px] text-emerald-400 font-medium">
                            {formatInr(dish.total_revenue, useMarathiNumerals)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. FOOTER & SQL PERFORMANCE NOTE                                     */}
      {/* ==================================================================== */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {lang === 'mr'
              ? 'सर्व आकडेवारी PostgreSQL RPC (public.get_admin_reports) द्वारे डेटाबेस स्तरावर थेट संकलित केली आहे.'
              : 'All numbers are computed inside the database via PostgreSQL RPC public.get_admin_reports.'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          {data?.computed_at ? new Date(data.computed_at).toLocaleTimeString() : ''}
        </div>
      </div>
    </div>
  );
}
