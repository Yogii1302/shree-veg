'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MarigoldToran } from '@/components/marigold-toran';
import { Utensils, Shield, HeartPulse, Sparkles, MapPin, Star, Globe } from 'lucide-react';

type Lang = 'en' | 'hi' | 'mr';

const CONTENT = {
  en: {
    rating: '4.6 Google Ratings (989+ Reviews)',
    title: 'Shree Pure Veg',
    subtitle: 'Authentic Satvik Dining • Theur Phata, Pune',
    location: 'Theur Phata, Kunjirwadi, Pune-Solapur Highway (Pune 412201)',
    pilgrimage: 'Welcoming Chintamani Ganpati Pilgrims & Highway Travelers',
    satvik: '100% Pure Satvik Vegetarian • No Onion-Garlic Options Available',
    bookBtn: 'Reserve a Table / Order Ahead',
    bookSub: 'Fast confirmation via WhatsApp & SMS',
    adminBtn: 'Staff & Manager Portal',
    adminSub: 'Live token board, kitchen view & seat dispatch',
    healthBtn: 'System Health Check (/api/health)',
    tagline: 'Mandir Heritage, Modern Dining • Next.js App Router + TypeScript',
  },
  hi: {
    rating: '४.६ Google Ratings (९८९+ समीक्षाएं)',
    title: 'श्री प्योर वेज',
    subtitle: 'Shree Pure Veg • थेऊर फाटा, पुणे',
    location: 'थेऊर फाटा, कुंजीरवाड़ी, पुणे-सोलापूर महामार्ग (पुणे ४१२२०१)',
    pilgrimage: 'चिंतामणि गणपति तीर्थयात्री व राजमार्ग पारिवारिक भोजनालय',
    satvik: '१००% शुद्ध सात्विक शाकाहारी • बिना प्याज-लहसुन विकल्प उपलब्ध',
    bookBtn: 'अतिथि टेबल आरक्षण (Guest Booking)',
    bookSub: 'व्हाट्सएप व एसएमएस द्वारा त्वरित पुष्टि',
    adminBtn: 'कर्मचारी व प्रबंधक पोर्टल (Staff Portal)',
    adminSub: 'लाइव टोकन बोर्ड, रसोई प्रबंधन व सीट आवंटन',
    healthBtn: 'सिस्टम स्वास्थ्य जांच (/api/health)',
    tagline: 'मंदिर विरासत, आधुनिक भोजन • Next.js App Router + TypeScript',
  },
  mr: {
    rating: '४.६ Google Ratings (९८९+ परीक्षणे)',
    title: 'श्री प्युअर व्हेज',
    subtitle: 'Shree Pure Veg • थेऊर फाटा, पुणे',
    location: 'थेऊर फाटा, कुंजीरवाडी, पुणे-सोलापूर महामार्ग (पुणे ४१२२०१)',
    pilgrimage: 'चिंतामणी गणपती भाविक व महामार्ग कौटुंबिक उपहारगृह',
    satvik: '१००% शुद्ध सात्विक शाकाहारी • विना कांदा-लसूण पर्याय उपलब्ध',
    bookBtn: 'ग्राहक आरक्षण (Guest Booking - /book)',
    bookSub: 'व्हॉट्सअ‍ॅप व एसएमएस द्वारे तत्काळ पुष्टी',
    adminBtn: 'कर्मचारी पोर्टल (Staff Portal - /admin)',
    adminSub: 'थेट टोकन बोर्ड, किचन व्यवस्थापन व आसन वाटप',
    healthBtn: 'डेटाबेस तपासणी (Health Check - /api/health)',
    tagline: 'मांडव वारसा, आधुनिक मेनू • Next.js App Router + TypeScript',
  },
};

