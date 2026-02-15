"use client";

import ResearchSection from "@/components/sections/ResearchSection";
import GenerateSection from "@/components/sections/GenerateSection";
import FilterSection from "@/components/sections/FilterSection";
import DistillSection from "@/components/sections/DistillSection";

export default function Home() {
  return (
    <div className="space-y-24">
      <section id="research">
        <ResearchSection />
      </section>
      <section id="generate">
        <GenerateSection />
      </section>
      <section id="filter">
        <FilterSection />
      </section>
      <section id="distill">
        <DistillSection />
      </section>
    </div>
  );
}
