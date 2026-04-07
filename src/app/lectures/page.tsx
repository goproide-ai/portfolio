import Image from "next/image";

const P = "/lectures/adp";

export default function Lectures() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-20">
          <p className="font-mono text-[10px] tracking-[0.5em] text-[#8B5CF6] uppercase mb-4">
            Lecture Material
          </p>
          <h1 className="text-3xl md:text-5xl font-light tracking-tight mb-4">
            <span className="gradient-text">Design in the Age of AI</span>
          </h1>
          <p className="text-sm text-[#666] leading-8 max-w-2xl">
            2026 Asia Design Prize Ceremony Special Lecture
          </p>
          <div className="flex items-center gap-4 mt-6">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-[#2a2a2a]">
              <Image src="/pptx/sleev_black.jpg" alt="Sungchan Ko" width={40} height={40} className="object-cover w-full h-full" />
            </div>
            <div>
              <p className="text-xs text-[#ccc]">Sungchan Ko</p>
              <p className="text-[10px] text-[#555] font-mono">Seoul National University of Science and Technology</p>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="mb-24 rounded-lg overflow-hidden">
          <Image src={`${P}/image1.png`} alt="Design in the Age of AI" width={1400} height={700} className="w-full h-auto" />
        </div>

        {/* ─── Chapter 1: Introduction ─── */}
        <section className="mb-24">
          <div className="mb-12">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#38BDF8] uppercase mb-3">Chapter 1</p>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-6">Introduction</h2>
            <div className="w-12 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
          </div>

          <p className="text-sm text-[#999] leading-8 mb-10">
            삼성전자에서 16년간 로봇, AI, 가전 등 다양한 제품의 디자인을 담당했습니다.
            현재 서울과학기술대학교 산업디자인학과 교수로 재직하며 다음 세대의 디자이너 양성에 힘쓰고 있습니다.
          </p>

          {/* Portfolio Timeline */}
          <div className="rounded-lg overflow-hidden border border-[#1a1a1a] mb-10">
            <Image src={`${P}/image4.png`} alt="Career Timeline" width={1400} height={700} className="w-full h-auto" />
          </div>

          <p className="text-sm text-[#999] leading-8 mb-6">
            자동차 콕핏 디자인부터 롤러블 폰, 웨어러블 로봇, AI 체험 전시까지 —
            삼성전자 재직 시절 다양한 프로젝트를 통해 디자인의 경계를 넓혀왔습니다.
          </p>

          <div className="text-xs text-[#666] leading-7 border-l-2 border-[#8B5CF6]/30 pl-4 mb-10">
            <p>2025 대한민국디자인전람회 대통령상 (Grand Prize)</p>
            <p>2025 Red Dot Design Award, Winner</p>
            <p>2026 Asia Design Prize, Winner</p>
            <p>2024 삼성전자 베스트디자인어워즈 대상</p>
          </div>
        </section>

        {/* ─── Chapter 2: AI Design Workshops ─── */}
        <section className="mb-24">
          <div className="mb-12">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#38BDF8] uppercase mb-3">Chapter 2</p>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-6">Generative AI Design Lecture</h2>
            <div className="w-12 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
          </div>

          <p className="text-sm text-[#999] leading-8 mb-10">
            AI가 디자인에 큰 임팩트를 주었던 2023년 이후 서울대, KAIST, 홍익대, 국민대, 건국대, 한예종 등
            다양한 대학과 기관에서 AI 워크숍을 진행해 왔습니다.
            AI 기술이 빠르게 발전한 만큼 하나의 방법론에 머무르지 않고, 매번 새로운 시도를 이어갔습니다.
          </p>

          {/* Workshop Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
            {[
              { img: `${P}/image23.png`, label: "2023.8 한국예술종합학교" },
              { img: `${P}/image30.png`, label: "2024.1 삼성전자 전사 디자이너" },
              { img: `${P}/image31.png`, label: "2024.6-7 국민대학교" },
              { img: `${P}/image32.png`, label: "2024.11-12 서울대학교" },
              { img: `${P}/image33.png`, label: "2025.3 KAIST" },
              { img: `${P}/image29.png`, label: "2025.4-5 홍익대학교" },
            ].map((w, i) => (
              <div key={i} className="relative rounded overflow-hidden border border-[#1a1a1a]">
                <Image src={w.img} alt={w.label} width={400} height={300} className="w-full h-auto" />
                <p className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a]/80 px-3 py-2 font-mono text-[8px] text-[#888]">{w.label}</p>
              </div>
            ))}
          </div>

          {/* AI Design Process Example */}
          <h3 className="text-lg text-white font-light mb-6 mt-16">AI Design Process Example</h3>
          <p className="text-sm text-[#999] leading-8 mb-8">
            AI만 활용해서 제품 컨셉을 정의하고 디자인을 확정하고 활용씬을 제작합니다.
            이전에는 Magnific이 효과적이었다면, 지금은 Nano Banana 또는 생성형 채우기가 훨씬 더 간편하고 정교한 솔루션입니다.
          </p>

          <div className="rounded-lg overflow-hidden border border-[#1a1a1a] mb-6">
            <Image src={`${P}/image37.jpeg`} alt="AI generated delivery robot concept" width={1200} height={600} className="w-full h-auto" />
          </div>
          <p className="font-mono text-[9px] text-[#555] mb-12 text-center">AI-generated product concept — autonomous delivery robot</p>
        </section>

        {/* ─── Sleev Case Study ─── */}
        <section className="mb-24">
          <div className="mb-12">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#38BDF8] uppercase mb-3">Case Study</p>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-6">Sleev — Double Diamond Process</h2>
            <div className="w-12 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
          </div>

          <p className="text-sm text-[#999] leading-8 mb-10">
            오늘 수상한 Sleev를 예시로 설명드리겠습니다. Discover → Define → Develop → Deliver의
            더블 다이아몬드 프로세스로 작업을 진행했습니다. 시장조사와 사용자 조사, 기술자문을 받고
            제품 형태를 정의한 뒤 렌더링, 사용씬 등 다양한 결과물을 만들었습니다.
          </p>

          {/* Process Images */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image65.JPG`} alt="Sleev components and sizing" width={600} height={400} className="w-full h-auto" />
            </div>
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image53.JPG`} alt="Sleev prototype" width={600} height={400} className="w-full h-auto" />
            </div>
          </div>

          {/* Design with/without AI */}
          <div className="bg-[#111] rounded-lg p-8 mb-10 border border-[#1a1a1a]">
            <h4 className="text-sm text-white mb-4">Design with AI vs. Design without AI</h4>
            <p className="text-sm text-[#999] leading-8 mb-6">
              리서치와 적절한 사용씬 제작은 AI의 큰 도움을 받을 수 있지만,
              제품의 형태를 결정하고 디테일이 좋은 디자인을 정의하는 데 있어서
              아직까지 AI가 충분하지 않아서 디자이너의 영역으로 남아있는 것 같습니다.
            </p>
            <p className="text-sm text-[#999] leading-8">
              특히 Sleev와 같이 인간공학 기반의 정확한 구동과 연출이 필요한 제품은
              디자이너의 노력이 여전히 많이 필요합니다.
            </p>
          </div>
        </section>

        {/* ─── Chapter 3: AI Case Studies ─── */}
        <section className="mb-24">
          <div className="mb-12">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#38BDF8] uppercase mb-3">Chapter 3</p>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-6">Generative AI Design Case Studies</h2>
            <div className="w-12 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
          </div>

          {/* AI Model Creation */}
          <h3 className="text-lg text-white font-light mb-6">AI로 활용씬 제작</h3>
          <p className="text-sm text-[#999] leading-8 mb-8">
            제품 정의 후 다양한 모델을 AI로 만들어서 활용씬을 빠르게 제작하였습니다.
            One-shot prompting부터 Few-shot prompting까지, 대화 맥락을 기반으로 자연스러운 이미지를 생성합니다.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-16">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image82.png`} alt="AI generated model - one-shot" width={400} height={500} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#666]">One-shot prompting</p>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image83.png`} alt="AI generated model - few-shot" width={400} height={500} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#666]">Few-shot prompting</p>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image84.png`} alt="AI generated model - refined" width={400} height={500} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#666]">Iterative refinement</p>
            </div>
          </div>

          {/* Studio Shot Replacement */}
          <h3 className="text-lg text-white font-light mb-6">스튜디오 촬영의 대체</h3>
          <p className="text-sm text-[#999] leading-8 mb-8">
            AI가 발전하며 기존 디자이너의 영역을 대체하는 부분도 생깁니다.
            목업을 만들고 모델을 섭외해서 촬영했던 스튜디오 샷을
            AI가 대체 가능한 퀄리티로 구현하기 시작했습니다.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image87.jpeg`} alt="Studio shot - woman wearing device" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#666]">Studio Photography</p>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image88.jpeg`} alt="Studio shot - man wearing devices" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#666]">Studio Photography</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image89.jpeg`} alt="AI generated model shot" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#8B5CF6]">AI-Generated</p>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image90.jpeg`} alt="AI generated model shot" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#8B5CF6]">AI-Generated</p>
            </div>
          </div>

          <p className="text-sm text-[#999] leading-8 mb-16">
            스튜디오 촬영을 대체하거나 기존에 만들지 못하는 콘텐츠를 제작하는 데
            AI가 활용되고 있습니다.
          </p>

          {/* Material Specification */}
          <h3 className="text-lg text-white font-light mb-6">AI 소재 사양 적용</h3>
          <p className="text-sm text-[#999] leading-8 mb-8">
            목업 촬영 사진 위에 구체적인 사양을 텍스트로 적어주면,
            AI가 패브릭, 벨크로, 플라스틱 등의 소재 사양을 꽤 정교하게 적용합니다.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image93.JPG`} alt="Mockup photo - before AI" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#666]">Mockup Photo</p>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#1a1a1a]">
              <Image src={`${P}/image96.jpeg`} alt="AI applied material specifications" width={600} height={400} className="w-full h-auto" />
              <p className="bg-[#111] px-3 py-2 font-mono text-[8px] text-[#8B5CF6]">AI Material Applied</p>
            </div>
          </div>

          <div className="bg-[#111] rounded-lg p-8 mb-10 border border-[#1a1a1a]">
            <p className="text-sm text-[#999] leading-8">
              AI 시대에도 여전히 디자이너의 영역이던 부분이
              AI로 가능한 영역으로 빠르게 넘어오고 있습니다.
            </p>
          </div>
        </section>

        {/* ─── Chapter 4: Mindsets ─── */}
        <section className="mb-24">
          <div className="mb-12">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#38BDF8] uppercase mb-3">Chapter 4</p>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-6">AI 시대에 살아남는 디자이너</h2>
            <div className="w-12 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
          </div>

          <blockquote className="text-xl md:text-2xl font-light text-[#ccc] leading-relaxed mb-12 border-l-2 border-[#8B5CF6] pl-6">
            &ldquo;A designer who thrives in the era of AI&rdquo;
          </blockquote>

          <p className="text-sm text-[#999] leading-8 mb-12">
            기존 방식을 고집하지 않는 유연한 태도를 바탕으로 관습의 파괴와 영역의 확장을 두려워하지 않고,
            복잡한 맥락의 이해를 바탕으로 방향성을 정의할 수 있는 디자이너.
            각 AI가 잘 이해할 수 있는 형태로 명령을 내릴 수 있는 프롬프트 엔지니어링 능력이 있고,
            무엇보다 좋은 취향과 디테일에 대한 집착을 바탕으로 밀도 있는 디자인을 만들어내는 디자이너.
          </p>

          {/* Five Competencies */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12">
            {[
              { en: "Flexible\nAttitude", kr: "빠른 기술의 발전에\n대응하는 유연한 태도" },
              { en: "Complex\nContext", kr: "복잡한 맥락 속에서\n방향성을 찾아내는 능력" },
              { en: "Prompt\nEngineering", kr: "각 툴이 잘 알아들을 수 있는\n형태의 명령 능력" },
              { en: "Refined\nTaste", kr: "다양한 프로젝트를 통해\n서서히 만들어지는 좋은 취향" },
              { en: "Obsession\nwith Detail", kr: "한 끗이 다른 밀도 있는\n디자인을 만들어내는 집착" },
            ].map((m, i) => (
              <div key={i} className="p-5 border border-[#1a1a1a] hover:border-[#8B5CF6]/30 transition-colors rounded-lg">
                <p className="text-[11px] font-mono text-[#8B5CF6] whitespace-pre-line leading-6 mb-3">{m.en}</p>
                <p className="text-[10px] text-[#666] whitespace-pre-line leading-5">{m.kr}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Footer ─── */}
        <div className="text-center py-16 border-t border-[#1a1a1a]">
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#555] uppercase mb-4">End of Lecture</p>
          <p className="text-sm text-[#666]">sungchan@seoultech.ac.kr</p>
        </div>
      </div>
    </div>
  );
}
