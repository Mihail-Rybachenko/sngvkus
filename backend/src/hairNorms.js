/**
 * Сопоставление названий из CSV со справочником hair_micro_norms.element_key
 */
const ELEMENT_RULES = [
  { key: 'copper', labels: ['медь', 'меди', 'copper', 'cu'] },
  { key: 'sodium', labels: ['натрий', 'натрия', 'sodium', 'na'] },
  { key: 'potassium', labels: ['калий', 'калия', 'potassium', 'k'] },
  { key: 'zinc', labels: ['цинк', 'цинка', 'zinc', 'zn'] },
  { key: 'selenium', labels: ['селен', 'селена', 'selenium', 'se'] },
  { key: 'iron', labels: ['железо', 'железа', 'iron', 'fe'] },
];

export function normName(s) {
  return (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

export function resolveElementKey(rawName) {
  const n = normName(rawName);
  if (!n) return null;
  for (const r of ELEMENT_RULES) {
    for (const l of r.labels) {
      const ln = normName(l);
      if (n === ln) return r.key;
    }
  }
  for (const r of ELEMENT_RULES) {
    for (const l of r.labels) {
      const ln = normName(l);
      if (ln.length >= 2 && n.includes(ln)) return r.key;
    }
  }
  return null;
}

export async function fetchHairNorm(pool, elementKey, sex, age) {
  const [rows] = await pool.query(
    `SELECT element_key, element_label_ru, ref_min, ref_max, unit, deficit_text, surplus_text
     FROM hair_micro_norms
     WHERE element_key = :elementKey AND sex = :sex AND :age BETWEEN age_min AND age_max
     LIMIT 1`,
    { elementKey, sex, age: Number(age) }
  );
  return rows[0] || null;
}

export function classifyAgainstRef(value, refMin, refMax) {
  const v = Number(value);
  const lo = Number(refMin);
  const hi = Number(refMax);
  if (v < lo) return 'deficit';
  if (v > hi) return 'surplus';
  return 'normal';
}
