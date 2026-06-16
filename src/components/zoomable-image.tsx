"use client";

import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

// 画像をタップで全画面ズーム表示する。スキャン図の文字が小さいスマホ向け。
// タップで拡大/2倍切替、背景タップ・×で閉じる。
export default function ZoomableImage({
  src,
  alt,
  className,
  hint = true,
}: {
  src: string;
  alt: string;
  className?: string;
  hint?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      {hint && (
        <p className="mb-1 flex items-center gap-1 text-xs text-gray-400">
          <ZoomIn className="w-3.5 h-3.5" /> 画像をタップで拡大
        </p>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => { setOpen(true); setZoomed(false); }}
        className={`${className ?? ""} cursor-zoom-in`}
      />

      {open && (
        <div
          className="fixed inset-0 z-[60] overflow-auto bg-black/90"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            aria-label="閉じる"
            className="fixed right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-gray-800 shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex min-h-full items-start justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
              className={zoomed ? "w-[200%] max-w-none cursor-zoom-out" : "w-full max-w-3xl cursor-zoom-in"}
            />
          </div>
          <p className="pointer-events-none fixed inset-x-0 bottom-3 text-center text-xs text-white/80">
            タップで拡大／縮小・背景タップで閉じる
          </p>
        </div>
      )}
    </>
  );
}
