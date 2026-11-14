/**
 * Menu options (restaurants and bars): checking a waiter's choice against a dish's option groups, the same way the
 * server does (murzak_pos/api/menu_options_rules.py). Plain logic, tested on its own.
 *
 * groups  [{ name, required, multiple, choices: [{ name, price }] }]
 * picked  { [group name]: [choice names] }
 */

const money = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

/** What is still missing: the name of the first required group with nothing chosen, or null when the choice is complete */
export const missingGroup = (groups, picked) => {
  const g = (groups || []).find((group) => group.required && !((picked || {})[group.name] || []).length);
  return g ? g.name : null;
};

/** The options chosen, the price they add and the words for the ticket and the invoice: { options, extra, text } */
export const chosenOptions = (groups, picked) => {
  const options = [];
  const words = [];
  let extra = 0;
  (groups || []).forEach((group) => {
    const names = (picked || {})[group.name] || [];
    group.choices
      .filter((c) => names.includes(c.name))
      .forEach((c) => {
        const price = Number(c.price) || 0;
        options.push({ group: group.name, name: c.name, price });
        extra += price;
        words.push(price ? `${c.name} (+${money(price)})` : c.name);
      });
  });
  return { options, extra: Math.round(extra * 100) / 100, text: words.join('; ') };
};

/** A tap on a choice: a choose-one group swaps to it (or clears it on a second tap), a choose-several group toggles it */
export const toggleChoice = (picked, group, name) => {
  const current = (picked || {})[group.name] || [];
  const has = current.includes(name);
  const next = group.multiple ? (has ? current.filter((n) => n !== name) : [...current, name]) : has ? [] : [name];
  return { ...(picked || {}), [group.name]: next };
};

// --- the owner's editor -----------------------------------------------------------------------------------

/** One choice as the owner types it in a list: "Extra cheese +50" */
const choiceText = (c) => (Number(c.price) ? `${c.name} +${money(Number(c.price))}` : c.name);

/** The groups as the editor holds them: choices as one comma-separated line */
export const toEditor = (groups) =>
  (groups || []).map((g) => ({ name: g.name, required: Boolean(g.required), multiple: Boolean(g.multiple), choices: (g.choices || []).map(choiceText).join(', ') }));

/** The editor's groups as the server takes them: choices split at commas ("Extra cheese +50" keeps its price for the server to read) */
export const fromEditor = (rows) =>
  (rows || [])
    .filter((r) => String(r.name || '').trim() || String(r.choices || '').trim())
    .map((r) => ({
      name: String(r.name || '').trim(),
      required: Boolean(r.required),
      multiple: Boolean(r.multiple),
      choices: String(r.choices || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    }));
