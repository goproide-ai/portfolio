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

    // scattered noise pixels
    const density = 1200;
    for (let i = 0; i < density; i++) {
      const x  = Math.random() * W;
      const y  = Math.random() * H;
      const dx = x - mx, dy = y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const near = Math.max(0, 1 - dist / 300);
      const a  = (0.01 + near * 0.06) * Math.random();
      ctx.fillStyle = `rgba(139,92,246,${a.toFixed(3)})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // horizontal scan line near mouse
    if (my > 0) {
      const scan = Math.sin(frame * 0.04) * 40;
      ctx.fillStyle = "rgba(56,189,248,0.03)";
      ctx.fillRect(0, my + scan - 1, W, 2);
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

    const onMove  = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY + window.scrollY }; };
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
