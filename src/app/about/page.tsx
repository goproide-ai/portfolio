"use client";

import Image from "next/image";
import ParticleNet from "@/components/ParticleNet";
import { useTheme } from "@/context/ThemeContext";
import { useState, useRef, useEffect } from "react";

const awardImages = [
  { src: "/awards/1.png", title: "대한민국디자인전람회 대통령상 (Grand Prize)" },
  { src: "/awards/7.jpg", title: "국립중앙과학관 공로상" },
  { src: "/awards/2.jpg", title: "Red Dot Design Award, Winner 2025" },
  { src: "/awards/3.png", title: "Asia Design Prize 2026, Winner" },
  { src: "/awards/4.png", title: "K-Design Award 2025, Gold Winner" },
  { src: "/awards/5.png", title: "부산국제디자인어워드 Silver" },
  { src: "/awards/6.png", title: "대전디자인어워드 금상" },
  { src: "/awards/8.jpg", title: "삼성전자 Best Design Awards 대상" },
  { src: "/awards/9.jpg", title: "삼성전자 대토론회 Excellent Idea" },
];

export default function About() {
  const { isWhite } = useTheme();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx((i) => (i === null ? null : (i + 1) % awardImages.length));
      if (e.key === "ArrowLeft") setLightboxIdx((i) => (i === null ? null : (i - 1 + awardImages.length) % awardImages.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx]);

  const scrollBy = (dir: number) => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollBy({ left: dir * scrollerRef.current.clientWidth * 0.8, behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleNet />

      <div className="relative z-10 flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">

        {/* ── LEFT: Sticky profile photo ─────────────────────────── */}
        <div className="md:w-[42%] shrink-0 md:sticky md:top-0 md:h-screen relative overflow-hidden">
          <Image
            src={isWhite ? "/pptx/profile_white.jpg" : "/pptx/profile_dark.jpg"}
            alt="Ko Sungchan"
            fill
            priority
            sizes="42vw"
            className="object-cover object-center"
          />
          {/* Right-edge fade into page background — only on dark theme */}
          {!isWhite && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a0a0a]/70 hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 via-transparent to-transparent" />
            </>
          )}

          {/* Name overlay */}
          <div className="absolute bottom-8 left-8 right-8">
            <p className="font-mono text-[10px] tracking-[0.5em] text-[#8B5CF6] uppercase mb-3">
              About
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white whitespace-nowrap">
              Ko Sungchan
            </h1>
          </div>
        </div>

        {/* ── RIGHT: Scrollable info ──────────────────────────────── */}
        <div className="flex-1 pt-6 pb-16 px-8 md:px-16 md:pl-20 space-y-14 overflow-y-auto" style={{ paddingLeft: "clamp(1.5rem, 3.5vw, 4rem)" }}>

          {/* Bio */}
          <div>
            <p className="text-[#999] text-sm leading-9 mb-6">
              삼성전자에서 16년간 로봇, AI, 가전 등 다양한 제품의 디자인을 담당했습니다.
              현재 서울과학기술대학교 산업디자인학과 교수로 재직하며 다음 세대의
              디자이너 양성에 힘쓰고 있습니다.
            </p>
            <div className="space-y-2 font-mono text-xs text-[#555]">
              <p><span className="text-[#8B5CF6]">@</span> sungchan@seoultech.ac.kr</p>
              <p><span className="text-[#38BDF8]">#</span> Seoul National University of Science and Technology</p>
            </div>
          </div>

          {/* Education */}
          <div>
            <h2 className="font-mono text-[10px] tracking-[0.35em] text-[#38BDF8] uppercase mb-5 pb-2 border-b border-[#1a1a1a]">
              Education
            </h2>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-white">홍익대학교 IDAS</p>
                <p className="text-xs text-[#666] mt-1 leading-6">스마트디자인엔지니어링 디자인석사</p>
              </div>
              <div>
                <p className="text-sm text-white">국민대학교</p>
                <p className="text-xs text-[#666] mt-1 leading-6">기계자동차공학 공학사</p>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div>
            <h2 className="font-mono text-[10px] tracking-[0.35em] text-[#38BDF8] uppercase mb-5 pb-2 border-b border-[#1a1a1a]">
              Professional Experience
            </h2>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-white">서울과학기술대학교</p>
                <p className="text-xs text-[#666] mt-1 leading-6">산업디자인학과 조교수</p>
              </div>
              <div>
                <p className="text-sm text-white">삼성전자 삼성리서치 (2010-2026)</p>
                <p className="text-xs text-[#666] mt-1 leading-6">Industrial / UX Designer · UXIL</p>
              </div>
            </div>
          </div>

          {/* Specialization */}
          <div>
            <h2 className="font-mono text-[10px] tracking-[0.35em] text-[#38BDF8] uppercase mb-5 pb-2 border-b border-[#1a1a1a]">
              Specialization
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                "Industrial Design","Design Engineering","Mechanical Design",
                "UX Design","Exhibition Design","Character Design","AI Design",
                "Automotive Design","Robotics Design",
              ].map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 border border-[#2a2a2a] text-[10px] font-mono text-[#888] tracking-wide hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6] transition-colors"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Awards */}
          <div>
            <h2 className="font-mono text-[10px] tracking-[0.35em] text-[#8B5CF6] uppercase mb-5 pb-2 border-b border-[#1a1a1a]">
              Honors &amp; Awards
            </h2>
            <div className="space-y-0">
              {[
                { year: "2025", title: "대한민국디자인전람회 대통령상 (Grand Prize)" },
                { year: "2025", title: "국립중앙과학관 공로상" },
                { year: "2025", title: "Red Dot Design Award, Winner" },
                { year: "2025", title: "대전디자인어워드 금상" },
                { year: "2025", title: "부산국제디자인어워드 은상" },
                { year: "2024", title: "삼성전자 베스트디자인어워즈 대상" },
                { year: "2021", title: "IDEA Finalist" },
                { year: "2025", title: "삼성전자 대토론회 우수상" },
                { year: "2020", title: "iF Design Award, Winner" },
                { year: "2020", title: "Red Dot Design Award, Winner" },
                { year: "2020", title: "삼성전자 대토론회 최우수상" },
              ].map((a, i) => (
                <div key={i} className="flex items-baseline gap-5 py-2.5 border-b border-[#111]">
                  <span className="font-mono text-[10px] text-[#555] w-10 shrink-0">{a.year}</span>
                  <p className="text-sm text-[#ccc] leading-6">{a.title}</p>
                </div>
              ))}
            </div>

            {/* Certificate carousel */}
            <div className="mt-8 relative">
              <div
                ref={scrollerRef}
                className={`flex items-stretch gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 ${isWhite ? "scrollbar-light" : "scrollbar-dark"}`}
              >
                {awardImages.map((img, i) => (
                  <button
                    key={img.src}
                    onClick={() => setLightboxIdx(i)}
                    className={`snap-center shrink-0 relative group overflow-hidden border transition-colors ${isWhite ? "bg-[#f5f3ec] border-[#d8d4c8] hover:border-[#8B5CF6]/60" : "bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#8B5CF6]/60"}`}
                    style={{ height: "clamp(200px, 29vw, 287px)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt={img.title}
                      className="h-full w-auto block transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 bg-[#0a0a0a]/80 px-2 py-0.5 font-mono text-[9px] text-[#8B5CF6]">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent p-3">
                      <p className="text-[10px] text-[#ccc] leading-4">{img.title}</p>
                    </div>
                  </button>
                ))}
              </div>
              {/* Nav arrows */}
              <button
                onClick={() => scrollBy(-1)}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-10 h-10 items-center justify-center bg-[#0a0a0a]/90 border border-[#2a2a2a] hover:border-[#8B5CF6] text-[#999] hover:text-white transition-colors"
                aria-label="Previous"
              >‹</button>
              <button
                onClick={() => scrollBy(1)}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-10 h-10 items-center justify-center bg-[#0a0a0a]/90 border border-[#2a2a2a] hover:border-[#8B5CF6] text-[#999] hover:text-white transition-colors"
                aria-label="Next"
              >›</button>
            </div>
          </div>

          {/* CES */}
          <div>
            <h2 className="font-mono text-[10px] tracking-[0.35em] text-[#8B5CF6] uppercase mb-5 pb-2 border-b border-[#1a1a1a]">
              CES Exhibition
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { year: "CES 2022", role: "Samsung Research\nDesign Director" },
                { year: "CES 2021", role: "Air Pocket\nDesign Director" },
                { year: "CES 2020", role: "GEMS\nProduct Designer" },
                { year: "CES 2019", role: "Samsung Bot\nProduct Designer" },
                { year: "CES 2018", role: "Samsung × Harman\nCockpit Designer" },
              ].map((c) => (
                <div
                  key={c.year}
                  className="p-4 border border-[#1a1a1a] hover:border-[#8B5CF6]/30 transition-colors"
                >
                  <p className="font-mono text-[10px] text-[#8B5CF6] mb-2">{c.year}</p>
                  <p className="text-xs text-[#999] whitespace-pre-line leading-6">{c.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Board */}
          <div>
            <h2 className="font-mono text-[10px] tracking-[0.35em] text-[#8B5CF6] uppercase mb-5 pb-2 border-b border-[#1a1a1a]">
              Board Memberships &amp; Advisory
            </h2>
            <div className="space-y-0">
              {[
                "한국디자인학회 기업분과 이사",
                "디자인융복합학회 교육분과 이사",
                "한국디자인혁신협회 AI분과 이사",
                "한국디자인리서치학회 이사",
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#111]">
                  <span className="w-1.5 h-1.5 bg-[#38BDF8] rounded-full shrink-0" />
                  <p className="text-sm text-[#999] leading-7">{r}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Patents */}
          <div className="pb-16">
            <h2 className="font-mono text-[10px] tracking-[0.35em] text-[#8B5CF6] uppercase mb-5 pb-2 border-b border-[#1a1a1a]">
              Patents &amp; Design Rights
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 border border-[#1a1a1a]">
                <p className="text-4xl font-light text-white mb-3">11</p>
                <p className="text-xs text-[#666] leading-7">기술 특허 — 롤러블폰, 가전제품 등 대표 발명자</p>
              </div>
              <div className="p-6 border border-[#1a1a1a]">
                <p className="text-4xl font-light text-white mb-3">14</p>
                <p className="text-xs text-[#666] leading-7">디자인권 — 자동차 디자인 2건 등 대표 창작자</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Lightbox modal */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white text-2xl font-light"
            aria-label="Close"
          >×</button>
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i === null ? null : (i - 1 + awardImages.length) % awardImages.length)); }}
            className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white text-3xl font-light"
            aria-label="Previous"
          >‹</button>
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i === null ? null : (i + 1) % awardImages.length)); }}
            className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white text-3xl font-light"
            aria-label="Next"
          >›</button>
          <div className="relative w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full h-[80vh] max-w-5xl">
              <Image
                src={awardImages[lightboxIdx].src}
                alt={awardImages[lightboxIdx].title}
                fill
                sizes="100vw"
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="mt-4 text-center">
              <p className="font-mono text-[10px] text-[#8B5CF6] mb-1">
                {String(lightboxIdx + 1).padStart(2, "0")} / {String(awardImages.length).padStart(2, "0")}
              </p>
              <p className="text-sm text-white">{awardImages[lightboxIdx].title}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
