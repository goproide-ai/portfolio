"use client";
// News page – subtle TV-static noise + scan lines on mouse hover
import { useEffect, useRef, useCallback } from "react";

export default function StaticNoise() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const rafRef    = useRef<number>(0);
  const frameRef  = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width  / dpr;
    const H = canvas.height / dpr;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const frame = (frameRef.current += 1);

    // Only redraw every 3 frames for performance
    if (frame % 3 !== 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, W, H);

    const SPACING = 14;
    const R = 350;

    // Vertical grid lines
    for (let x = 0; x < W; x += SPACING) {
      const dx = x - mx;
      const dist = Math.abs(dx);
      const near = Math.max(0, 1 - dist / R);
      const a = 0.03 + near * 0.08;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.strokeStyle = `rgba(139,92,246,${a.toFixed(3)})`;
      ctx.lineWidth = 0.5 + near * 0.5;
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let y = 0; y < H; y += SPACING) {
      const dy = y - my;
      const dist = Math.abs(dy);
      const near = Math.max(0, 1 - dist / R);
      const a = 0.03 + near * 0.08;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.strokeStyle = `rgba(56,189,248,${a.toFixed(3)})`;
      ctx.lineWidth = 0.5 + near * 0.5;
      ctx.stroke();
    }

    // Intersection dots — only near mouse, reactive size
    if (mx > 0) {
      const DOT_R = 200;
      const startX = Math.max(0, Math.floor((mx - DOT_R) / SPACING) * SPACING);
      const endX = Math.min(W, mx + DOT_R);
      const startY = Math.max(0, Math.floor((my - DOT_R) / SPACING) * SPACING);
      const endY = Math.min(H, my + DOT_R);
      for (let x = startX; x <= endX; x += SPACING) {
        for (let y = startY; y <= endY; y += SPACING) {
          const dx = x - mx, dy = y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < DOT_R) {
            const near = 1 - dist / DOT_R;
            ctx.beginPath();
            ctx.arc(x, y, 0.5 + near * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(139,92,246,${(near * 0.6).toFixed(3)})`;
            ctx.fill();
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = document.body.scrollHeight * dpr;
      canvas.style.width  = `${window.innerWidth}px`;
      canvas.style.height = `${document.body.scrollHeight}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };

    const onMove  = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = ()               => { mouseRef.current = { x: -9999, y: -9999 }; };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
