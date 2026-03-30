"use client";

import Image from "next/image";
import Link from "next/link";

interface Props {
  id: string;
  title: string;
  source: string;
  desc: string;
  url: string;
  img: string | null;
  accent: string;
}

export default function FeaturedNewsCard({ id, title, source, desc, url, img, accent }: Props) {
  return (
    <Link href={url} target="_blank" rel="noopener noreferrer" className="group block">
      <div
        className="h-full border bg-[#0d0d0d] transition-all duration-300 hover:-translate-y-1"
        style={{ borderColor: `${accent}30` }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = `${accent}70`;
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${accent}15`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = `${accent}30`;
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        {/* Thumbnail */}
        <div className="relative w-full h-52 overflow-hidden bg-[#111]">
          {img ? (
            <Image
              src={img}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-3"
              style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)" }}
            >
              <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6]/60 flex items-center justify-center">
                <span className="text-2xl font-bold text-[#8B5CF6]">F</span>
              </div>
              <span className="font-mono text-xs text-[#8B5CF6]/80 tracking-[0.3em]">fol:in</span>
              <span className="font-mono text-[9px] text-[#555] tracking-[0.2em]">중앙일보</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent" />
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="font-mono text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 border"
              style={{ color: accent, borderColor: `${accent}40` }}
            >
              Featured
            </span>
            <span className="font-mono text-[9px] text-[#555]">{source}</span>
          </div>

          <h3 className="text-base font-light text-white mb-3 leading-7 group-hover:text-[#8B5CF6] transition-colors">
            {title}
          </h3>

          <p className="text-xs text-[#666] leading-7">{desc}</p>

          <div className="mt-5 flex items-center gap-2 text-[10px] font-mono text-[#555]">
            <span>Read Article</span>
            <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
