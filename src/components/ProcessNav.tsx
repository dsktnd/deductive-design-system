"use client";

import { useEffect, useState } from "react";

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
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-sm font-semibold tracking-widest text-zinc-100 uppercase">
            Deductive Design
          </h1>
          <span className="text-[10px] tracking-wider text-zinc-500">
            演繹的デザイン
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item, i) => {
            const isActive = activeId === item.id;
            return (
              <div key={item.id} className="flex items-center">
                {i > 0 && (
                  <span className="mx-1 text-zinc-700">--&gt;</span>
                )}
                <button
                  onClick={() => handleClick(item.id)}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                      isActive
                        ? "bg-zinc-100 text-zinc-900"
                        : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200"
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
