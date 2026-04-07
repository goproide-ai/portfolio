"use client";

import Image from "next/image";
import { useEffect, useRef, useCallback, useState } from "react";

const P = "/lectures/adp";
const S = `${P}/slides`;

/* ── Scroll reveal hook ── */
function useReveal() {
  const refs = useRef<HTMLElement[]>([]);
  const add = useCallback((el: HTMLElement | null) => {
    if (el && !refs.current.includes(el)) refs.current.push(el);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            el.classList.add("revealed");
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -60px 0px" }
    );
    refs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return add;
}

/* ── Chapter divider with animated line ── */
function ChapterDivider({ label, title, r }: { label: string; title: string; r: (el: HTMLElement | null) => void }) {
  return (
    <div className="mt-20 mb-16" ref={r} data-anim="chapter">
      <div className="anim-divider-line w-full h-[1px] bg-[#1a1a1a] mb-16" />
      <p className="font-mono text-[10px] tracking-[0.6em] text-[#38BDF8] uppercase mb-5 anim-fade-right">{label}</p>
      <h2 className="text-2xl md:text-3xl font-medium text-white mb-6 anim-title">{title}</h2>
      <div className="anim-line h-[1px] bg-gradient-to-r from-[#8B5CF6] via-[#38BDF8] to-transparent" />
    </div>
  );
}

/* ── Styled sub-heading ── */
function SubHead({ children, r }: { children: string; r: (el: HTMLElement | null) => void }) {
  return (
    <h3 className="text-xl md:text-2xl text-white font-medium mb-8 mt-4 anim-slide-left" ref={r} data-anim="slide-left">
      {children}
    </h3>
  );
}

export default function Lectures() {
  const r = useReveal();

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      {/* CSS for animations */}
      <style jsx global>{`
        /* Base hidden state */
        [data-anim] { opacity: 0; }
        [data-anim].revealed { opacity: 1; }

        /* ── Chapter divider: dramatic entrance ── */
        [data-anim="chapter"] { opacity: 1; }
        [data-anim="chapter"] .anim-divider-line {
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-anim="chapter"].revealed .anim-divider-line {
          transform: scaleX(1);
        }
        [data-anim="chapter"] .anim-title {
          opacity: 0; transform: translateY(60px) scale(0.9);
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
        }
        [data-anim="chapter"].revealed .anim-title {
          opacity: 1; transform: translateY(0) scale(1);
        }
        [data-anim="chapter"] .anim-fade-right {
          opacity: 0; transform: translateX(-40px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s;
        }
        [data-anim="chapter"].revealed .anim-fade-right {
          opacity: 1; transform: translateX(0);
        }
        [data-anim="chapter"] .anim-line {
          width: 0; transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.5s;
        }
        [data-anim="chapter"].revealed .anim-line {
          width: 120px;
        }

        /* ── Fade up (body text) ── */
        [data-anim="fade-up"] {
          transform: translateY(60px);
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-anim="fade-up"].revealed {
          opacity: 1; transform: translateY(0);
        }

        /* ── Slide from left (dramatic) ── */
        [data-anim="slide-left"] {
          transform: translateX(-80px) rotate(-1deg);
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-anim="slide-left"].revealed {
          opacity: 1; transform: translateX(0) rotate(0deg);
        }

        /* ── Slide from right ── */
        [data-anim="slide-right"] {
          transform: translateX(80px) rotate(1deg);
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-anim="slide-right"].revealed {
          opacity: 1; transform: translateX(0) rotate(0deg);
        }

        /* ── Scale up (images) ── */
        [data-anim="scale"] {
          transform: scale(0.85);
          filter: brightness(0.5);
          transition: all 1.1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-anim="scale"].revealed {
          opacity: 1; transform: scale(1); filter: brightness(1);
        }

        /* ── Blur in (header/footer) ── */
        [data-anim="blur"] {
          filter: blur(20px); transform: translateY(40px);
          transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-anim="blur"].revealed {
          opacity: 1; filter: blur(0); transform: translateY(0);
        }

        /* ── Highlight sweep (key phrases) ── */
        [data-anim="highlight"] {
          opacity: 1;
        }
        [data-anim="highlight"] > * {
          opacity: 0; transform: translateY(30px);
          transition: all 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-anim="highlight"].revealed > * {
          opacity: 1; transform: translateY(0);
        }
        [data-anim="highlight"] .highlight-text {
          background-size: 0% 100%;
          background-image: linear-gradient(90deg, rgba(139,92,246,0.3), rgba(56,189,248,0.15));
          background-repeat: no-repeat;
          padding: 2px 6px; border-radius: 3px;
          transition: background-size 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.6s;
        }
        [data-anim="highlight"].revealed .highlight-text {
          background-size: 100% 100%;
        }

        /* ── Stagger children ── */
        [data-anim="stagger"] { opacity: 1; }
        [data-anim="stagger"] > * {
          opacity: 0; transform: translateY(30px) scale(0.95);
          transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-anim="stagger"].revealed > *:nth-child(1) { opacity: 1; transform: translateY(0) scale(1); transition-delay: 0.05s; }
        [data-anim="stagger"].revealed > *:nth-child(2) { opacity: 1; transform: translateY(0) scale(1); transition-delay: 0.18s; }
        [data-anim="stagger"].revealed > *:nth-child(3) { opacity: 1; transform: translateY(0) scale(1); transition-delay: 0.31s; }
        [data-anim="stagger"].revealed > *:nth-child(4) { opacity: 1; transform: translateY(0) scale(1); transition-delay: 0.44s; }

        /* ── Clip reveal (image wipe) ── */
        [data-anim="clip"] {
          clip-path: inset(0 100% 0 0);
          transition: clip-path 1.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-anim="clip"].revealed {
          opacity: 1; clip-path: inset(0 0% 0 0);
        }

        /* ── Quote glow (dramatic) ── */
        [data-anim="glow"] {
          text-shadow: 0 0 0px transparent;
          transform: translateY(40px) scale(0.95);
          filter: blur(8px);
          transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-anim="glow"].revealed {
          opacity: 1; transform: translateY(0) scale(1);
          filter: blur(0);
          text-shadow: 0 0 60px rgba(139,92,246,0.5), 0 0 120px rgba(56,189,248,0.2);
        }
      `}</style>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">

        {/* ─── Header ─── */}
        <div className="mb-40" ref={r} data-anim="blur">
          <p className="font-mono text-[10px] tracking-[0.5em] text-[#8B5CF6] uppercase mb-4">
            Lecture Material
          </p>
          <h1 className="text-3xl md:text-5xl font-medium tracking-tight mb-4">
            <span className="gradient-text">Design in the Age of AI</span>
          </h1>
          <p className="text-lg text-[#888] leading-8 font-light">AI시대 디자이너의 역할</p>
          <div className="flex items-center gap-4 mt-8">
            <div>
              <p className="text-sm text-[#ccc] font-medium">Sungchan Ko</p>
              <p className="text-[11px] text-[#555]">Assistant Professor, Seoul National University of Science and Technology</p>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="mb-48" ref={r} data-anim="scale">
          <div className="rounded-lg overflow-hidden">
            <Image src={`${P}/image1.png`} alt="Design in the Age of AI" width={1400} height={700} className="w-full h-auto" />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            Chapter 1: Introduction
        ═══════════════════════════════════════════════ */}
        <section className="mb-56">
          <ChapterDivider label="Chapter 1" title="Introduction" r={r} />

          <div ref={r} data-anim="highlight">
            <p className="text-[15px] text-[#999] leading-9 mb-12">
              삼성전자에서 16년간 로봇, AI, 가전 등 다양한 제품의 디자인을 담당했습니다.
              자동차 콕핏 디자인부터 롤러블 폰, 웨어러블 로봇,
              <span className="highlight-text text-white font-medium"> AI 아바타 CES 전시 디렉팅</span>까지 —
              현재 서울과학기술대학교 산업디자인학과 교수로 재직하며 다음 세대의 디자이너 양성에 힘쓰고 있습니다.
            </p>
          </div>

          <div className="mb-12" ref={r} data-anim="scale">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image4.png`} alt="Career Timeline" width={1400} height={700} className="w-full h-auto" />
            </div>
          </div>

          <div ref={r} data-anim="stagger" className="text-xs text-[#666] leading-8 border-l-2 border-[#8B5CF6]/30 pl-5">
            <p>2025 대한민국디자인전람회 대통령상 (Grand Prize)</p>
            <p>2025 Red Dot Design Award, Winner</p>
            <p>2026 Asia Design Prize, Winner</p>
            <p>2024 삼성전자 베스트디자인어워즈 대상</p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            Chapter 2: AI Design Workshops
        ═══════════════════════════════════════════════ */}
        <section className="mb-56">
          <ChapterDivider label="Chapter 2" title="Generative AI Design Lecture" r={r} />

          <div ref={r} data-anim="fade-up">
            <p className="text-[15px] text-[#999] leading-9 mb-12">
              AI가 디자인에 큰 임팩트를 주었던 2023년 이후, 서울대, KAIST, 홍익대, 국민대, 건국대,
              한예종, 삼성전자 등 다양한 대학과 기관에서 AI 워크숍을 진행해 왔습니다.
              AI 기술이 빠르게 발전한 만큼 하나의 방법론에 머무르지 않고, 매번 새로운 시도를 이어갔습니다.
            </p>
          </div>

          <div className="mb-20" ref={r} data-anim="clip">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide5.png`} alt="AI Design Workshops across universities" width={1920} height={1080} className="w-full h-auto" />
            </div>
          </div>

          <SubHead r={r}>AI Design Process Example</SubHead>

          <div ref={r} data-anim="slide-right">
            <p className="text-[15px] text-[#999] leading-9 mb-10">
              AI만 활용해서 제품 컨셉을 정의하고 디자인을 확정하고 활용씬을 제작합니다.
              이전에는 Magnific이 효과적이었다면, 지금은 Nano Banana 또는 생성형 채우기가
              훨씬 더 간편하고 정교한 솔루션입니다.
            </p>
          </div>

          <div className="mb-6" ref={r} data-anim="scale">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide6.png`} alt="AI Design Process - Magnific era" width={1920} height={1080} className="w-full h-auto" />
            </div>
          </div>
          <div ref={r} data-anim="scale">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide7.png`} alt="AI Design Process - Nano Banana era" width={1920} height={1080} className="w-full h-auto" />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            Case Study: Sleev
        ═══════════════════════════════════════════════ */}
        <section className="mb-56">
          <ChapterDivider label="Case Study" title="Sleev — Design Process with AI" r={r} />

          <div ref={r} data-anim="highlight">
            <p className="text-[15px] text-[#999] leading-9 mb-12">
              오늘 수상한 Sleev 프로젝트에서는 시장조사와 사용자 조사, 기술자문, 렌더링, 사용씬 제작 등
              전 과정을 거쳤습니다. 리서치와 활용씬 제작에는 AI를 적극적으로 활용했지만,
              <span className="highlight-text text-[#8B5CF6] font-medium"> 디자이너가 디테일을 높이고 조형을 정의하는 Define 단계에서는 AI를 배제</span>하고
              오롯이 디자이너의 감각과 판단에 의존했습니다.
            </p>
          </div>

          <div className="mb-6" ref={r} data-anim="clip">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide8.png`} alt="Sleev - Design Process" width={1920} height={1080} className="w-full h-auto" />
            </div>
          </div>

          <div className="mb-12" ref={r} data-anim="clip">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide9.png`} alt="Sleev - Design with AI vs without AI" width={1920} height={1080} className="w-full h-auto" />
            </div>
          </div>

          <div ref={r} data-anim="slide-left">
            <div className="bg-[#111] rounded-lg p-10 border border-[#1a1a1a]">
              <p className="text-[15px] text-[#999] leading-9">
                제품의 형태를 결정하고 디테일이 좋은 디자인을 정의하는 데 있어서
                아직까지 AI가 충분하지 않습니다. 특히 Sleev와 같이 인간공학 기반의
                정확한 구동과 연출이 필요한 제품은 <span className="text-white font-medium">디자이너의 영역으로 남아있습니다.</span>
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            Chapter 3: AI Case Studies
        ═══════════════════════════════════════════════ */}
        <section className="mb-56">
          <ChapterDivider label="Chapter 3" title="Generative AI Case Studies" r={r} />

          {/* --- AI Model Creation --- */}
          <SubHead r={r}>AI로 활용씬 제작</SubHead>

          <div ref={r} data-anim="fade-up">
            <p className="text-[15px] text-[#999] leading-9 mb-10">
              제품 정의 후 AI로 다양한 인물 모델을 직접 생성하여,
              빠르게 여러 활용 시나리오 이미지를 제작하였습니다.
              실제 모델 섭외 없이도 다양한 착용 상황과 사용 맥락을 시각화할 수 있었습니다.
            </p>
          </div>

          <div className="mb-24" ref={r} data-anim="scale">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide11.png`} alt="AI model generation for usage scenarios" width={1920} height={1080} className="w-full h-auto" />
            </div>
          </div>

          {/* --- Studio Shot Replacement --- */}
          <SubHead r={r}>스튜디오 촬영의 대체</SubHead>

          <div ref={r} data-anim="slide-right">
            <p className="text-[15px] text-[#999] leading-9 mb-10">
              AI가 발전하며 기존 디자이너의 영역을 대체하는 부분도 생깁니다.
              목업을 만들고 모델을 섭외해서 촬영했던 스튜디오 샷을
              AI가 대체 가능한 퀄리티로 구현하기 시작했습니다.
            </p>
          </div>

          <div className="mb-6" ref={r} data-anim="clip">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide13.png`} alt="Studio photography examples" width={1920} height={1080} className="w-full h-auto" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-6" ref={r} data-anim="stagger">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image87.jpeg`} alt="Studio shot - woman wearing device" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#666]">Studio Photography</p>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image88.jpeg`} alt="AI generated - man wearing devices" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#8B5CF6]">AI-Generated</p>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image89.jpeg`} alt="AI generated model shot" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#8B5CF6]">AI-Generated</p>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image90.jpeg`} alt="AI generated model shot" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#8B5CF6]">AI-Generated</p>
            </div>
          </div>

          <div ref={r} data-anim="fade-up">
            <p className="text-[15px] text-[#999] leading-9 mb-24">
              스튜디오 촬영을 대체하거나 기존에 만들지 못하는 콘텐츠를 제작하는 데
              AI가 활용되고 있습니다.
            </p>
          </div>

          {/* --- Material Specification --- */}
          <SubHead r={r}>AI 소재 사양 적용</SubHead>

          <div ref={r} data-anim="slide-left">
            <p className="text-[15px] text-[#999] leading-9 mb-10">
              목업 촬영 사진 위에 구체적인 소재 사양을 텍스트로 적어주면,
              AI가 패브릭, 벨크로, 플라스틱 등의 소재를 꽤 정교하게 적용합니다.
            </p>
          </div>

          <div className="mb-3" ref={r} data-anim="fade-up">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide17.png`} alt="Mockup photo - before AI" width={1920} height={1080} className="w-full h-auto" />
            </div>
            <p className="font-mono text-[9px] text-[#555] mt-2 text-center">Mockup Photo</p>
          </div>

          <div className="mb-3" ref={r} data-anim="fade-up">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide18.png`} alt="Mockup with material text annotations" width={1920} height={1080} className="w-full h-auto" />
            </div>
            <p className="font-mono text-[9px] text-[#555] mt-2 text-center">Text annotation for AI prompt</p>
          </div>

          <div className="mb-12" ref={r} data-anim="fade-up">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide19.png`} alt="AI generated with material specifications" width={1920} height={1080} className="w-full h-auto" />
            </div>
            <p className="font-mono text-[9px] text-[#8B5CF6] mt-2 text-center">AI-Generated Result</p>
          </div>

          <div ref={r} data-anim="slide-right">
            <div className="bg-[#111] rounded-lg p-10 border border-[#1a1a1a] mb-6">
              <p className="text-[15px] text-[#999] leading-9">
                AI 시대에도 여전히 디자이너의 영역이던 부분이
                <span className="text-white font-medium"> AI로 가능한 영역으로 빠르게 넘어오고 있습니다.</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5" ref={r} data-anim="stagger">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide20.png`} alt="Design without AI territory" width={1920} height={1080} className="w-full h-auto" />
            </div>
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide21.png`} alt="Design with AI territory expanding" width={1920} height={1080} className="w-full h-auto" />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            Chapter 4: AI Mindsets
        ═══════════════════════════════════════════════ */}
        <section className="mb-56">
          <ChapterDivider label="Chapter 4" title="AI 시대에 살아남는 디자이너" r={r} />

          <div ref={r} data-anim="glow">
            <blockquote className="text-xl md:text-3xl font-light text-[#ccc] leading-relaxed mb-16 border-l-2 border-[#8B5CF6] pl-6">
              &ldquo;A designer who thrives in the era of AI&rdquo;
            </blockquote>
          </div>

          <div ref={r} data-anim="highlight">
            <p className="text-[15px] text-[#999] leading-9 mb-16">
              기존 방식을 고집하지 않는 유연한 태도를 바탕으로 관습의 파괴와 영역의 확장을 두려워하지 않고,
              복잡한 맥락의 이해를 바탕으로 방향성을 정의할 수 있는 디자이너.
              각 AI가 잘 이해할 수 있는 형태로 명령을 내릴 수 있는 프롬프트 엔지니어링 능력이 있고,
              무엇보다 <span className="highlight-text text-[#8B5CF6] font-medium">좋은 취향과 디테일에 대한 집착</span>을
              바탕으로 밀도 있는 디자인을 만들어내는 디자이너.
            </p>
          </div>

          <div ref={r} data-anim="scale">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${S}/slide24.png`} alt="Five competencies for designers in the AI era" width={1920} height={1080} className="w-full h-auto" />
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <div className="text-center py-20 border-t border-[#1a1a1a]" ref={r} data-anim="blur">
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#555] uppercase mb-4">End of Lecture</p>
          <p className="text-sm text-[#666]">sungchan@seoultech.ac.kr</p>
        </div>
      </div>
    </div>
  );
}
