import NeuralNet from "@/components/NeuralNet";

export default function AIDesign() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <NeuralNet />

      <div className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-16">
            <p className="font-mono text-[10px] tracking-[0.5em] text-[#8B5CF6] uppercase mb-4">AI + Design</p>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
              <span className="gradient-text">AI Design</span>
              <br />
              <span className="text-white">Activities</span>
            </h1>
            <p className="text-sm text-[#666] max-w-2xl leading-8">
              AI가 디자이너를 대체하는 것이 아니라, 복잡한 문제 해결을 위한 든든한
              동료가 되어주고 있습니다. 생성형 AI 디자인 프로세스 강연, 산업 자문,
              정부 R&D 기획 등 다양한 AI 디자인 관련 활동을 이어가고 있습니다.
            </p>
          </div>

          {/* Lectures & Workshops */}
          <section className="mb-16">
            <h2 className="font-mono text-[10px] tracking-[0.3em] text-[#38BDF8] uppercase mb-8 gradient-border-b pb-2">
              AI Design Lectures & Workshops
            </h2>
            <div className="space-y-px">
              {[
                { year: "2025", title: "서울대, KAIST, 홍익대, 국민대, 건국대, 한예종, KDM+ 등 AI Workshop 진행" },
                { year: "2025", title: "Future Design Forum 특별강연" },
                { year: "2025", title: "한국기초조형학회 춘계국제학술대회 기조 강연" },
                { year: "2024–25", title: "삼성전자 MX사업부, CDO, 의료기기사업부 등 주제 강연" },
                { year: "2024", title: "삼성전자 전사 디자이너 대상 AI 특별 강연" },
                { year: "2024", title: "디자인융복합학회 가을 국제학술대회 주제 강연" },
                { year: "2024", title: "서울디자인재단 디자인리더 네트워크, 4인의 디자인리더 제품&AI 부문 대표 발제" },
                { year: "2024", title: "DDP 디자인론칭페어 멘토링, 특별 강연" },
                { year: "2024", title: "코리아그래픽스 초청 강연" },
              ].map((l, i) => (
                <div key={i} className="flex items-baseline gap-6 py-4 border-b border-[#1a1a1a] group hover:bg-[#111] px-4 transition-colors">
                  <span className="font-mono text-[10px] text-[#555] w-16 shrink-0">{l.year}</span>
                  <p className="text-sm text-[#999] leading-7 group-hover:text-[#ccc] transition-colors">{l.title}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Advisory & Jury */}
          <section className="mb-16">
            <h2 className="font-mono text-[10px] tracking-[0.3em] text-[#38BDF8] uppercase mb-8 gradient-border-b pb-2">
              AI Advisory & Jury
            </h2>
            <div className="space-y-px">
              {[
                { year: "2025", title: "산업통상자원부 산업기술기획평가원 AI 자문위원 / 정부 R&D과제 RFP 편집위원" },
                { year: "2025", title: "K-Design Award 제품디자인 심사위원" },
                { year: "2025", title: "한국디자인진흥원 AI 디자인 자격시험 자문위원" },
                { year: "2025", title: "NIA 범정부 UX/UI 혁신 자문위원" },
                { year: "2025–23", title: "삼성디자인멤버십 제품디자인 튜터" },
                { year: "2025", title: "서울인천 코리아디자인멤버십+ 6기 신입 선발 심사위원" },
                { year: "2026", title: "광주 코리아디자인멤버십+ 7기 신입 선발 심사위원" },
              ].map((l, i) => (
                <div key={i} className="flex items-baseline gap-6 py-4 border-b border-[#1a1a1a] group hover:bg-[#111] px-4 transition-colors">
                  <span className="font-mono text-[10px] text-[#555] w-16 shrink-0">{l.year}</span>
                  <p className="text-sm text-[#999] leading-7 group-hover:text-[#ccc] transition-colors">{l.title}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Philosophy */}
          <section className="py-16 border-t border-[#1a1a1a]">
            <div className="max-w-3xl">
              <blockquote className="text-xl md:text-2xl font-light text-[#ccc] leading-relaxed mb-8">
                &ldquo;A designer who thrives in the era of AI&rdquo;
              </blockquote>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {["Flexible\nAttitude","Complex\nContext","Prompt\nEngineering","Refined\nTaste","Detail\nObsession"].map((m) => (
                  <div key={m} className="p-3 border border-[#1a1a1a] hover:border-[#8B5CF6]/30 transition-colors">
                    <p className="text-[10px] font-mono text-[#8B5CF6] whitespace-pre-line leading-6">{m}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
