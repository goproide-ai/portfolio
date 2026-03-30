import Image from "next/image";
import HexGrid from "@/components/HexGrid";

const projects = [
  {
    id: "sleev",
    num: "01",
    title: "SLEEV",
    sub: "Personal Project · 2025",
    category: "Industrial Design",
    awards: ["2025 Korea Design Exhibition — Presidential Award (Grand Prize)", "2025 Red Dot Design Award, Winner", "2025 Busan International Design Award, Silver", "2025 Daejeon Design Award, Gold"],
    img: "/pptx/image88.jpeg",
    role: "Industrial Design 50%",
  },
  {
    id: "n3",
    num: "02",
    title: "N+3 APPLIANCES",
    sub: "Samsung Electronics · 2024",
    category: "Industrial Design",
    awards: ["2024 삼성전자 베스트디자인어워즈 대상"],
    img: "/pptx/image4.png",
    role: "Industrial Design 100%",
  },
  {
    id: "exofit",
    num: "03",
    title: "EXO-FIT",
    sub: "Samsung Research · 2023",
    category: "Industrial Design",
    awards: [],
    img: "/pptx/image5.png",
    imgFit: "cover-top" as const,
    imgBg: "black" as const,
    role: "Design Directing 100%",
    patent: "3 Patents Application Completed",
    paper: 'IEEE Xplore: "Design of a Cable-Driven Wearable Fitness Device for Upper Limb Exercise"',
  },
  {
    id: "ai-exp",
    num: "04",
    title: "AI EXPERIENCE",
    sub: "Samsung Research · 2022",
    category: "Exhibition Design\nCharacter Design\nIndustrial Design\nMovie Directing",
    awards: ["Samsung Electronics Mosaic Grand Discussion Excellence Idea"],
    img: "/pptx/image6.png",
    imgFit: "contain" as const,
    imgBg: "black" as const,
    role: "Design Directing 100%",
  },
  {
    id: "gems",
    num: "05",
    title: "GEMS / NEXT GEMS",
    sub: "Samsung Electronics · 2020",
    category: "Industrial Design",
    awards: ["iF 2020 Design Professional Concept Winner"],
    img: "/pptx/image9.png",
    imgFit: "contain" as const,
    imgBg: "black" as const,
    role: "Industrial Design 100%",
  },
  {
    id: "air",
    num: "06",
    title: "AIR POCKET",
    sub: "Samsung Research · 2021",
    category: "Design Directing",
    awards: ["Samsung Electronics Mosaic Grand Discussion Grand Prize"],
    img: "/pptx/image10.png",
    img2: "/pptx/image12.png",
    imgFit: "contain" as const,
    role: "Design Directing 100%",
    patent: "Oxygen cans and mask using porous materials",
  },
  {
    id: "rollable",
    num: "07",
    title: "ROLLABLE PHONE",
    sub: "Samsung Electronics · 2019",
    category: "Working Prototype",
    awards: [],
    img: "/pptx/image8.png",
    role: "Industrial Design 25% / Mechanical Engineering 50%",
    patent: "3 Patents Filed — Rollable display, expansion structure, camera system",
  },
  {
    id: "cockpit",
    num: "08",
    title: "DIGITAL COCKPIT",
    sub: "Samsung Electronics · 2018",
    category: "Automotive Design",
    awards: [],
    img: "/pptx/image7.png",
    role: "Exterior & Interior Design 25% / Mechanical Design 25%",
    patent: "Apparatus and method for controlling a side mirror system for a vehicle",
  },
];

export default function Works() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HexGrid />

      <div className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-16">
            <p className="font-mono text-[10px] tracking-[0.5em] text-[#8B5CF6] uppercase mb-4">Selected Works</p>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight gradient-text">Portfolio</h1>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1a1a1a]">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group bg-[#0a0a0a] overflow-hidden"
                style={{ isolation: "isolate" }}
              >
                {/* Image — zoom is scoped inside this card */}
                <div className="overflow-hidden">
                  {"img2" in p ? (
                    /* Air Pocket: two images overlapping side by side */
                    <div className="relative w-full bg-[#000] overflow-hidden" style={{ aspectRatio: "4/3" }}>
                      {/* Canister — left side */}
                      <div className="absolute inset-0" style={{ right: "32%" }}>
                        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-110" style={{ transform: "scale(1.5)", transformOrigin: "center center" }}>
                          <Image
                            src={p.img}
                            alt={p.title}
                            fill
                            sizes="(max-width: 768px) 40vw, 20vw"
                            className="object-contain"
                          />
                        </div>
                      </div>
                      {/* Mask — right side, less overlap */}
                      <div className="absolute inset-0" style={{ left: "48%" }}>
                        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-110" style={{ transform: "scale(1.95)", transformOrigin: "center center" }}>
                          <Image
                            src={(p as { img2: string }).img2}
                            alt={`${p.title} mask`}
                            fill
                            sizes="(max-width: 768px) 40vw, 20vw"
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />
                      <span className="absolute top-3 left-3 font-mono text-[9px] text-[#666] bg-[#0a0a0a]/80 px-2 py-0.5">{p.num}</span>
                      <span className="absolute top-3 right-3 font-mono text-[8px] text-[#555] bg-[#0a0a0a]/80 px-2 py-0.5 text-right whitespace-pre-line leading-4">{p.category}</span>
                    </div>
                  ) : (
                    <div className={`relative w-full aspect-[4/3] ${"imgBg" in p && p.imgBg === "black" ? "bg-[#000]" : "bg-[#111]"} overflow-hidden`}>
                      <Image
                        src={p.img}
                        alt={p.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className={`${"imgFit" in p && p.imgFit === "contain" ? "object-contain" : "object-cover"} transition-transform duration-500 ease-out group-hover:scale-105`}
                        style={{ transformOrigin: "center center", objectPosition: ("imgFit" in p && p.imgFit === "cover-top") ? "50% 18%" : "center" }}
                      />
                      {/* overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />
                      <span className="absolute top-3 left-3 font-mono text-[9px] text-[#666] bg-[#0a0a0a]/80 px-2 py-0.5">{p.num}</span>
                      <span className="absolute top-3 right-3 font-mono text-[8px] text-[#555] bg-[#0a0a0a]/80 px-2 py-0.5 text-right whitespace-pre-line leading-4">{p.category}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-base font-medium text-white tracking-wide mb-1 group-hover:text-[#8B5CF6] transition-colors">
                    {p.title}
                  </h3>
                  <p className="font-mono text-[9px] text-[#555] mb-3">{p.sub}</p>

                  <p className="font-mono text-[9px] text-[#444] mb-3">{p.role}</p>

                  {p.awards.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {p.awards.map((a, i) => (
                        <p key={i} className="text-[10px] text-[#8B5CF6] leading-5">{a}</p>
                      ))}
                    </div>
                  )}

                  {p.patent && (
                    <p className="mt-2 text-[10px] text-[#38BDF8] leading-5">Patent: {p.patent}</p>
                  )}

                  {p.paper && (
                    <p className="mt-2 text-[10px] text-[#666] leading-5 italic">{p.paper}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
