/**
 * Which ways of paying the till offers (ticket P3-1, AC-19). The owner switches methods on and off in Settings; the server
 * answers with the Mode of Payment names that are on, in order. The till keeps the last answer on this device, so it still
 * has it with no connection, and falls back to its own list whenever there is no usable answer, so selling never stops.
 */
export const modesKey = (company) => `murzak_new_look:till-modes:${company || 'shop'}`;

export const readSavedModes = (company) => {
  try {
    const saved = JSON.parse(localStorage.getItem(modesKey(company)) || '[]');
    return Array.isArray(saved) ? saved.filter((m) => typeof m === 'string') : [];
  } catch (e) {
    return [];
  }
};

export const saveModes = (company, modes) => {
  try {
    localStorage.setItem(modesKey(company), JSON.stringify(modes || []));
  } catch (e) {
    // Not critical: the list is read again the next time the till opens online
  }
};

/**
 * The modes to show: the till's own list (`available`, what the shop can sell with) cut down to what `allowed` (the server's
 * answer) lists, in the server's order. With no answer, or an answer that matches nothing, the till's own list is used.
 */
export const offeredModes = (available, allowed) => {
  if (!Array.isArray(available) || available.length === 0) return available || [];
  if (!Array.isArray(allowed) || allowed.length === 0) return available;
  const kept = allowed.filter((mode) => available.includes(mode));
  return kept.length > 0 ? kept : available;
};
