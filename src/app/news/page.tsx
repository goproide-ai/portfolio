import Link from "next/link";
import StaticNoise from "@/components/StaticNoise";
import FeaturedNewsCard from "@/components/FeaturedNewsCard";

const featured = [
  {
    id: "folin",
    title: "폴인(fol:in) 인터뷰",
    source: "중앙일보 폴인",
    desc: '"AI가 일 줄였다는 건 착각" — 고성찬 삼성전자 디자이너의 AI 활용법. 삼성전자 산업 디자이너에서 교수로, AI 시대에 디자이너가 갖춰야 할 역량에 대한 깊이 있는 인터뷰.',
    url: "https://www.folin.co/article/13067",
    img: "/pptx/folin.jpg",
    accent: "#8B5CF6",
  },
  {
    id: "donga",
    title: "제60회 대한민국디자인전람회 대통령상 수상",
    source: "동아일보",
    desc: "노영하 디자이너와의 협업 프로젝트 'Sleev'으로 2025 대한민국디자인전람회 최고상인 대통령상(대상)을 수상. 착용형 팔 보조 로봇 디자인.",
    url: "https://www.donga.com/news/Economy/article/all/20251114/132771221/1",
    img: "/pptx/image89.jpeg",
    accent: "#38BDF8",
  },
] as const;

const others = [
  {
    title: "삼성전자 고성찬 디자이너, K-디자인 어워드 2025 심사위원 위촉",
    source: "헤럴드경제",
    url: "https://heraldk.com/2025/04/10/%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90-%EA%B3%A0%EC%84%B1%EC%B0%AC-%EB%94%94%EC%9E%90%EC%9D%B4%EB%84%88-k-%EB%94%94%EC%9E%90%EC%9D%B8-%EC%96%B4%EC%9B%8C%EB%93%9C-2025-%EC%8B%AC%EC%82%AC%EC%9C%84/",
  },
  {
    title: "'2024 대전디자인페스타' AI 디자인 성공포럼 연사",
    source: "헬로디디",
    url: "https://www.hellodd.com/news/articleView.html?idxno=106197",
  },
  {
    title: "건국대학교 AI 제품 디자인 워크샵 초청 강연",
    source: "뉴시스",
    url: "https://www.newsis.com/view/NISX20241203_0002982146",
  },
  {
    title: "[생성형 AI 특강] 삼성전자 고성찬, 배민관 디자이너",
    source: "국민대학교 AI디자인학과",
    url: "https://cms.kookmin.ac.kr/aidesign/etc-board/board02.do?mode=view&articleNo=5917320",
  },
  {
    title: "삼성리서치, E&I랩 신설… 고성찬 디자이너 팀 포함",
    source: "이데일리",
    url: "https://m.edaily.co.kr/News/Read?newsId=02702726629080736&mediaCodeNo=257",
  },
  {
    title: "경남정보대 창의융합포럼 연사 — 'AI 시대, 디자이너의 역할'",
    source: "아시아경제",
    url: "https://www.asiae.co.kr/article/2025122215134682320",
  },
  {
    title: "경북 디자인 AI 포럼 — 'Generation AI Mindset' 발표",
    source: "전자신문",
    url: "https://www.etnews.com/20251121000315",
  },
  {
    title: "광주디자인진흥원 AI 업스킬링 세미나 — 생성형 AI 디자인 프로세스 강연",
    source: "전자신문",
    url: "https://www.etnews.com/20250720000090",
  },
  {
    title: "한양대 ISDW 2025 국제 디자인 워크샵 강사",
    source: "중앙이코노미뉴스",
    url: "https://www.joongangenews.com/news/articleView.html?idxno=446475",
  },
  {
    title: "전북 디자인포럼 — '디자인 AI 또는 AI에 의한 디자인'",
    source: "전자신문",
    url: "https://www.etnews.com/20250619000101",
  },
  {
    title: "대전디자인진흥원 생성형 AI 교육 강사",
    source: "한국경제",
    url: "https://www.hankyung.com/article/2024112274515",
  },
  {
    title: "국민대 생성형AI 워크샵 — 삼성전자 현장 방문 및 강의",
    source: "헤럴드경제",
    url: "https://biz.heraldcorp.com/article/3451352",
  },
  {
    title: "대전디자인진흥원 AI 꿈돌이 콘텐츠 기획 자문",
    source: "전자신문",
    url: "https://www.etnews.com/20250702000142",
  },
];

export default function News() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <StaticNoise />

      <div className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="font-mono text-[10px] tracking-[0.5em] text-[#8B5CF6] uppercase mb-4">Press & Media</p>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight gradient-text mb-4">News</h1>
            <p className="text-sm text-[#666] max-w-lg leading-7">
              고성찬 디자이너의 활동과 관련된 뉴스 및 미디어 보도입니다.
            </p>
          </div>

          {/* Featured */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {featured.map((n) => (
              <FeaturedNewsCard key={n.id} {...n} />
            ))}
          </div>

          {/* Other */}
          <h2 className="font-mono text-[10px] tracking-[0.3em] text-[#38BDF8] uppercase mb-6">More Coverage</h2>
          <div className="space-y-px">
            {others.map((n, i) => (
              <Link
                key={i}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-6 py-5 px-4 bg-[#0a0a0a] border-b border-[#1a1a1a] hover:bg-[#111] transition-colors"
              >
                <div className="w-10 h-10 border border-[#2a2a2a] flex items-center justify-center shrink-0">
                  <span className="font-mono text-[9px] text-[#555]">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[9px] text-[#555] mb-1">{n.source}</p>
                  <h3 className="text-sm text-[#ccc] group-hover:text-[#8B5CF6] transition-colors leading-6">{n.title}</h3>
                </div>
                <span className="font-mono text-[10px] text-[#444] group-hover:text-[#8B5CF6] group-hover:translate-x-1 transition-all shrink-0">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
