"use client";

import Image from "next/image";
import PulseRings from "@/components/PulseRings";
import { useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

const wdcNews = [
  {
    title: "Busan Metropolitan City designated World Design Capital 2028",
    source: "World Design Organization",
    url: "https://wdo.org/busan-metropolitan-city-designated-world-design-capital-2028/",
  },
  {
    title: "부산이 세계 디자인 수도 됐다... 2028 WDC 최종 선정",
    source: "아시아경제",
    url: "https://www.asiae.co.kr/article/2025072210211767216",
  },
  {
    title: "세계디자인 수도... 항저우 제치고 부산 선정",
    source: "KNN",
    url: "https://news.knn.co.kr/news/article/175495",
  },
  {
    title: "부산시, 2028 세계디자인수도(WDC) 최종 선정",
    source: "브릿지경제",
    url: "https://www.viva100.com/article/20250722500678",
  },
  {
    title: "Busan designated 2028 World Design Capital for urban potential",
    source: "Korea.net",
    url: "https://www.korea.net/NewsFocus/Culture/view?articleId=275698",
  },
  {
    title: "[기고] '2028년 부산 세계 디자인 수도' 지정의 과제",
    source: "부산일보",
    url: "https://www.busan.com/view/busan/view.php?code=2025092115023940664",
  },
  {
    title: "Busan Selected as 2028 World Design Capital, Beating Out Hangzhou",
    source: "Haps Korea",
    url: "https://www.hapskorea.com/busan-selected-as-2028-world-design-capital-beating-out-hangzhou/",
  },
  {
    title: "부산시, 23일부터 '2028 세계디자인수도 부산 주간' 운영",
    source: "헤럴드경제",
    url: "https://biz.heraldcorp.com/article/10697708",
  },
];

export default function Contact() {
  const { isWhite } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/pptx/busan_bgm.mp3");
      audioRef.current.loop = true;
    }
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };
  const email = "sungchan@seoultech.ac.kr";
  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (showEvent) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden py-20 px-6">
        <PulseRings />
        <div className="relative z-10 max-w-4xl mx-auto pt-4">
          {/* Image with title overlay */}
          <div className="mb-10 overflow-hidden rounded-lg relative">
            <Image
              src={isWhite ? "/pptx/busan_city_white.jpg" : "/pptx/busan_city_v2.jpg"}
              alt="Busan World Design Capital 2028"
              width={1400}
              height={700}
              className="w-full h-auto"
            />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <button
                onClick={toggleMusic}
                className="block w-full text-base md:text-2xl font-bold tracking-tight hover:text-[#8B5CF6] transition-colors cursor-pointer text-left"
              style={{ color: "#333" }}
              >
                Congratulations to Busan on being selected as the World Design Capital 2028! {playing ? "♫" : "♪"}
              </button>
            </div>
          </div>

          {/* News */}
          <div className="mb-12 mt-8">
            <h2 className="font-mono text-[10px] tracking-[0.3em] text-[#38BDF8] uppercase mb-6">Related News</h2>
            <div className="space-y-px">
              {wdcNews.map((n, i) => (
                <a
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
                </a>
              ))}
            </div>
          </div>

          {/* Back button */}
          <div className="text-center">
            <button
              onClick={() => setShowEvent(false)}
              className="font-mono text-[10px] tracking-[0.3em] text-[#555] hover:text-[#8B5CF6] transition-colors uppercase"
            >
              ← BACK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden py-20 px-6">
      <PulseRings />

      <div className="relative z-10 max-w-xl w-full">
        {/* CAD frame */}
        <div className="relative p-14 md:p-20">
          <div className="absolute top-0 left-0 w-12 h-12 border-t border-l border-[#2a2a2a]" />
          <div className="absolute top-0 right-0 w-12 h-12 border-t border-r border-[#2a2a2a]" />
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b border-l border-[#2a2a2a]" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-[#2a2a2a]" />

          <p className="font-mono text-[10px] tracking-[0.5em] text-[#8B5CF6] uppercase mb-10">
            Contact
          </p>

          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
            <span className="text-white">Get in</span>{" "}
            <span className="gradient-text">Touch</span>
          </h1>

          <div className="w-12 h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8] mb-12" />

          {/* Contact details */}
          <div className="space-y-10">
            <div>
              <p className="font-mono text-[9px] tracking-[0.35em] text-[#555] uppercase mb-3">Email</p>
              <button
                onClick={copyEmail}
                className="text-base text-white hover:text-[#8B5CF6] transition-colors relative"
              >
                {email}
                {copied && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#8B5CF6] text-white text-xs px-3 py-1 rounded whitespace-nowrap animate-fadeIn">
                    메일주소가 복사되었습니다
                  </span>
                )}
              </button>
            </div>

            <div>
              <p className="font-mono text-[9px] tracking-[0.35em] text-[#555] uppercase mb-3">Affiliation</p>
              <p className="text-sm text-[#999] leading-8">서울과학기술대학교 산업디자인학과</p>
              <p className="text-xs text-[#666] leading-8">Seoul National University of Science and Technology</p>
              <p className="text-xs text-[#666] leading-8">Department of Industrial Design</p>
            </div>

            <div>
              <p className="font-mono text-[9px] tracking-[0.35em] text-[#555] uppercase mb-4">Links</p>
              <div className="flex flex-col gap-4">
                <a
                  href="https://www.instagram.com/sungchan.design"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <span className="w-6 h-[1px] bg-[#333] group-hover:bg-[#8B5CF6] transition-colors" />
                  <span className="font-mono text-xs text-[#666] group-hover:text-[#8B5CF6] transition-colors tracking-[0.1em]">
                    Instagram
                  </span>
                </a>
                <a
                  href="https://www.linkedin.com/in/sungchan-ko-b23b4b8b/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <span className="w-6 h-[1px] bg-[#333] group-hover:bg-[#38BDF8] transition-colors" />
                  <span className="font-mono text-xs text-[#666] group-hover:text-[#38BDF8] transition-colors tracking-[0.1em]">
                    LinkedIn
                  </span>
                </a>
                <a
                  href="https://id.seoultech.ac.kr/introduction/prof?togo=list&menu=2383&profidx=02740"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <span className="w-6 h-[1px] bg-[#333] group-hover:bg-[#8B5CF6] transition-colors" />
                  <span className="font-mono text-xs text-[#666] group-hover:text-[#8B5CF6] transition-colors tracking-[0.1em]">
                    Seoul Tech University
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="font-mono text-[9px] text-[#333] text-center mt-8">
          &copy; 2025 Sungchan Ko. All rights reserved.
        </p>

        {/* WDC Banner */}
        <button onClick={() => setShowEvent(true)} className="mt-12 overflow-hidden rounded-lg w-full hover:opacity-90 transition-opacity">
          <Image
            src="/pptx/wdc_banner.jpg"
            alt="World Design Capital Busan 2028"
            width={1200}
            height={400}
            className="w-full h-auto"
          />
        </button>
      </div>
    </div>
  );
}
