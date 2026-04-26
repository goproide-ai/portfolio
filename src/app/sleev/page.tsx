"use client";

import { useEffect } from "react";

export default function SleevPage() {
  useEffect(() => {
    // Override nav style for Sleev page — beige translucent
    const nav = document.querySelector("nav");
    if (nav) {
      nav.dataset.originalBg = nav.style.cssText;
      nav.style.cssText =
        "background: rgba(239, 236, 228, 0.85) !important; backdrop-filter: blur(16px) !important; border-bottom: 1px solid rgba(200, 195, 180, 0.3) !important;";
      // Change text colors
      const links = nav.querySelectorAll("a, span, button");
      links.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.dataset.originalColor = htmlEl.style.color;
        if (!htmlEl.classList.contains("gradient-text")) {
          htmlEl.style.color = "#4a4a46";
        }
      });
      // Hamburger lines
      const bars = nav.querySelectorAll("button span");
      bars.forEach((b) => {
        (b as HTMLElement).style.backgroundColor = "#4a4a46";
      });
    }
    return () => {
      if (nav) {
        nav.style.cssText = "";
        const links = nav.querySelectorAll("a, span, button");
        links.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.color = "";
        });
        const bars = nav.querySelectorAll("button span");
        bars.forEach((b) => {
          (b as HTMLElement).style.backgroundColor = "";
        });
      }
    };
  }, []);

  return (
    <div className="w-full" style={{ marginTop: "-64px" }}>
      <iframe
        src="/sleev/index.html"
        className="w-full border-0"
        style={{ height: "100vh", minHeight: "100vh" }}
        title="Sleev — Arm Support Robot"
        allowFullScreen
      />
    </div>
  );
}
