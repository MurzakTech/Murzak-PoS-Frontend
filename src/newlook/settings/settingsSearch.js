/**
 * Finding a setting by the words an owner would type. Every word typed must appear in an entry's label or its list of plain
 * words (capitals do not matter); the best matches come first, those whose label has the word before those that only list it.
 */
export const searchSettings = (query, entries, limit = 6) => {
  const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const scored = [];
  (entries || []).forEach((entry, index) => {
    const label = entry.label.toLowerCase();
    const all = `${label} ${entry.words.toLowerCase()}`;
    if (!terms.every((term) => all.includes(term))) return;
    const inLabel = terms.filter((term) => label.includes(term)).length;
    scored.push({ entry, inLabel, index });
  });
  scored.sort((a, b) => b.inLabel - a.inLabel || a.index - b.index);
  return scored.slice(0, limit).map((s) => s.entry);
};
