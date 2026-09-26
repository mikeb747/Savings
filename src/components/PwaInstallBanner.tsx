import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture standard PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="relative mx-auto max-w-xl mb-4 p-3 bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-slate-900 rounded-2xl border border-emerald-500/30 shadow-lg shadow-black/30 flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-400">
          <Download className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
            <span>Install Savings App</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              PWA
            </span>
          </div>
          <p className="text-slate-400 text-[11px] mt-0.5">
            {isIOS
              ? 'Tap Share ⎋ then "Add to Home Screen" for instant mobile access.'
              : 'Add to your home screen for quick offline access and real-time tracking.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
          >
            Install
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
