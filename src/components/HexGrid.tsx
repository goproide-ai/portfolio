"use client";
// Works page – hexagonal grid that ripples on mouse move
import { useEffect, useRef, useCallback } from "react";

export default function HexGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const rafRef    = useRef<number>(0);
  const timeRef   = useRef(0);

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
    const t  = (timeRef.current += 0.012);
    const R  = 28;
    const hx = R * Math.sqrt(3);
    const hy = R * 1.5;

    ctx.clearRect(0, 0, W, H);

    for (let row = -1; row * hy < H + hy; row++) {
      for (let col = -1; col * hx < W + hx; col++) {
        const cx = col * hx + (row % 2 === 0 ? 0 : hx / 2);
        const cy = row * hy;
        const dx = cx - mx, dy = cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wave = Math.sin(dist * 0.04 - t) * 0.5 + 0.5;
        const inf  = Math.max(0, 1 - dist / 260) * 0.7 + wave * 0.1;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 180) * (60 * i - 30);
          const px = cx + R * 0.88 * Math.cos(angle);
          const py = cy + R * 0.88 * Math.sin(angle);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(139,92,246,${(0.04 + inf * 0.22).toFixed(2)})`;
        ctx.lineWidth = 0.5 + inf * 0.5;
        ctx.stroke();
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
