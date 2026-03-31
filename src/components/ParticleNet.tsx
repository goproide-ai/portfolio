"use client";
// About page – floating particle network (dots connected by lines when close)
import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
}

export default function ParticleNet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const rafRef    = useRef<number>(0);
  const pRef      = useRef<Particle[]>([]);

  const init = useCallback((w: number, h: number) => {
    pRef.current = Array.from({ length: 300 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const LINK = 120;

    ctx.clearRect(0, 0, W, H);

    const pts = pRef.current;
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    }

    // draw links
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > LINK) continue;
        const a = 1 - d / LINK;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.strokeStyle = `rgba(139,92,246,${(a * 0.25).toFixed(2)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      // mouse links
      const dxm = pts[i].x - mx, dym = pts[i].y - my;
      const dm  = Math.sqrt(dxm * dxm + dym * dym);
      if (dm < 160) {
        const a = 1 - dm / 160;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(mx, my);
        ctx.strokeStyle = `rgba(56,189,248,${(a * 0.5).toFixed(2)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    // draw dots
    for (const p of pts) {
      const dxm = p.x - mx, dym = p.y - my;
      const dm  = Math.sqrt(dxm * dxm + dym * dym);
      const near = Math.max(0, 1 - dm / 160);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5 + near * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139,92,246,${(0.25 + near * 0.6).toFixed(2)})`;
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
      init(window.innerWidth, document.body.scrollHeight);
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
  }, [draw, init]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
