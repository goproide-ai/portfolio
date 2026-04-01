"use client";
// About page – constellation effect: particles appear near mouse, form random star-pattern links
import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;      // current visual alpha
  alphaTarget: number; // target alpha
  seed: number;        // random seed for constellation grouping
}

export default function ParticleNet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const trailRef  = useRef<{ x: number; y: number; t: number }[]>([]);
  const rafRef    = useRef<number>(0);
  const pRef      = useRef<Particle[]>([]);
  const timeRef   = useRef(0);

  const init = useCallback((w: number, h: number) => {
    pRef.current = Array.from({ length: 600 }, () => {
      const r = Math.random();
      const size = r < 0.55 ? 0.4 + Math.random() * 0.6
                 : r < 0.85 ? 1.0 + Math.random() * 1.0
                 : 2.0 + Math.random() * 1.5;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size,
        alpha: 0,
        alphaTarget: 0,
        seed: Math.random(),
      };
    });
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
    const t = (timeRef.current += 0.008);
    const ACTIVE = mx > 0 && mx < W + 200 && my > 0;

    ctx.clearRect(0, 0, W, H);

    // Update mouse trail (keeps constellation visible for a moment)
    const now = performance.now();
    if (ACTIVE) {
      const last = trailRef.current[trailRef.current.length - 1];
      if (!last || Math.hypot(mx - last.x, my - last.y) > 30) {
        trailRef.current.push({ x: mx, y: my, t: now });
      }
    }
    // Fade trail points after 2.5s
    trailRef.current = trailRef.current.filter(p => now - p.t < 2500);

    const pts = pRef.current;
    const REVEAL_R = 280;
    const FADE_R = 350;

    // Move particles
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      // Check distance to mouse AND trail points
      let minDist = Infinity;
      if (ACTIVE) {
        minDist = Math.hypot(p.x - mx, p.y - my);
      }
      for (const tp of trailRef.current) {
        const fade = 1 - (now - tp.t) / 2500;
        const d = Math.hypot(p.x - tp.x, p.y - tp.y) / fade;
        if (d < minDist) minDist = d;
      }

      // Particles only visible near mouse/trail
      if (minDist < REVEAL_R) {
        const nearness = 1 - minDist / REVEAL_R;
        p.alphaTarget = 0.15 + nearness * 0.7;
      } else if (minDist < FADE_R) {
        p.alphaTarget = 0.04;
      } else {
        p.alphaTarget = 0;
      }

      // Smooth alpha transition
      p.alpha += (p.alphaTarget - p.alpha) * 0.08;
    }

    // Collect visible particles for constellation links
    const visible: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].alpha > 0.06) visible.push(i);
    }

    // Draw constellation links — connect particles in chain-like star patterns
    // Use seed-based grouping: particles with similar seeds form constellations
    const LINK_DIST = 120;
    const drawn = new Set<string>();

    ctx.lineWidth = 0.6;
    for (let vi = 0; vi < visible.length; vi++) {
      const i = visible[vi];
      const pi = pts[i];
      // Each particle connects to 1–2 nearest visible neighbors with compatible seed
      let connections = 0;
      const maxConn = pi.seed < 0.3 ? 1 : 2;

      // Find neighbors sorted by distance
      const neighbors: { idx: number; dist: number }[] = [];
      for (let vj = vi + 1; vj < visible.length; vj++) {
        const j = visible[vj];
        const dx = pi.x - pts[j].x;
        const dy = pi.y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK_DIST) {
          neighbors.push({ idx: j, dist: d });
        }
      }
      neighbors.sort((a, b) => a.dist - b.dist);

      for (const nb of neighbors) {
        if (connections >= maxConn) break;
        const j = nb.idx;
        const key = `${i}-${j}`;
        if (drawn.has(key)) continue;

        // Seed compatibility — creates random grouping pattern
        const seedDiff = Math.abs(pi.seed - pts[j].seed);
        if (seedDiff > 0.35 && seedDiff < 0.65) continue; // skip some for randomness

        drawn.add(key);
        connections++;

        const d = nb.dist;
        const a = (1 - d / LINK_DIST) * Math.min(pi.alpha, pts[j].alpha);
        const isPurple = (pi.seed + pts[j].seed) % 1 < 0.6;

        ctx.beginPath();
        ctx.moveTo(pi.x, pi.y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.strokeStyle = isPurple
          ? `rgba(139,92,246,${(a * 0.6).toFixed(2)})`
          : `rgba(56,189,248,${(a * 0.5).toFixed(2)})`;
        ctx.stroke();
      }
    }

    // Draw dots
    for (const p of pts) {
      if (p.alpha < 0.01) continue;
      const isPurple = p.seed < 0.6;

      // Glow for brighter particles
      if (p.alpha > 0.3) {
        const glowR = p.size * (3 + p.alpha * 4);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        g.addColorStop(0, isPurple
          ? `rgba(139,92,246,${(p.alpha * 0.3).toFixed(2)})`
          : `rgba(56,189,248,${(p.alpha * 0.3).toFixed(2)})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      // Twinkle effect
      const twinkle = 0.85 + 0.15 * Math.sin(t * 3 + p.seed * 50);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.8 + p.alpha * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = isPurple
        ? `rgba(180,150,255,${(p.alpha * twinkle * 0.9).toFixed(2)})`
        : `rgba(100,210,250,${(p.alpha * twinkle * 0.9).toFixed(2)})`;
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

    const onMove  = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

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
