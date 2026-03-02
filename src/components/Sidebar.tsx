"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/research", labelEn: "Research", labelJa: "リサーチ", icon: "R" },
  { href: "/generate", labelEn: "Generate", labelJa: "生成", icon: "G" },
  { href: "/filter", labelEn: "Filter", labelJa: "フィルタリング", icon: "F" },
  { href: "/distill", labelEn: "Distill", labelJa: "蒸留", icon: "D" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-5">
        <h1 className="text-sm font-semibold tracking-widest text-zinc-100 uppercase">
          Deductive Design
        </h1>
        <p className="mt-0.5 text-xs tracking-wider text-zinc-500">
          演繹的デザイン
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors ${
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
              <div className="flex flex-col">
                <span className="font-medium leading-tight">
                  {item.labelEn}
                </span>
                <span
                  className={`text-[10px] leading-tight ${
                    isActive ? "text-zinc-400" : "text-zinc-600"
                  }`}
                >
                  {item.labelJa}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 px-5 py-4">
        <p className="text-[10px] tracking-wider text-zinc-600">PROCESS</p>
        <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
          <span className="text-zinc-300">R</span>
          <span>--&gt;</span>
          <span className="text-zinc-300">G</span>
          <span>--&gt;</span>
          <span className="text-zinc-300">F</span>
          <span className="mx-1 text-zinc-700">|</span>
          <span className="text-zinc-300">D</span>
        </div>
        <div className="mt-1 flex items-center text-[10px] text-zinc-600">
          <span>spiral</span>
          <span className="mx-1">:</span>
          <span>R &lt;-&gt; G &lt;-&gt; F</span>
        </div>
      </div>
    </aside>
  );
}