export default function HomePage() {
  const [lang, setLang] = useState<Lang>('en');

  // Read cookie on mount, default to 'en'
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)shree_booking_locale=([^;]+)/);
      if (match && (match[1] === 'mr' || match[1] === 'hi' || match[1] === 'en')) {
        setLang(match[1] as Lang);
      }
    }
  }, []);

  const handleLanguageChange = (nextLang: Lang) => {
    setLang(nextLang);
    if (typeof document !== 'undefined') {
      document.cookie = `shree_booking_locale=${nextLang}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  const c = CONTENT[lang];

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col items-center justify-center font-body selection:bg-marigold selection:text-primary">
      <div className="w-full max-w-lg mx-auto bg-surface border border-brass/30 rounded-t-[3rem] rounded-b-3xl shadow-xl overflow-hidden relative">
        {/* Signature Marigold Toran Garland */}
        <MarigoldToran />

        <div className="p-6 sm:p-8 text-center flex flex-col items-center">
          {/* Top Bar with Language Switcher */}
          <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-brass/20">
            <div className="flex items-center gap-1.5 text-xs text-muted font-bold">
              <Globe className="w-3.5 h-3.5 text-marigold" />
              <span>Language:</span>
            </div>
            <div
              className="inline-flex rounded-xl p-0.5 bg-sand border border-brass/40 shadow-inner"
              role="group"
              aria-label="Language Switcher"
            >
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`tap-target px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  lang === 'en'
                    ? 'bg-marigold text-primary shadow-sm font-black'
                    : 'text-muted hover:text-primary'
                }`}
                aria-pressed={lang === 'en'}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('hi')}
                className={`tap-target px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  lang === 'hi'
                    ? 'bg-marigold text-primary shadow-sm font-black'
                    : 'text-muted hover:text-primary'
                }`}
                aria-pressed={lang === 'hi'}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('mr')}
                className={`tap-target px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  lang === 'mr'
                    ? 'bg-marigold text-primary shadow-sm font-black'
                    : 'text-muted hover:text-primary'
                }`}
                aria-pressed={lang === 'mr'}
              >
                मराठी
              </button>
            </div>
          </div>

          {/* Temple Arch Diya Emblem */}
          <div className="w-16 h-16 rounded-full bg-sand border-2 border-brass flex items-center justify-center text-3xl shadow-md mb-3 text-brass">
            🪔
          </div>

          {/* Google Reviews Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sand text-primary rounded-full text-xs font-bold border border-brass/40 mb-3 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-marigold text-marigold" />
            <span>{c.rating}</span>
          </div>

          {/* Restaurant Heading */}
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-primary tracking-wide">
            {c.title}
          </h1>
          <h2 className="font-body text-sm sm:text-base font-bold text-muted mt-0.5 tracking-wider">
            {c.subtitle}
          </h2>

          <div className="mt-3 flex items-start justify-center gap-1.5 text-xs text-muted max-w-sm">
            <MapPin className="w-4 h-4 text-alert shrink-0 mt-0.5" />
            <span>
              {c.location}
              <br />
              <strong className="text-primary font-bold">
                {c.pilgrimage}
              </strong>
            </span>
          </div>

          {/* Satvik Assurance Pill */}
          <div className="mt-4 px-3.5 py-1.5 rounded-full bg-tulsi/10 border border-tulsi/30 text-tulsi text-xs font-bold inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-tulsi" />
            <span>{c.satvik}</span>
          </div>

          {/* Navigation Buttons */}
          <div className="mt-8 w-full flex flex-col gap-3">
            <Link
              href="/book"
              className="min-h-[52px] w-full py-3.5 px-6 rounded-2xl bg-marigold hover:bg-marigold-hover text-primary font-black text-base shadow-lg shadow-marigold/25 transition active:scale-[0.99] flex flex-col items-center justify-center tap-target focus-visible:ring-2 focus-visible:ring-marigold"
            >
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary" />
                <span>{c.bookBtn}</span>
              </div>
              <span className="text-[11px] font-normal opacity-85">{c.bookSub}</span>
            </Link>

            <Link
              href="/admin"
              className="min-h-[52px] w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-indigo-900 text-white font-bold text-base shadow-md transition active:scale-[0.99] flex flex-col items-center justify-center border border-brass/40 tap-target focus-visible:ring-2 focus-visible:ring-brass"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-marigold" />
                <span>{c.adminBtn}</span>
              </div>
              <span className="text-[11px] font-normal text-sand/80">{c.adminSub}</span>
            </Link>

            <Link
              href="/api/health"
              target="_blank"
              className="min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-sand hover:bg-amber-100 text-primary font-semibold text-xs transition flex items-center justify-center gap-2 border border-brass/30 tap-target"
            >
              <HeartPulse className="w-4 h-4 text-tulsi" />
              <span>{c.healthBtn}</span>
            </Link>
          </div>

          <div className="mt-6 text-[11px] text-muted border-t border-brass/20 pt-4 w-full">
            {c.tagline}
          </div>
        </div>
      </div>
    </div>
  );
}
