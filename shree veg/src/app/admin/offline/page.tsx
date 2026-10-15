'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, RotateCw, Phone, ArrowLeft } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-500">
          <WifiOff className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-white mb-1">
          इंटरनेट कनेक्शन बंद आहे
        </h1>
        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3">
          Staff App Offline Mode
        </p>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          पुणे-सोलापूर महामार्गावर NH-65 नेटवर्क कमी असू शकते. श्री प्युअर व्हेज पोर्टल नेटवर्क सुरू होताच आपोआप रिफ्रेश होईल.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition"
          >
            <RotateCw className="w-4 h-4" />
            <span>पुन्हा कनेक्ट करा (Reconnect)</span>
          </button>

          <a
            href="tel:+919876543210"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-medium rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>हॉटेल कॉल करा (+91 98765 43210)</span>
          </a>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 pt-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>कर्मचारी पोर्टलवर जा (/admin)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
