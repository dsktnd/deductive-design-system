// Shared text similarity utilities (character trigram Jaccard)

export function trigrams(text: string): Set<string> {
  const s = new Set<string>();
  const clean = text.replace(/\s+/g, "");
  for (let i = 0; i <= clean.length - 3; i++) {
    s.add(clean.slice(i, i + 3));
  }
  return s;
}

export function similarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  return intersection / (ta.size + tb.size - intersection); // Jaccard
}
