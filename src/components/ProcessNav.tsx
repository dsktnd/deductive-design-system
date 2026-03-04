"use client";

import { useEffect, useState } from "react";
import ProjectSelector from "./ProjectSelector";

const NAV_ITEMS = [
  { id: "research", labelEn: "Research", labelJa: "リサーチ", icon: "R" },
  { id: "generate", labelEn: "Generate", labelJa: "生成", icon: "G" },
  { id: "filter", labelEn: "Filter", labelJa: "フィルタリング", icon: "F" },
  { id: "distill", labelEn: "Distill", labelJa: "蒸留", icon: "D" },
];

export default function ProcessNav() {
  const [activeId, setActiveId] = useState("research");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const item of NAV_ITEMS) {
      const el = document.getElementById(item.id);
      if (!el) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(item.id);
          }
        },
        { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => {
      for (const o of observers) o.disconnect();
    };
  }, []);

  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-md">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="font-[family-name:var(--font-dm-serif)] text-base text-slate-100 tracking-wide">
              Deductive Design
            </h1>
            <span className="text-[10px] tracking-wider text-slate-500">
              演繹的デザイン
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <ProjectSelector />
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item, i) => {
            const isActive = activeId === item.id;
            return (
              <div key={item.id} className="flex items-center">
                {i > 0 && (
                  <span className="mx-1 text-slate-600">--&gt;</span>
                )}
                <button
                  onClick={() => handleClick(item.id)}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
                    isActive
                      ? "gradient-accent-subtle text-blue-300 border border-blue-500/30"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? "gradient-accent text-white"
                        : "bg-slate-700 text-slate-400 group-hover:bg-slate-600 group-hover:text-slate-200"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="hidden font-medium sm:inline">{item.labelEn}</span>
                </button>
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
