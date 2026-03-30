import Image from "next/image";
import ParticleNet from "@/components/ParticleNet";

export default function About() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleNet />

      <div className="relative z-10 flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">

        {/* ── LEFT: Sticky profile photo ─────────────────────────── */}
        <div className="md:w-[42%] shrink-0 md:sticky md:top-16 md:h-[calc(100vh-4rem)] relative overflow-hidden">
          <Image
            src="/pptx/profile_portrait.jpg"
            alt="Ko Sungchan"
            fill
            priority
            sizes="42vw"
            className="object-cover object-center"
          />
          {/* Right-edge fade into page background */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a0a0a]/70 hidden md:block" />
          {/* Bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 via-transparent to-transparent" />

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
        <div className="flex-1 py-16 px-8 md:px-16 md:pl-20 space-y-14 overflow-y-auto" style={{ paddingLeft: "clamp(1.5rem, 3.5vw, 4rem)" }}>

          {/* Bio */}
          <div>
            <p className="text-[#999] text-sm leading-9 mb-6">
              산업 디자이너이자 AI 디자인 연구자. 삼성전자에서 16년간 혁신적인
              제품 디자인을 이끌며 기술과 디자인의 융합을 선도해 왔습니다.
              현재 서울과학기술대학교 산업디자인학과 교수로 재직하며 차세대
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
              <div className="flex gap-5">
                <span className="font-mono text-[10px] text-[#555] w-24 shrink-0 pt-0.5">2026 –</span>
                <div>
                  <p className="text-sm text-white">서울과학기술대학교</p>
                  <p className="text-xs text-[#666] mt-1 leading-6">산업디자인학과 조교수</p>
                </div>
              </div>
              <div className="flex gap-5">
                <span className="font-mono text-[10px] text-[#555] w-24 shrink-0 pt-0.5">2010 – 2026</span>
                <div>
                  <p className="text-sm text-white">삼성전자 / 삼성리서치</p>
                  <p className="text-xs text-[#666] mt-1 leading-6">Industrial / UX Designer · UXIL</p>
                </div>
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
                "한국기초조형학회 교육분과 이사",
                "한국디자인학회 기업분과 이사",
                "한국디자인혁신협회 이사",
                "산업통상자원부 AI 디자인 자문위원",
                "NIA 범정부 UX/UI 혁신 자문위원",
                "한국디자인진흥원 AI자격시험 자문위원",
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
                <p className="text-4xl font-light text-white mb-3">10</p>
                <p className="text-xs text-[#666] leading-7">기술 특허 — 롤러블폰, 가전제품 등 대표 발명자</p>
              </div>
              <div className="p-6 border border-[#1a1a1a]">
                <p className="text-4xl font-light text-white mb-3">15</p>
                <p className="text-xs text-[#666] leading-7">디자인권 — 자동차 디자인 2건 등 대표 창작자</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
