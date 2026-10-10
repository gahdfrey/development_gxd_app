/**
 * High-alert medicines — drugs where an administration error is likely to
 * cause significant harm (ISMP high-alert list; WHO Medication Without Harm).
 * Giving one on the ward needs a second nurse to independently check and
 * be recorded as witness. Matched as whole words against the active
 * ingredient name.
 */
export const HIGH_ALERT_INGREDIENTS = [
  // Insulins
  "insulin", "actrapid", "mixtard", "glargine", "lispro", "aspart",
  // Concentrated electrolytes
  "potassium chloride", "kcl", "magnesium sulfate", "magnesium sulphate", "sodium chloride 3%", "hypertonic saline", "calcium gluconate",
  // Anticoagulants
  "heparin", "enoxaparin", "warfarin", "rivaroxaban", "apixaban",
  // Opioids
  "morphine", "pethidine", "fentanyl", "tramadol", "pentazocine", "codeine", "oxycodone",
  // Obstetric / sedation / paralysis
  "oxytocin", "misoprostol", "ergometrine", "midazolam", "diazepam", "ketamine", "propofol", "suxamethonium", "vecuronium", "atracurium",
  // Cardiac / vasoactive
  "digoxin", "adrenaline", "epinephrine", "noradrenaline", "dopamine", "dobutamine", "amiodarone",
  // Chemotherapy & others
  "methotrexate", "cyclophosphamide", "vincristine", "quinine",
];

function nameContains(haystack: string, needle: string): boolean {
  const h = ` ${haystack.toLowerCase().replace(/[^a-z0-9%-]+/g, " ")} `;
  const n = needle.toLowerCase().replace(/[^a-z0-9%-]+/g, " ").trim();
  return n.length > 0 && h.includes(` ${n} `);
}

/** True when an ingredient name matches the high-alert list. */
export function isHighAlert(ingredientName: string | null | undefined): boolean {
  if (!ingredientName) return false;
  return HIGH_ALERT_INGREDIENTS.some((m) => nameContains(ingredientName, m));
}
