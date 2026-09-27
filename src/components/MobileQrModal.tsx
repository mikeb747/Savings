import React, { useState } from 'react';
import { Smartphone, QrCode, Copy, Check, X, ExternalLink, Share, Download, Globe } from 'lucide-react';
import { APP_VERSION, GITHUB_PAGES_URL } from '../config/version';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileQrModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Compute the accurate full URL (preventing origin-only truncation on GitHub Pages)
  const getInitialUrl = (): string => {
    if (typeof window !== 'undefined') {
      const { hostname, origin, pathname } = window.location;
      // If we are on GitHub Pages (e.g. mikeb747.github.io), always include /Savings/
      if (hostname.includes('github.io')) {
        const path = pathname.startsWith('/Savings') ? pathname : '/Savings/';
        return `${origin}${path.endsWith('/') ? path : path + '/'}`;
      }
      // If previewing in AI Studio or localhost, use current URL or default to GitHub Pages
      if (hostname.includes('europe-west2.run.app') || hostname === 'localhost' || hostname === '0.0.0.0') {
        // Return GitHub Pages URL so scanning on phone takes user to their public deployed site!
        return GITHUB_PAGES_URL;
      }
      return `${origin}${pathname}`;
    }
    return GITHUB_PAGES_URL;
  };

  const [activeUrl, setActiveUrl] = useState<string>(getInitialUrl);

  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    activeUrl,
  )}&bgcolor=0f172a&color=10b981&margin=2`;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeUrl);
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
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-100">Open on Your Phone</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md">
                  {APP_VERSION}
                </span>
              </div>
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

          {/* URL Switcher / Selector */}
          <div className="w-full flex items-center justify-between text-xs px-1">
            <span className="text-slate-400 text-[11px] font-medium">Target URL:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveUrl(GITHUB_PAGES_URL)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  activeUrl === GITHUB_PAGES_URL
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
                }`}
              >
                GitHub Pages
              </button>
              {typeof window !== 'undefined' && !window.location.hostname.includes('github.io') && (
                <button
                  type="button"
                  onClick={() => setActiveUrl(window.location.href)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    activeUrl !== GITHUB_PAGES_URL
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
                  }`}
                >
                  Dev Preview
                </button>
              )}
            </div>
          </div>

          {/* Copy Link Button */}
          <div className="w-full flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={activeUrl}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 font-medium truncate focus:outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0 shadow-sm shadow-emerald-950"
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
