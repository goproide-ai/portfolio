"use client";

import { useState } from "react";
import InteractiveGrid from "@/components/InteractiveGrid";

export default function Home() {
  const [theme, setTheme] = useState<"black" | "white">("black");
  const isWhite = theme === "white";

  return (
    <div
      className={`relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden transition-colors duration-500 ${
        isWhite ? "theme-white" : "theme-black"
      }`}
    >
      <InteractiveGrid theme={theme} />

      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <span
          className="font-mono text-[9px] tracking-[0.3em] uppercase transition-colors"
          style={{ color: isWhite ? "#555" : "#666" }}
        >
          Theme
        </span>
        <button
          onClick={() => setTheme("black")}
          className={`w-6 h-6 border transition-all duration-300 ${
            !isWhite
              ? "bg-[#0a0a0a] border-[#8B5CF6]"
              : "bg-[#0a0a0a] border-[#bbb] hover:border-[#888]"
          }`}
          title="Dark"
        />
        <button
          onClick={() => setTheme("white")}
          className={`w-6 h-6 border transition-all duration-300 ${
            isWhite
              ? "bg-[#f0f0f0] border-[#8B5CF6]"
              : "bg-[#f0f0f0] border-[#444] hover:border-[#888]"
          }`}
          title="Light"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 px-8 max-w-5xl w-full">
        <div className="relative p-14 md:p-20">
          {/* CAD corner markers */}
          <div
            className="absolute top-0 left-0 w-10 h-10 border-t border-l transition-colors"
            style={{ borderColor: isWhite ? "#bbb" : "#333" }}
          />
          <div
            className="absolute top-0 right-0 w-10 h-10 border-t border-r transition-colors"
            style={{ borderColor: isWhite ? "#bbb" : "#333" }}
          />
          <div
            className="absolute bottom-0 left-0 w-10 h-10 border-b border-l transition-colors"
            style={{ borderColor: isWhite ? "#bbb" : "#333" }}
          />
          <div
            className="absolute bottom-0 right-0 w-10 h-10 border-b border-r transition-colors"
            style={{ borderColor: isWhite ? "#bbb" : "#333" }}
          />

          <p
            className="font-mono text-[9px] tracking-[0.55em] uppercase mb-6 animate-fadeIn"
            style={{
              color: isWhite ? "#888" : "#555",
              animationDelay: "0.1s",
              animationFillMode: "both",
            }}
          >
            Portfolio
          </p>

          <h1
            className="font-sans font-bold tracking-[-0.02em] leading-none mb-4 animate-fadeInUp"
            style={{
              fontSize: "clamp(3rem, 10vw, 8rem)",
              color: isWhite ? "#111" : "#ededed",
              animationDelay: "0.25s",
              animationFillMode: "both",
            }}
          >
            SUNGCHAN KO
          </h1>

          {/* Role line */}
          <div
            className="flex items-center gap-4 mb-8 animate-fadeIn"
            style={{ animationDelay: "0.45s", animationFillMode: "both" }}
          >
            <div
              className="w-8 h-[1px]"
              style={{ background: "linear-gradient(90deg,#8B5CF6,#38BDF8)" }}
            />
            <span
              className="font-sans text-sm md:text-base font-light tracking-[0.25em]"
              style={{ color: isWhite ? "#555" : "#999" }}
            >
              Industrial Designer
            </span>
            <span
              className="font-mono text-sm md:text-base font-light"
              style={{ color: isWhite ? "#aaa" : "#555" }}
            >
              &amp;
            </span>
            <span
              className="font-sans text-sm md:text-base font-light tracking-[0.25em]"
              style={{ color: isWhite ? "#555" : "#999" }}
            >
              Professor
            </span>
          </div>

          <p
            className="font-mono text-[10px] tracking-[0.2em] animate-fadeIn"
            style={{
              color: isWhite ? "#777" : "#555",
              animationDelay: "0.6s",
              animationFillMode: "both",
            }}
          >
            Seoul National University of Science and Technology
            <br />
            <span style={{ color: isWhite ? "#aaa" : "#3a3a3a" }}>
              Dept. of Industrial Design
            </span>
          </p>
        </div>

        {/* Bottom meta */}
        <div className="flex justify-between px-2">
          <span
            className="font-mono text-[8px]"
            style={{ color: isWhite ? "#bbb" : "#2a2a2a" }}
          >
            00.00 / 00.00
          </span>
          <span
            className="font-mono text-[8px]"
            style={{ color: isWhite ? "#bbb" : "#2a2a2a" }}
          >
            PORTFOLIO 2025
          </span>
          <span
            className="font-mono text-[8px]"
            style={{ color: isWhite ? "#bbb" : "#2a2a2a" }}
          >
            v1.0
          </span>
        </div>
      </div>
    </div>
  );
}
