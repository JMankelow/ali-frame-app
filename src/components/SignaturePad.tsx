// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useEffect, useRef } from "react";

/** Finger/mouse signature pad. Stores a PNG data URL via onChange ("" when cleared) and redraws an existing one. */
export function SignaturePad({ value, onChange, disabled, invalid }: { value: string; onChange: (v: string) => void; disabled?: boolean; invalid?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const loaded = useRef(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const d = window.devicePixelRatio || 1;
    c.width = r.width * d;
    c.height = r.height * d;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b1f4a";
    if (value && !loaded.current) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height);
      img.src = value;
      loaded.current = true;
    }
  }, [value]);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  return (
    <div>
      <div style={{ position: "relative", border: `1.5px dashed ${invalid ? "#dc2626" : "var(--line)"}`, borderRadius: 8, background: "#fff", opacity: disabled ? 0.7 : 1 }}>
        <canvas
          ref={ref}
          aria-label="Signature pad"
          style={{ display: "block", width: "100%", height: 130, touchAction: "none", cursor: disabled ? "default" : "crosshair" }}
          onPointerDown={(e) => {
            if (disabled) return;
            e.preventDefault();
            ref.current!.setPointerCapture(e.pointerId);
            drawing.current = true;
            const ctx = ref.current!.getContext("2d")!;
            const [x, y] = pos(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 0.1, y + 0.1);
            ctx.stroke();
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = ref.current!.getContext("2d")!;
            const [x, y] = pos(e);
            ctx.lineTo(x, y);
            ctx.stroke();
          }}
          onPointerUp={() => {
            if (!drawing.current) return;
            drawing.current = false;
            onChange(ref.current!.toDataURL("image/png"));
          }}
          onPointerCancel={() => { drawing.current = false; }}
        />
        {!value && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#667085", pointerEvents: "none" }}>Sign here with your finger or mouse</div>}
      </div>
      {!disabled && (
        <div style={{ textAlign: "right", marginTop: 6 }}>
          <button
            type="button"
            className="btn light"
            onClick={() => {
              const c = ref.current!;
              c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
              loaded.current = true;
              onChange("");
            }}
          >
            Clear signature
          </button>
        </div>
      )}
    </div>
  );
}
