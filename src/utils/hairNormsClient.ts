/**
 * Клиентский справочник референсов волос (6 элементов) для демо-режима без БД.
 * Значения совпадают с database/migration_hair_micro_norms.sql
 */
export type HairElementKey = 'copper' | 'sodium' | 'potassium' | 'zinc' | 'selenium' | 'iron';

const ELEMENT_RULES: Array<{ key: HairElementKey; labels: string[] }> = [
  { key: 'copper', labels: ['медь', 'меди', 'copper', 'cu'] },
  { key: 'sodium', labels: ['натрий', 'натрия', 'sodium', 'na'] },
  { key: 'potassium', labels: ['калий', 'калия', 'potassium', 'k'] },
  { key: 'zinc', labels: ['цинк', 'цинка', 'zinc', 'zn'] },
  { key: 'selenium', labels: ['селен', 'селена', 'selenium', 'se'] },
  { key: 'iron', labels: ['железо', 'железа', 'iron', 'fe'] },
];

function normName(s: string) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

export function resolveHairElementKey(rawName: string): HairElementKey | null {
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

const TEXT: Record<
  HairElementKey,
  { label: string; deficitText: string; surplusText: string }
> = {
  copper: {
    label: 'Медь',
    deficitText: 'Сахарный диабет и изменение минерального баланса.',
    surplusText: 'Повышение содержания меди в организме; внешние загрязнения; изменение минерального баланса.',
  },
  sodium: {
    label: 'Натрий',
    deficitText:
      'Изменение баланса электролитов; хронический стресс; особенности диеты; вариации, связанные с обработкой волос.',
    surplusText:
      'Изменение баланса электролитов; изменение функции почек; внешние источники поступления элемента; муковисцидоз.',
  },
  potassium: {
    label: 'Калий',
    deficitText:
      'Хронический алкоголизм; переутомление; нарушения обмена веществ, изменение баланса электролитов.',
    surplusText:
      'Повышенное поступление; изменение метаболизма; возможные ассоциации с рядом заболеваний (см. интерпретацию лаборатории).',
  },
  zinc: {
    label: 'Цинк',
    deficitText:
      'Недостаточное поступление цинка; вегетарианство; сахарный диабет; целиакия; изменение метаболизма цинка.',
    surplusText:
      'Повышение поступления цинка; внешние загрязнения (косметика/шампуни с цинком); изменение метаболизма цинка.',
  },
  selenium: {
    label: 'Селен',
    deficitText: 'Сниженное потребление селена; изменение метаболизма селена.',
    surplusText:
      'Повышенное потребление; промышленное воздействие; селен-содержащие шампуни.',
  },
  iron: {
    label: 'Железо',
    deficitText: 'Изменения баланса железа; воспалительные заболевания кишечника.',
    surplusText:
      'Изменения баланса железа; повышение уровня в волосах при ряде заболеваний; внешние источники загрязнения.',
  },
};

/** refMin, refMax, unit по профилю (как на бэкенде SUBJECT_PROFILES) */
const REF: Record<string, Partial<Record<HairElementKey, { refMin: number; refMax: number; unit: string }>>> = {
  male_0_4: {
    copper: { refMin: 8, refMax: 30, unit: 'мкг/г сухой массы' },
    sodium: { refMin: 100, refMax: 2000, unit: 'мкг/г сухого вещества' },
    potassium: { refMin: 200, refMax: 5000, unit: 'мкг/г сухого вещества' },
    zinc: { refMin: 50, refMax: 500, unit: 'мкг/г сухой массы' },
    selenium: { refMin: 0.25, refMax: 1, unit: 'мкг/г сухой массы' },
    iron: { refMin: 7, refMax: 35, unit: 'мкг/г сухого вещества' },
  },
  female_0_4: {
    copper: { refMin: 8, refMax: 30, unit: 'мкг/г сухой массы' },
    sodium: { refMin: 100, refMax: 2000, unit: 'мкг/г сухого вещества' },
    potassium: { refMin: 200, refMax: 5000, unit: 'мкг/г сухого вещества' },
    zinc: { refMin: 50, refMax: 500, unit: 'мкг/г сухой массы' },
    selenium: { refMin: 0.25, refMax: 1, unit: 'мкг/г сухой массы' },
    iron: { refMin: 7, refMax: 35, unit: 'мкг/г сухого вещества' },
  },
  male_5_11: {
    copper: { refMin: 9, refMax: 40, unit: 'мкг/г сухой массы' },
    sodium: { refMin: 50, refMax: 2000, unit: 'мкг/г сухого вещества' },
    potassium: { refMin: 40, refMax: 2000, unit: 'мкг/г сухого вещества' },
    zinc: { refMin: 125, refMax: 400, unit: 'мкг/г сухой массы' },
    selenium: { refMin: 0.25, refMax: 2, unit: 'мкг/г сухой массы' },
    iron: { refMin: 7, refMax: 40, unit: 'мкг/г сухого вещества' },
  },
  female_5_11: {
    copper: { refMin: 9, refMax: 40, unit: 'мкг/г сухой массы' },
    sodium: { refMin: 50, refMax: 2000, unit: 'мкг/г сухого вещества' },
    potassium: { refMin: 40, refMax: 2000, unit: 'мкг/г сухого вещества' },
    zinc: { refMin: 125, refMax: 400, unit: 'мкг/г сухой массы' },
    selenium: { refMin: 0.25, refMax: 2, unit: 'мкг/г сухой массы' },
    iron: { refMin: 7, refMax: 40, unit: 'мкг/г сухого вещества' },
  },
  male_12_17: {
    copper: { refMin: 9, refMax: 40, unit: 'мкг/г сухой массы' },
    sodium: { refMin: 50, refMax: 2000, unit: 'мкг/г сухого вещества' },
    potassium: { refMin: 40, refMax: 2000, unit: 'мкг/г сухого вещества' },
    zinc: { refMin: 125, refMax: 400, unit: 'мкг/г сухой массы' },
    selenium: { refMin: 0.25, refMax: 2, unit: 'мкг/г сухой массы' },
    iron: { refMin: 7, refMax: 40, unit: 'мкг/г сухого вещества' },
  },
  female_12_17: {
    copper: { refMin: 9, refMax: 50, unit: 'мкг/г сухой массы' },
    sodium: { refMin: 30, refMax: 2500, unit: 'мкг/г сухого вещества' },
    potassium: { refMin: 30, refMax: 1000, unit: 'мкг/г сухого вещества' },
    zinc: { refMin: 140, refMax: 500, unit: 'мкг/г сухой массы' },
    selenium: { refMin: 0.2, refMax: 2, unit: 'мкг/г сухой массы' },
    iron: { refMin: 7, refMax: 70, unit: 'мкг/г сухого вещества' },
  },
  male_18_plus: {
    copper: { refMin: 9, refMax: 40, unit: 'мкг/г сухой массы' },
    sodium: { refMin: 50, refMax: 2000, unit: 'мкг/г сухого вещества' },
    potassium: { refMin: 40, refMax: 2000, unit: 'мкг/г сухого вещества' },
    zinc: { refMin: 125, refMax: 400, unit: 'мкг/г сухой массы' },
    selenium: { refMin: 0.25, refMax: 2, unit: 'мкг/г сухой массы' },
    iron: { refMin: 7, refMax: 40, unit: 'мкг/г сухого вещества' },
  },
  female_18_plus: {
    copper: { refMin: 9, refMax: 50, unit: 'мкг/г сухой массы' },
    sodium: { refMin: 30, refMax: 2500, unit: 'мкг/г сухого вещества' },
    potassium: { refMin: 30, refMax: 1000, unit: 'мкг/г сухого вещества' },
    zinc: { refMin: 140, refMax: 500, unit: 'мкг/г сухой массы' },
    selenium: { refMin: 0.2, refMax: 2, unit: 'мкг/г сухой массы' },
    iron: { refMin: 7, refMax: 70, unit: 'мкг/г сухого вещества' },
  },
};

export function getDemoHairNorm(profileKey: string, elementKey: HairElementKey) {
  const ref = REF[profileKey]?.[elementKey];
  if (!ref) return null;
  const t = TEXT[elementKey];
  return {
    elementKey,
    label: t.label,
    refMin: ref.refMin,
    refMax: ref.refMax,
    unit: ref.unit,
    deficitText: t.deficitText,
    surplusText: t.surplusText,
  };
}

export function classifyHairValue(value: number, refMin: number, refMax: number) {
  if (value < refMin) return 'deficit' as const;
  if (value > refMax) return 'surplus' as const;
  return 'normal' as const;
}
