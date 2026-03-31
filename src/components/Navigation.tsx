"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/works", label: "Works" },
  { href: "/ai-design", label: "Activities" },
  { href: "/news", label: "News" },
  { href: "/contact", label: "Contact" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1a1a1a]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm tracking-[0.3em] text-[#999] hover:text-white transition-colors">
          SUNGCHAN KO
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs tracking-[0.15em] uppercase transition-colors relative ${
                pathname === item.href
                  ? "text-white"
                  : "text-[#666] hover:text-[#999]"
              }`}
            >
              {item.label}
              {pathname === item.href && (
                <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8]" />
              )}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={`w-5 h-[1px] bg-[#999] transition-transform ${mobileOpen ? "rotate-45 translate-y-[4px]" : ""}`} />
          <span className={`w-5 h-[1px] bg-[#999] transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`w-5 h-[1px] bg-[#999] transition-transform ${mobileOpen ? "-rotate-45 -translate-y-[4px]" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#1a1a1a] animate-fadeIn">
          <div className="px-6 py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`text-sm tracking-[0.15em] uppercase transition-colors ${
                  pathname === item.href ? "text-white" : "text-[#666]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
