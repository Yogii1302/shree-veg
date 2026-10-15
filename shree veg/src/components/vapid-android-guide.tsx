'use client';

import React from 'react';
import { X, Key, Smartphone, BatteryCharging, ShieldAlert, CheckCircle2, Copy } from 'lucide-react';

interface VapidAndroidGuideProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'hi' | 'mr';
}

export function VapidAndroidGuide({ isOpen, onClose, lang }: VapidAndroidGuideProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isDevanagari = lang === 'mr' || lang === 'hi';
  const isMr = isDevanagari;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isMr ? 'VAPID की व Android फोन पुश चाचणी मार्गदर्शक' : 'VAPID Keys & Android Phone Push Testing Guide'}
              </h2>
              <p className="text-xs text-slate-400">
                {isMr ? 'पुश सूचना निर्मिती, HTTPS आवश्यकता व बॅटरी सेव्हर सेटिंग्ज' : 'Push key generation, HTTPS setup & Android battery settings'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 pt-5 text-sm">
          {/* Section 1: Generating VAPID Keys */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center gap-2 mb-2 text-amber-400 font-semibold">
              <Key className="w-4 h-4" />
              <span>{isMr ? '१. नवीन VAPID की (VAPID Keys) कशा तयार कराव्यात?' : '1. How to Generate VAPID Keys'}</span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {isMr
                ? 'Web Push Protocol साठी RFC 8292 नियमांनुसार VAPID (Voluntary Application Server Identification) जोडी लागते. टर्मिनलमध्ये खालील कमांड चालवा:'
                : 'Web Push requires an RFC 8292 compliant VAPID keypair. Run this command in your terminal:'}
            </p>

            <div className="relative bg-slate-950 rounded-lg p-3 font-mono text-xs text-emerald-400 border border-slate-800 flex items-center justify-between">
              <code>npx web-push generate-vapid-keys</code>
              <button
                onClick={() => copyToClipboard('npx web-push generate-vapid-keys', 'cmd')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
              >
                {copiedKey === 'cmd' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'cmd' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              {isMr ? 'तयार झालेल्या की '.concat('`.env.local` मध्ये खालीलप्रमाणे जोडा:') : 'Add generated keys to `.env.local`:'}
              <pre className="mt-2 bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300 overflow-x-auto">
{`NEXT_PUBLIC_VAPID_PUBLIC_KEY="BP2k7fQ6G6KbDcx..."
VAPID_PRIVATE_KEY="jSTdWVFACnZK..."
VAPID_SUBJECT="mailto:admin@shreeveg.com"`}
              </pre>
            </div>
          </div>

          {/* Section 2: Android Phone Testing */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center gap-2 mb-2 text-amber-400 font-semibold">
              <Smartphone className="w-4 h-4" />
              <span>{isMr ? '२. Android फोनवर पुश सूचनांची चाचणी कशी करावी?' : '2. How to Test Push Notifications on Android Phone'}</span>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
              {/* Point A: HTTPS */}
              <div className="flex gap-2.5 items-start">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">
                    {isMr ? 'अ. HTTPS आवश्यक (HTTPS Requirement):' : 'A. HTTPS Required:'}
                  </strong>
                  {isMr ? (
                    <>
                      Android Chrome वर Web Push आणि Service Worker फक्त <strong>HTTPS</strong> किंवा <strong>localhost</strong> वर काम करतात. फोनवर लोकल Wi-Fi आयपी (<code className="text-amber-300">http://192.168.x.x:3000</code>) वरून उघडल्यास ब्राउझर पुश ब्लॉक करतो.
                      <br />
                      <strong>उपाय:</strong> मोफत HTTPS टनेल वापरा:
                      <div className="mt-1 font-mono text-[11px] bg-slate-950 p-1.5 rounded text-sky-400">
                        ngrok http 3000
                      </div>
                      किंवा Chrome USB केबल Port Forwarding वापरून फोनवर थेट <code className="text-amber-300">http://localhost:3000/admin</code> उघडा!
                    </>
                  ) : (
                    <>
                      Android Chrome strictly enforces <strong>HTTPS</strong> for Service Worker Push subscriptions (with <code className="text-amber-300">localhost</code> as the only exception). Opening over plain local Wi-Fi HTTP (<code className="text-amber-300">http://192.168.x.x:3000</code>) will be blocked.
                      <br />
                      <strong>Solution:</strong> Use a free HTTPS tunnel:
                      <div className="mt-1 font-mono text-[11px] bg-slate-950 p-1.5 rounded text-sky-400">
                        ngrok http 3000
                      </div>
                      Or connect via USB using Chrome Port Forwarding (<code className="text-amber-300">chrome://inspect</code>) to access <code className="text-amber-300">http://localhost:3000/admin</code> directly on your phone!
                    </>
                  )}
                </div>
              </div>

              {/* Point B: Permission */}
              <div className="flex gap-2.5 items-start">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">
                    {isMr ? 'ब. सूचना परवानगी (Notification Permission):' : 'B. Notification Permission (Android 13+):'}
                  </strong>
                  {isMr ? (
                    <>
                      Android 13+ मध्ये नोटिफिकेशन परवानगी बंधनकारक आहे. &quot;पुश सूचना&quot; बटण दाबल्यावर येणाऱ्या पॉपअपमध्ये <strong>Allow (परवानगी द्या)</strong> निवडा.
                    </>
                  ) : (
                    <>
                      Android 13+ requires explicit runtime notification permission. Tap &quot;Enable Push&quot; and select <strong>Allow</strong> in the browser prompt.
                    </>
                  )}
                </div>
              </div>

              {/* Point C: Battery Saver */}
              <div className="flex gap-2.5 items-start">
                <BatteryCharging className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">
                    {isMr ? 'क. बॅटरी सेव्हर व ॲप स्लीप मोड (Battery Saver & Sleep Mode):' : 'C. Battery Saver & Background App Optimization:'}
                  </strong>
                  {isMr ? (
                    <>
                      Samsung, Xiaomi, OnePlus फोन स्क्रीन लॉक झाल्यावर पार्श्वभूमीतील पुश थांबवतात. फोन लॉक असतानाही झटपट बेल वाजण्यासाठी:
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-300">
                        <li>फोन सेटिंग्ज &gt; ॲप्स &gt; Chrome (किंवा श्री व्हेज PWA) उघडा.</li>
                        <li><strong>बॅटरी (Battery)</strong> पर्यायावर जाऊन <strong>Unrestricted (अमर्यादित)</strong> निवडा.</li>
                        <li>&quot;Pause app activity if unused&quot; बंद करा.</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      Aggressive Android OEMs (Samsung, Xiaomi MIUI, OnePlus) throttle background Web Push when screen is locked. To receive instant ringing alerts:
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-300">
                        <li>Settings &gt; Apps &gt; Chrome (or installed Shree Veg Staff PWA).</li>
                        <li>Tap <strong>Battery</strong> &gt; Select <strong>Unrestricted</strong>.</li>
                        <li>Turn OFF &quot;Pause app activity if unused&quot;.</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Role Enforcement & Supabase RLS (Kitchen Read-Only) */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center gap-2 mb-2 text-rose-400 font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>{isMr ? '३. भूमिका नियंत्रण व Supabase RLS (Kitchen Read-Only Security)' : '3. Role Enforcement & Supabase RLS (Kitchen Read-Only)'}</span>
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {isMr
                ? 'स्वयंपाकघर (Kitchen) भूमिकेला केवळ आरक्षणे व टोकन्स वाचण्याची परवानगी असते. आरक्षणाची स्थिती (Accept, Reject, Seated, No-Show) बदलण्याचे अधिकार केवळ मालक व व्यवस्थापकांना आहेत.'
                : 'Kitchen staff have strictly read-only access to view live incoming tokens & dishes. Modifying booking statuses (Accept, Reject, Mark Seated, No-Show) is restricted to Owner & Manager.'}
            </p>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-amber-400 font-mono text-[11px] mb-1 font-bold">
                  {isMr ? 'UI स्तर (User Interface Guard):' : 'UI Guard:'}
                </div>
                <p className="text-[11px] text-slate-400">
                  {isMr
                    ? 'किचन लॉगिन असताना सर्व ॲक्शन बटणे अक्षम (Disabled) असतात आणि "🔒 केवळ वाचन (Read-Only)" असा बॅज दिसतो.'
                    : 'When logged in as Kitchen, all action buttons are disabled with a "🔒 Read-Only" badge, preventing accidental status mutations.'}
                </p>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-sky-400 font-mono text-[11px] mb-1 font-bold">
                  {isMr ? 'Supabase Row Level Security (RLS) पॉलिसी:' : 'Postgres Supabase RLS Policy:'}
                </div>
                <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto whitespace-pre p-1">
{`-- Only Owner and Manager can UPDATE bookings
CREATE POLICY "Only Owner and Manager can update booking status"
ON public.bookings FOR UPDATE
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_staff_role() IN ('owner', 'manager')
);`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl text-xs transition"
          >
            {isMr ? 'समजले (Close Guide)' : 'Got It (Close Guide)'}
          </button>
        </div>
      </div>
    </div>
  );
}
