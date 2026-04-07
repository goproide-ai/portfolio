"use client";

import Image from "next/image";
import { useEffect, useRef, useCallback } from "react";

const P = "/lectures/adp";
const S = `${P}/slides`;

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
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0)";
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    refs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return add;
}

const reveal = "opacity-0 translate-y-8 transition-all duration-700 ease-out";

export default function Lectures() {
  const r = useReveal();

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        {/* ─── Header ─── */}
        <div className={`mb-20 ${reveal}`} ref={r}>
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
        <div className={`mb-28 rounded-lg overflow-hidden ${reveal}`} ref={r}>
          <Image src={`${P}/image1.png`} alt="Design in the Age of AI" width={1400} height={700} className="w-full h-auto" />
        </div>

        {/* ═══════════════════════════════════════════
            Chapter 1: Introduction
        ═══════════════════════════════════════════ */}
        <section className="mb-28">
          <div className={`mb-12 ${reveal}`} ref={r}>
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#38BDF8] uppercase mb-3">Chapter 1</p>
            <h2 className="text-2xl md:text-3xl font-medium text-white mb-6">Introduction</h2>
            <div className="w-16 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
          </div>

          <p className={`text-[15px] text-[#999] leading-8 mb-10 ${reveal}`} ref={r}>
            삼성전자에서 16년간 로봇, AI, 가전 등 다양한 제품의 디자인을 담당했습니다.
            자동차 콕핏 디자인부터 롤러블 폰, 웨어러블 로봇, AI 아바타 CES 전시 디렉팅까지 —
            현재 서울과학기술대학교 산업디자인학과 교수로 재직하며 다음 세대의 디자이너 양성에 힘쓰고 있습니다.
          </p>

          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-10 ${reveal}`} ref={r}>
            <Image src={`${P}/image4.png`} alt="Career Timeline" width={1400} height={700} className="w-full h-auto" />
          </div>

          <div className={`text-xs text-[#666] leading-7 border-l-2 border-[#8B5CF6]/30 pl-5 ${reveal}`} ref={r}>
            <p className="mb-1">2025 대한민국디자인전람회 대통령상 (Grand Prize)</p>
            <p className="mb-1">2025 Red Dot Design Award, Winner</p>
            <p className="mb-1">2026 Asia Design Prize, Winner</p>
            <p>2024 삼성전자 베스트디자인어워즈 대상</p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            Chapter 2: AI Design Workshops
        ═══════════════════════════════════════════ */}
        <section className="mb-28">
          <div className={`mb-12 ${reveal}`} ref={r}>
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#38BDF8] uppercase mb-3">Chapter 2</p>
            <h2 className="text-2xl md:text-3xl font-medium text-white mb-6">Generative AI Design Lecture</h2>
            <div className="w-16 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
          </div>

          <p className={`text-[15px] text-[#999] leading-8 mb-10 ${reveal}`} ref={r}>
            AI가 디자인에 큰 임팩트를 주었던 2023년 이후, 서울대, KAIST, 홍익대, 국민대, 건국대,
            한예종, 삼성전자 등 다양한 대학과 기관에서 AI 워크숍을 진행해 왔습니다.
            AI 기술이 빠르게 발전한 만큼 하나의 방법론에 머무르지 않고, 매번 새로운 시도를 이어갔습니다.
          </p>

          {/* Slide 5: Workshop overview */}
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-16 ${reveal}`} ref={r}>
            <Image src={`${S}/slide5.png`} alt="AI Design Workshops across universities" width={1920} height={1080} className="w-full h-auto" />
          </div>

          {/* AI Design Process */}
          <h3 className={`text-xl text-white font-medium mb-6 ${reveal}`} ref={r}>AI Design Process Example</h3>
          <p className={`text-[15px] text-[#999] leading-8 mb-8 ${reveal}`} ref={r}>
            AI만 활용해서 제품 컨셉을 정의하고 디자인을 확정하고 활용씬을 제작합니다.
            이전에는 Magnific이 효과적이었다면, 지금은 Nano Banana 또는 생성형 채우기가
            훨씬 더 간편하고 정교한 솔루션입니다.
          </p>

          {/* Slide 6 & 7: AI process examples */}
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-4 ${reveal}`} ref={r}>
            <Image src={`${S}/slide6.png`} alt="AI Design Process - Magnific era" width={1920} height={1080} className="w-full h-auto" />
          </div>
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-6 ${reveal}`} ref={r}>
            <Image src={`${S}/slide7.png`} alt="AI Design Process - Nano Banana era" width={1920} height={1080} className="w-full h-auto" />
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            Case Study: Sleev
        ═══════════════════════════════════════════ */}
        <section className="mb-28">
          <div className={`mb-12 ${reveal}`} ref={r}>
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#38BDF8] uppercase mb-3">Case Study</p>
            <h2 className="text-2xl md:text-3xl font-medium text-white mb-6">Sleev — Design Process with AI</h2>
            <div className="w-16 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
          </div>

          <p className={`text-[15px] text-[#999] leading-8 mb-10 ${reveal}`} ref={r}>
            오늘 수상한 Sleev 프로젝트에서는 시장조사와 사용자 조사, 기술자문, 렌더링, 사용씬 제작 등
            전 과정을 거쳤습니다. 리서치와 활용씬 제작에는 AI를 적극적으로 활용했지만,
            <span className="text-[#8B5CF6] font-medium"> 디자이너가 디테일을 높이고 조형을 정의하는 Define 단계에서는 AI를 배제</span>하고
            오롯이 디자이너의 감각과 판단에 의존했습니다.
          </p>

          {/* Slide 8: Process overview */}
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-4 ${reveal}`} ref={r}>
            <Image src={`${S}/slide8.png`} alt="Sleev - Design Process" width={1920} height={1080} className="w-full h-auto" />
          </div>

          {/* Slide 9: With/without AI */}
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-10 ${reveal}`} ref={r}>
            <Image src={`${S}/slide9.png`} alt="Sleev - Design with AI vs without AI" width={1920} height={1080} className="w-full h-auto" />
          </div>

          <div className={`bg-[#111] rounded-lg p-8 border border-[#1a1a1a] ${reveal}`} ref={r}>
            <p className="text-[15px] text-[#999] leading-8">
              제품의 형태를 결정하고 디테일이 좋은 디자인을 정의하는 데 있어서
              아직까지 AI가 충분하지 않습니다. 특히 Sleev와 같이 인간공학 기반의
              정확한 구동과 연출이 필요한 제품은 <span className="text-white font-medium">디자이너의 영역으로 남아있습니다.</span>
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            Chapter 3: AI Case Studies
        ═══════════════════════════════════════════ */}
        <section className="mb-28">
          <div className={`mb-12 ${reveal}`} ref={r}>
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#38BDF8] uppercase mb-3">Chapter 3</p>
            <h2 className="text-2xl md:text-3xl font-medium text-white mb-6">Generative AI Case Studies</h2>
            <div className="w-16 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
          </div>

          {/* --- AI Model Creation --- */}
          <h3 className={`text-xl text-white font-medium mb-6 ${reveal}`} ref={r}>AI로 활용씬 제작</h3>
          <p className={`text-[15px] text-[#999] leading-8 mb-8 ${reveal}`} ref={r}>
            제품 정의 후 AI로 다양한 인물 모델을 직접 생성하여,
            빠르게 여러 활용 시나리오 이미지를 제작하였습니다.
            실제 모델 섭외 없이도 다양한 착용 상황과 사용 맥락을 시각화할 수 있었습니다.
          </p>

          {/* Slide 11: AI model generation */}
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-16 ${reveal}`} ref={r}>
            <Image src={`${S}/slide11.png`} alt="AI model generation for usage scenarios" width={1920} height={1080} className="w-full h-auto" />
          </div>

          {/* --- Studio Shot Replacement --- */}
          <h3 className={`text-xl text-white font-medium mb-6 ${reveal}`} ref={r}>스튜디오 촬영의 대체</h3>
          <p className={`text-[15px] text-[#999] leading-8 mb-8 ${reveal}`} ref={r}>
            AI가 발전하며 기존 디자이너의 영역을 대체하는 부분도 생깁니다.
            목업을 만들고 모델을 섭외해서 촬영했던 스튜디오 샷을
            AI가 대체 가능한 퀄리티로 구현하기 시작했습니다.
          </p>

          {/* Slide 13: Studio vs AI comparison intro */}
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-4 ${reveal}`} ref={r}>
            <Image src={`${S}/slide13.png`} alt="Studio photography examples" width={1920} height={1080} className="w-full h-auto" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] ${reveal}`} ref={r}>
              <Image src={`${P}/image87.jpeg`} alt="Studio shot - woman wearing device" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#666]">Studio Photography</p>
            </div>
            <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] ${reveal}`} ref={r}>
              <Image src={`${P}/image88.jpeg`} alt="AI generated - man wearing devices" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#8B5CF6]">AI-Generated</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] ${reveal}`} ref={r}>
              <Image src={`${P}/image89.jpeg`} alt="AI generated model shot" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#8B5CF6]">AI-Generated</p>
            </div>
            <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] ${reveal}`} ref={r}>
              <Image src={`${P}/image90.jpeg`} alt="AI generated model shot" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#8B5CF6]">AI-Generated</p>
            </div>
          </div>

          <p className={`text-[15px] text-[#999] leading-8 mb-16 ${reveal}`} ref={r}>
            스튜디오 촬영을 대체하거나 기존에 만들지 못하는 콘텐츠를 제작하는 데
            AI가 활용되고 있습니다.
          </p>

          {/* --- Material Specification --- */}
          <h3 className={`text-xl text-white font-medium mb-6 ${reveal}`} ref={r}>AI 소재 사양 적용</h3>
          <p className={`text-[15px] text-[#999] leading-8 mb-8 ${reveal}`} ref={r}>
            목업 촬영 사진 위에 구체적인 소재 사양을 텍스트로 적어주면,
            AI가 패브릭, 벨크로, 플라스틱 등의 소재를 꽤 정교하게 적용합니다.
          </p>

          {/* Slide 17: Mockup photo */}
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-2 ${reveal}`} ref={r}>
            <Image src={`${S}/slide17.png`} alt="Mockup photo - before AI" width={1920} height={1080} className="w-full h-auto" />
          </div>
          <p className={`font-mono text-[9px] text-[#555] mb-4 text-center ${reveal}`} ref={r}>Mockup Photo</p>

          {/* Slide 18: With text annotation */}
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-2 ${reveal}`} ref={r}>
            <Image src={`${S}/slide18.png`} alt="Mockup with material text annotations" width={1920} height={1080} className="w-full h-auto" />
          </div>
          <p className={`font-mono text-[9px] text-[#555] mb-4 text-center ${reveal}`} ref={r}>Text annotation for AI prompt</p>

          {/* Slide 19: AI result */}
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] mb-2 ${reveal}`} ref={r}>
            <Image src={`${S}/slide19.png`} alt="AI generated with material specifications" width={1920} height={1080} className="w-full h-auto" />
          </div>
          <p className={`font-mono text-[9px] text-[#8B5CF6] mb-10 text-center ${reveal}`} ref={r}>AI-Generated Result</p>

          {/* Slide 20-21: Design territory shift */}
          <div className={`bg-[#111] rounded-lg p-8 border border-[#1a1a1a] mb-4 ${reveal}`} ref={r}>
            <p className="text-[15px] text-[#999] leading-8">
              AI 시대에도 여전히 디자이너의 영역이던 부분이
              <span className="text-white font-medium"> AI로 가능한 영역으로 빠르게 넘어오고 있습니다.</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] ${reveal}`} ref={r}>
              <Image src={`${S}/slide20.png`} alt="Design without AI territory" width={1920} height={1080} className="w-full h-auto" />
            </div>
            <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] ${reveal}`} ref={r}>
              <Image src={`${S}/slide21.png`} alt="Design with AI territory expanding" width={1920} height={1080} className="w-full h-auto" />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            Chapter 4: AI Mindsets
        ═══════════════════════════════════════════ */}
        <section className="mb-28">
          <div className={`mb-12 ${reveal}`} ref={r}>
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#38BDF8] uppercase mb-3">Chapter 4</p>
            <h2 className="text-2xl md:text-3xl font-medium text-white mb-6">AI 시대에 살아남는 디자이너</h2>
            <div className="w-16 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
          </div>

          <blockquote className={`text-xl md:text-2xl font-light text-[#ccc] leading-relaxed mb-12 border-l-2 border-[#8B5CF6] pl-6 ${reveal}`} ref={r}>
            &ldquo;A designer who thrives in the era of AI&rdquo;
          </blockquote>

          <p className={`text-[15px] text-[#999] leading-8 mb-12 ${reveal}`} ref={r}>
            기존 방식을 고집하지 않는 유연한 태도를 바탕으로 관습의 파괴와 영역의 확장을 두려워하지 않고,
            복잡한 맥락의 이해를 바탕으로 방향성을 정의할 수 있는 디자이너.
            각 AI가 잘 이해할 수 있는 형태로 명령을 내릴 수 있는 프롬프트 엔지니어링 능력이 있고,
            무엇보다 <span className="text-[#8B5CF6] font-medium">좋은 취향과 디테일에 대한 집착</span>을
            바탕으로 밀도 있는 디자인을 만들어내는 디자이너.
          </p>

          {/* Slide 24: Five Competencies */}
          <div className={`rounded-lg overflow-hidden border border-[#1a1a1a] ${reveal}`} ref={r}>
            <Image src={`${S}/slide24.png`} alt="Five competencies for designers in the AI era" width={1920} height={1080} className="w-full h-auto" />
          </div>
        </section>

        {/* ─── Footer ─── */}
        <div className={`text-center py-16 border-t border-[#1a1a1a] ${reveal}`} ref={r}>
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#555] uppercase mb-4">End of Lecture</p>
          <p className="text-sm text-[#666]">sungchan@seoultech.ac.kr</p>
        </div>
      </div>
    </div>
  );
}
