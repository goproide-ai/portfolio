"use client";

import { useEffect, useRef, useCallback } from "react";

interface Props {
  theme?: "black" | "white";
}

export default function InteractiveGrid({ theme = "black" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -2000, y: -2000 });
  const rafRef   = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width  / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const S  = 16;   // grid spacing — very dense
    const R  = 200;  // mouse influence radius

    const isWhite = theme === "white";
    const lineBase   = isWhite ? "rgba(80,60,180,"  : "rgba(139,92,246,";
    const lineBase2  = isWhite ? "rgba(20,120,180," : "rgba(56,189,248,";
    const dotColor   = isWhite ? "rgba(80,60,180,"  : "rgba(139,92,246,";
    const crossColor = isWhite ? "rgba(80,60,180,"  : "rgba(139,92,246,";
    const coordColor = isWhite ? "rgba(80,60,180,"  : "rgba(139,92,246,";

    ctx.clearRect(0, 0, W, H);

    // vertical lines
    for (let x = 0; x <= W; x += S) {
      ctx.beginPath();
      for (let y = 0; y <= H; y += 3) {
        const dx = x - mx, dy = y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inf  = Math.max(0, 1 - dist / R);
        const ox   = inf * Math.sin(dy * 0.025) * 12;
        const oy   = inf * Math.cos(dx * 0.025) * 6;
        y === 0 ? ctx.moveTo(x + ox, y + oy) : ctx.lineTo(x + ox, y + oy);
      }
      const col = Math.max(0, 1 - Math.abs(x - mx) / R);
      ctx.strokeStyle = `${lineBase}${(0.07 + col * 0.18).toFixed(2)})`;
      ctx.lineWidth = 0.4 + col * 0.5;
      ctx.stroke();
    }

    // horizontal lines
    for (let y = 0; y <= H; y += S) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const dx = x - mx, dy = y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inf  = Math.max(0, 1 - dist / R);
        const ox   = inf * Math.sin(dy * 0.025) * 12;
        const oy   = inf * Math.cos(dx * 0.025) * 6;
        x === 0 ? ctx.moveTo(x + ox, y + oy) : ctx.lineTo(x + ox, y + oy);
      }
      const col = Math.max(0, 1 - Math.abs(y - my) / R);
      ctx.strokeStyle = `${lineBase2}${(0.07 + col * 0.18).toFixed(2)})`;
      ctx.lineWidth = 0.4 + col * 0.5;
      ctx.stroke();
    }

    // intersection dots
    for (let x = 0; x <= W; x += S) {
      for (let y = 0; y <= H; y += S) {
        const dx = x - mx, dy = y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inf  = Math.max(0, 1 - dist / R);
        if (inf < 0.02) continue;
        const ox = inf * Math.sin(dy * 0.025) * 12;
        const oy = inf * Math.cos(dx * 0.025) * 6;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, 1 + inf * 2, 0, Math.PI * 2);
        ctx.fillStyle = `${dotColor}${(0.08 + inf * 0.65).toFixed(2)})`;
        ctx.fill();
      }
    }

    // crosshair + coords
    if (mx > 0 && my > 0) {
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = `${crossColor}0.12)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(mx, 0); ctx.lineTo(mx, H);
      ctx.moveTo(0, my); ctx.lineTo(W, my);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "8px monospace";
      ctx.fillStyle = `${coordColor}0.4)`;
      ctx.fillText(`x:${Math.round(mx)} y:${Math.round(my)}`, mx + 12, my - 8);
      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };

    const onMove  = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = ()               => { mouseRef.current = { x: -2000, y: -2000 }; };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchEnd = () => { mouseRef.current = { x: -2000, y: -2000 }; };

    resize();
    window.addEventListener("resize",    resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove",  onTouch, { passive: true });
    window.addEventListener("touchend",   onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize",    resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove",  onTouch);
      window.removeEventListener("touchend",   onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
