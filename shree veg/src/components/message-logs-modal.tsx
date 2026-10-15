'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  X,
  RotateCw,
  Clock,
  Phone,
  CheckCheck,
  Check,
  AlertCircle,
  Send,
  ExternalLink,
} from 'lucide-react';
import { MessageLogRecord } from '@/lib/messaging/types';

interface MessageLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'en' | 'hi' | 'mr';
}

export function MessageLogsModal({
  isOpen,
  onClose,
  lang = 'en',
}: MessageLogsModalProps) {
  const [logs, setLogs] = useState<MessageLogRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/messaging/logs?limit=40');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to fetch message logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const kindLabels: Record<string, { mr: string; en: string; color: string }> = {
    guest_confirmed: {
      mr: 'आरक्षण पुष्टी (Confirmed)',
      en: 'Guest Confirmed',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    guest_rejected: {
      mr: 'आरक्षण नकार व पुढील स्लॉट (Rejected)',
      en: 'Guest Rejected (Next Slot)',
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    },
    guest_reminder: {
      mr: 'आरक्षण आठवण (Reminder)',
      en: 'Guest Reminder',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    owner_new_booking: {
      mr: 'मालक अलर्ट (Owner Alert)',
      en: 'Owner Alert',
      color: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full overflow-hidden text-slate-100 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {lang === 'mr' ? 'व्हॉट्सअॅप मेसेज लॉग (Message Log)' : 'WhatsApp Dispatch Logs'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'mr'
                  ? 'पाठवलेले आणि नोंदवलेले सर्व व्हॉट्सअॅप संदेश'
                  : 'All recorded messages from wa.me and Cloud API'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Refresh"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
              <p>{lang === 'mr' ? 'अद्याप कोणतेही संदेश नोंदवलेले नाहीत.' : 'No message logs found yet.'}</p>
              <p className="mt-1 text-[11px] text-slate-600">
                {lang === 'mr'
                  ? 'बुकिंग Accept, Reject किंवा Remind केल्यावर येथे नोंदी दिसतील.'
                  : 'Logs will appear here after Accept, Reject, or Remind actions.'}
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const kindCfg = kindLabels[log.message_type] || {
                mr: log.message_type,
                en: log.message_type,
                color: 'bg-slate-800 text-slate-300 border-slate-700',
              };

              const timeFormatted = new Date(log.created_at).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });
              const dateFormatted = new Date(log.created_at).toLocaleDateString('en-IN');

              return (
                <div
                  key={log.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${kindCfg.color}`}
                      >
                        {lang === 'mr' ? kindCfg.mr : kindCfg.en}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700">
                        {log.provider}
                      </span>
                      {log.payload?.tokenNumber && (
                        <span className="text-xs font-black text-amber-400 font-mono">
                          #{log.payload.tokenNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        {dateFormatted} {timeFormatted}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-mono font-bold">+{log.recipient_phone}</span>
                      {log.payload?.guestName && (
                        <span className="text-slate-400">({log.payload.guestName})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {log.status === 'read' ? (
                        <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" /> वाचले (Read)
                        </span>
                      ) : log.status === 'delivered' ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" /> पोहोचले (Delivered)
                        </span>
                      ) : log.status === 'sent' ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> पाठवले (Sent)
                        </span>
                      ) : log.status === 'failed' ? (
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> अयशस्वी (Failed)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {log.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {log.payload?.textPreview && (
                    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 text-[11px] font-mono text-slate-300 line-clamp-2">
                      {log.payload.textPreview}
                    </div>
                  )}

                  {log.payload?.waUrl && (
                    <div className="pt-1 flex justify-end">
                      <a
                        href={log.payload.waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                      >
                        <span>व्हॉट्सअॅप चॅट उघडा</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
          >
            {lang === 'mr' ? 'बंद करा' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
