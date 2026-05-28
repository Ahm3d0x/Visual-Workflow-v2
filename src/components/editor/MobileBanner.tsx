'use client';

import { useState } from 'react';
import { Monitor, X } from 'lucide-react';

export function MobileBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-[999] flex items-center justify-between gap-3 bg-zinc-900/85 backdrop-blur-md border border-zinc-800/80 px-4 py-3 rounded-2xl shadow-xl animate-in slide-in-from-top-4 duration-300 select-none">
      <div className="flex items-center gap-2.5 text-left">
        <div className="p-2 rounded-xl bg-accent/15 text-accent shrink-0">
          <Monitor className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-zinc-100 font-sans">Read-Only Presentation Mode</h4>
          <p className="text-[10px] text-zinc-400 font-light font-sans mt-0.5 leading-relaxed">
            Editing is optimized for desktop or tablet screens. You can review comments and inspect nodes here.
          </p>
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors cursor-pointer focus:outline-hidden"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
