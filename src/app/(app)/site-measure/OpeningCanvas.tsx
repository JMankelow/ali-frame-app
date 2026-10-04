"use client";

import { useCallback, useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
}
interface Stroke {
  kind: "line";
  color: string;
  points: Point[];
}
interface TextNote {
  kind: "text";
  color: string;
  x: number;
  y: number;
  text: string;
}
type Item = Stroke | TextNote;

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#eef2f7";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, w - 60, h - 60);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px Arial";
  ctx.fillText("Sketch this opening", 12, 16);
}

/** Freehand sketch canvas for one opening — ported from the prototype's smOpeningBlock canvas logic. */
export function OpeningCanvas({
  id,
  color,
  tool = "line",
  registerRef,
}: {
  id: string;
  color: string;
  tool?: "line" | "text";
  registerRef: (id: string, el: HTMLCanvasElement | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Item[]>([]);
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const currentRef = useRef<Stroke | null>(null);
  const colorRef = useRef(color);
  colorRef.current = color;

  // Stable identity so the <canvas> ref callback below doesn't change on every
  // re-render — an inline arrow function there would make React call it with
  // (null) then (element) on every render, repeatedly churning the parent's
  // canvas registry.
  const setCanvasRef = useCallback(
    (el: HTMLCanvasElement | null) => {
      canvasRef.current = el;
      registerRef(id, el);
    },
    [id, registerRef]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    drawBackground(ctx, canvas.width, canvas.height);
  }, []);

  function drawStroke(ctx: CanvasRenderingContext2D, s: Item) {
    if (s.kind === "text") {
      ctx.fillStyle = s.color;
      ctx.font = "bold 18px Arial";
      ctx.textBaseline = "middle";
      ctx.fillText(s.text, s.x, s.y);
      return;
    }
    if (s.points.length < 2) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
  }

  function redraw() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    drawBackground(ctx, canvas.width, canvas.height);
    for (const s of strokesRef.current) drawStroke(ctx, s);
  }

  function markHasStrokes() {
    if (canvasRef.current) canvasRef.current.dataset.hasStrokes = strokesRef.current.length ? "1" : "0";
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  // Openings are straight edges, not freehand squiggles — every drag is
  // committed as a single straight line from where the pointer went down to
  // where it went up, rather than tracing the wobbly path in between.
  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const start = pos(e);
    if (toolRef.current === "text") {
      // Add Text: tap where the label should go, type it (e.g. a measurement or note).
      const text = window.prompt("Text to add to the sketch (e.g. 1200 x 900):");
      if (text && text.trim()) {
        strokesRef.current.push({ kind: "text", color: colorRef.current, x: start.x, y: start.y, text: text.trim().slice(0, 60) });
        markHasStrokes();
        redraw();
      }
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    currentRef.current = { kind: "line", color: colorRef.current, points: [start, start] };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!currentRef.current) return;
    e.preventDefault();
    const start = currentRef.current.points[0];
    currentRef.current.points = [start, pos(e)];

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    redraw();
    drawStroke(ctx, currentRef.current);
  }

  function handlePointerUp() {
    if (currentRef.current) strokesRef.current.push(currentRef.current);
    currentRef.current = null;
    markHasStrokes();
    redraw();
  }

  function removeLine() {
    strokesRef.current.pop();
    markHasStrokes();
    redraw();
  }

  function clear() {
    strokesRef.current = [];
    markHasStrokes();
    redraw();
  }

  return (
    <div>
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <canvas
          ref={setCanvasRef}
          id={id}
          width={600}
          height={420}
          style={{ width: "100%", display: "block", cursor: tool === "text" ? "text" : "crosshair", touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      <div className="actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn light" onClick={removeLine}>
          Undo Last
        </button>
        <button type="button" className="btn light" onClick={clear}>
          Clear Drawing
        </button>
      </div>
    </div>
  );
}
