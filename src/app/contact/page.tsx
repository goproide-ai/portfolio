"use client";

import PulseRings from "@/components/PulseRings";
import { useState } from "react";

export default function Contact() {
  const [copied, setCopied] = useState(false);
  const email = "sungchan@seoultech.ac.kr";
  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
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
      </div>
    </div>
  );
}
