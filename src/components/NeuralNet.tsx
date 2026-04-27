"use client";
// AI Design page — particles: follow mouse while moving, orbit elegantly when still
import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;         // base dot radius
  alpha: number;        // visual opacity (target)
  alphaCur: number;     // current smoothed alpha
  hue: number;          // 0=purple, 1=sky
  orbitAngle: number;   // current angle around mouse (for orbit)
  orbitR: number;       // orbit radius assigned at orbit-start
  orbitSpeed: number;   // rad/frame
  inOrbit: boolean;     // is this particle currently orbiting?
}

export default function NeuralNet() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const mouseRef    = useRef({ x: -9999, y: -9999 });
  const prevMouse   = useRef({ x: -9999, y: -9999 });
  const stillCount  = useRef(0);
  const isOrbiting  = useRef(false);
  const rafRef      = useRef<number>(0);
  const psRef       = useRef<Particle[]>([]);
  const timeRef     = useRef(0);

  const init = useCallback((w: number, h: number) => {
    psRef.current = Array.from({ length: 390 }, () => {
      // Varied sizes: 60% tiny, 25% medium, 15% large
      const r = Math.random();
      const size = r < 0.6 ? 0.6 + Math.random() * 0.8
                 : r < 0.85 ? 1.4 + Math.random() * 1.4
                 : 2.8 + Math.random() * 2.0;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size,
        alpha: 0.08 + Math.random() * 0.12,
        alphaCur: 0,
        hue: Math.random(),
        orbitAngle: Math.random() * Math.PI * 2,
        orbitR: 30 + Math.random() * 70,
        orbitSpeed: (0.005 + Math.random() * 0.012) * (Math.random() < 0.5 ? 1 : -1),
        inOrbit: false,
      };
    });
  }, []);

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

    ctx.clearRect(0, 0, W, H);

    const ps = psRef.current;
    const ACTIVE = mx > 0 && mx < W + 200 && my > 0;

    // ── Detect mouse still / moving ───────────────────────────────
    const moved = Math.sqrt(
      (mx - prevMouse.current.x) ** 2 + (my - prevMouse.current.y) ** 2
    );

    if (moved > 3.5) {
      stillCount.current  = 0;
      // Exit orbit → back to follow
      if (isOrbiting.current) {
        isOrbiting.current = false;
        for (const p of ps) p.inOrbit = false;
      }
    } else if (ACTIVE) {
      stillCount.current++;
    }
    prevMouse.current = { x: mx, y: my };

    // ── Enter orbit when mouse stops (25 frames still) ────────────
    if (stillCount.current === 25 && ACTIVE && !isOrbiting.current) {
      isOrbiting.current = true;
      const ORBIT_R_MAX = 380;
      for (const p of ps) {
        const dx   = p.x - mx;
        const dy   = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > ORBIT_R_MAX) continue;
        // Assign orbit params based on current position
        p.orbitAngle = Math.atan2(dy, dx);
        p.orbitR     = Math.max(22, Math.min(130, dist * 0.75 + 15));
        p.orbitSpeed = (0.006 + Math.random() * 0.010) * (Math.random() < 0.5 ? 1 : -1);
        p.inOrbit    = true;
      }
    }

    // ── Update particles ──────────────────────────────────────────
    const FOLLOW_R  = 360;
    const FRICTION  = 0.90;
    const SPRING    = 0.038;

    for (const p of ps) {
      if (ACTIVE && p.inOrbit && isOrbiting.current) {
        // ── ORBIT mode: spring toward circular target ─────────────
        p.orbitAngle += p.orbitSpeed;
        const tx = mx + Math.cos(p.orbitAngle) * p.orbitR;
        const ty = my + Math.sin(p.orbitAngle) * p.orbitR;
        p.vx += (tx - p.x) * SPRING;
        p.vy += (ty - p.y) * SPRING;
        p.alpha = 0.55 + 0.25 * Math.sin(t * 2 + p.orbitAngle);
      } else if (ACTIVE && !isOrbiting.current) {
        // ── FOLLOW mode: gentle attraction to mouse ───────────────
        const dx   = mx - p.x;
        const dy   = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < FOLLOW_R && dist > 0) {
          const force = Math.pow(1 - dist / FOLLOW_R, 1.8) * 0.55;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
          const nearness = 1 - dist / FOLLOW_R;
          p.alpha = 0.15 + nearness * 0.55;
        } else {
          p.alpha = 0.10 + Math.random() * 0.05;
        }
      } else {
        // ── AMBIENT mode ──────────────────────────────────────────
        p.inOrbit = false;
        p.alpha   = 0.10 + 0.06 * Math.sin(t * 0.8 + p.orbitAngle);
        // gentle re-introduce small drift
        if (Math.abs(p.vx) < 0.12 && Math.abs(p.vy) < 0.12) {
          p.vx += (Math.random() - 0.5) * 0.025;
          p.vy += (Math.random() - 0.5) * 0.025;
        }
      }

      p.vx *= FRICTION;
      p.vy *= FRICTION;
      p.x  += p.vx;
      p.y  += p.vy;

      // Smooth alpha
      p.alphaCur += (p.alpha - p.alphaCur) * 0.06;

      // Bounce edges
      if (p.x < 0)  { p.x = 0;  p.vx =  Math.abs(p.vx); }
      if (p.x > W)  { p.x = W;  p.vx = -Math.abs(p.vx); }
      if (p.y < 0)  { p.y = 0;  p.vy =  Math.abs(p.vy); }
      if (p.y > H)  { p.y = H;  p.vy = -Math.abs(p.vy); }
    }

    // ── Draw particles ────────────────────────────────────────────
    for (const p of ps) {
      const a = Math.max(0, Math.min(1, p.alphaCur));
      if (a < 0.01) continue;

      const isPurple = p.hue < 0.55;
      const bright   = p.inOrbit && isOrbiting.current;

      // Soft glow halo (only when visible enough)
      if (a > 0.2) {
        const glowR = p.size * (2.5 + a * 5);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        g.addColorStop(0,   isPurple
          ? `rgba(139,92,246,${(a * 0.45).toFixed(2)})`
          : `rgba(56,189,248,${(a * 0.45).toFixed(2)})`);
        g.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (bright ? 1.4 : 1), 0, Math.PI * 2);
      ctx.fillStyle = bright
        ? `rgba(210,200,255,${(a * 0.95).toFixed(2)})`
        : isPurple
          ? `rgba(160,120,255,${(a * 0.85).toFixed(2)})`
          : `rgba(80,200,240,${(a * 0.85).toFixed(2)})`;
      ctx.fill();
    }

    // ── Subtle cursor ring when orbiting ─────────────────────────
    if (ACTIVE && isOrbiting.current) {
      const pulse = 0.3 + 0.2 * Math.sin(t * 2.5);
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139,92,246,${pulse.toFixed(2)})`;
      ctx.lineWidth   = 0.8;
      ctx.stroke();
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

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => {
      mouseRef.current  = { x: -9999, y: -9999 };
      stillCount.current = 0;
      isOrbiting.current = false;
      for (const p of psRef.current) p.inOrbit = false;
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
    };

    resize();
    window.addEventListener("resize",     resize);
    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove",  onTouch, { passive: true });
    window.addEventListener("touchend",   onLeave);
    window.addEventListener("touchcancel", onLeave);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize",     resize);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove",  onTouch);
      window.removeEventListener("touchend",   onLeave);
      window.removeEventListener("touchcancel", onLeave);
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
