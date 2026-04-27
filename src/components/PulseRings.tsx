"use client";
// Contact page – concentric breathing rings that follow mouse
import { useEffect, useRef, useCallback } from "react";

interface Ring { birth: number; }

export default function PulseRings() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const rafRef    = useRef<number>(0);
  const ringsRef  = useRef<Ring[]>([]);
  const timeRef   = useRef(0);
  const lastSpawn = useRef(0);

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
    const t  = (timeRef.current += 1);

    // Spawn new ring every 60 frames
    if (t - lastSpawn.current > 60) {
      ringsRef.current.push({ birth: t });
      lastSpawn.current = t;
      if (ringsRef.current.length > 16) ringsRef.current.shift();
    }

    ctx.clearRect(0, 0, W, H);

    // Static background rings centred on page
    const cx = W / 2, cy = H / 2;
    for (let i = 1; i <= 8; i++) {
      const pulse = 1 + 0.03 * Math.sin(t * 0.025 + i);
      ctx.beginPath();
      ctx.arc(cx, cy, (70 * i) * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139,92,246,${(0.04 + 0.01 * (9 - i)).toFixed(2)})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Mouse-following expanding rings
    if (mx > 0) {
      for (const ring of ringsRef.current) {
        const age  = t - ring.birth;
        const maxAge = 640;
        if (age > maxAge) continue;
        const progress = age / maxAge;
        const r = progress * 200;
        const a = (1 - progress) * 0.35;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56,189,248,${a.toFixed(2)})`;
        ctx.lineWidth = 1 - progress * 0.8;
        ctx.stroke();
      }

      // glowing cursor dot
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(139,92,246,0.7)";
      ctx.fill();
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
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onLeave);
    window.addEventListener("touchcancel", onLeave);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onLeave);
      window.removeEventListener("touchcancel", onLeave);
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
