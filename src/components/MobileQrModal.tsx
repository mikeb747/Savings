import React, { useState } from 'react';
import { Smartphone, QrCode, Copy, Check, X, ExternalLink, Share, Download } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileQrModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://ais-pre-v2hrf6yj7lzypxdyabuz76-921731801345.europe-west2.run.app';

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    currentUrl,
  )}&bgcolor=0f172a&color=10b981&margin=2`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Open on Your Phone</h3>
              <p className="text-xs text-slate-400">Scan QR or copy the PWA link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center text-center space-y-4">
          {/* QR Code Container */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-emerald-500/30 shadow-lg shadow-black/50 relative group">
            <img
              src={qrImageUrl}
              alt="Scan to open on mobile"
              className="w-48 h-48 rounded-xl object-contain"
            />
            <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center justify-center gap-1">
              <QrCode className="w-3 h-3 text-emerald-400" />
              <span>Point phone camera to scan</span>
            </div>
          </div>

          {/* Copy Link Button */}
          <div className="w-full flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 truncate focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
              title="Copy URL"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* PWA Home Screen Instructions */}
          <div className="w-full text-left bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs text-slate-300">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Install to Home Screen:</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>
                  <strong>iPhone (Safari):</strong> Tap Share (<Share className="w-3 h-3 inline text-slate-300" />) then select <em>Add to Home Screen</em>.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>
                  <strong>Android (Chrome):</strong> Tap the <em>Install App</em> prompt or menu (⋮) → <em>Install app</em>.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
