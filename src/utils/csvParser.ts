import Papa from 'papaparse';
import type { MicroElement, AnalysisData } from '@/types';
import {
  resolveHairElementKey,
  getDemoHairNorm,
  classifyHairValue,
  type HairElementKey,
} from '@/utils/hairNormsClient';

const KEY_ORDER: HairElementKey[] = ['copper', 'sodium', 'potassium', 'zinc', 'selenium', 'iron'];

export type ParseCsvOptions = {
  subjectProfile?: string;
};

export const parseCSVFile = async (file: File, opts?: ParseCsvOptions): Promise<AnalysisData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as any[];

          if (data.length === 0) {
            reject(new Error('CSV файл пуст'));
            return;
          }

          const normalize = (s: unknown) =>
            String(s ?? '')
              .trim()
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[^\p{L}\p{N}_]/gu, '');

          const synonyms: Record<'name' | 'value' | 'norm' | 'unit', Set<string>> = {
            name: new Set([
              'name',
              'element',
              'microelement',
              'микроэлемент',
              'элемент',
              'показатель',
              'наименование',
            ]),
            value: new Set(['value', 'val', 'result', 'значение', 'факт', 'уровень', 'результат']),
            norm: new Set(['norm', 'normal', 'reference', 'норма', 'референс', 'эталон', 'min', 'минимум']),
            unit: new Set(['unit', 'units', 'ед', 'единица', 'едизмерения', 'ед_измерения', 'единицы', 'изм']),
          };

          const firstRow = data[0];
          const keys = Object.keys(firstRow);
          const keyByKind: Record<'name' | 'value' | 'norm' | 'unit', string | null> = {
            name: null,
            value: null,
            norm: null,
            unit: null,
          };

          for (const k of keys) {
            const nk = normalize(k);
            (Object.keys(keyByKind) as Array<keyof typeof keyByKind>).forEach((kind) => {
              if (keyByKind[kind]) return;
              if (synonyms[kind].has(nk)) keyByKind[kind] = k;
            });
          }

          if (!keyByKind.name || !keyByKind.value) {
            reject(new Error('Не удалось распознать колонки: нужны название и значение.'));
            return;
          }

          const hasNormCol = !!keyByKind.norm;
          const hasUnitCol = !!keyByKind.unit;
          const subjectProfile = opts?.subjectProfile?.trim() || '';

          if (!hasNormCol && !subjectProfile) {
            reject(
              new Error(
                'Для файла без колонки «норма» выберите профиль (пол + возрастная группа) — по нему считаются референсы ИНВИТРО.'
              )
            );
            return;
          }

          if (!hasNormCol && !hasUnitCol) {
            reject(new Error('Нужна колонка единиц измерения (unit) или минимум 3 колонки: name, value, unit.'));
            return;
          }

          const rows = data.map((row: any) => {
            const name = String(row[keyByKind.name!] ?? '').trim();
            const valueRaw = String(row[keyByKind.value!] ?? '').replace(',', '.');
            const value = parseFloat(valueRaw) || 0;
            const unit = keyByKind.unit ? String(row[keyByKind.unit!] ?? '').trim() : '';
            const normRaw = keyByKind.norm ? String(row[keyByKind.norm!] ?? '').replace(',', '.') : '';
            const normCsv = normRaw ? parseFloat(normRaw) : NaN;
            return { name, value, unit, normCsv: Number.isFinite(normCsv) ? normCsv : null };
          });

          const filtered = rows.filter((r) => r.name || r.unit || r.value);

          const elementsUnsorted: MicroElement[] = filtered.map((row) => {
            const elementKey = resolveHairElementKey(row.name);
            if (!hasNormCol && !elementKey) {
              throw new Error(
                `Показатель «${row.name}» не из поддерживаемого списка (медь, натрий, калий, цинк, селен, железо).`
              );
            }
            let norm = row.normCsv ?? 0;
            let refMin: number | null = null;
            let refMax: number | null = null;
            let balanceStatus: MicroElement['balanceStatus'] = 'normal';
            let deficiency = false;
            let surplus = false;
            let consequenceText: string | null = null;
            const unitOut = row.unit || '';

            if (!hasNormCol && elementKey && subjectProfile) {
              const hair = getDemoHairNorm(subjectProfile, elementKey);
              if (!hair) {
                throw new Error(`Нет демо-референса для профиля «${subjectProfile}», элемент ${elementKey}`);
              }
              refMin = hair.refMin;
              refMax = hair.refMax;
              balanceStatus = classifyHairValue(row.value, hair.refMin, hair.refMax);
              deficiency = balanceStatus === 'deficit';
              surplus = balanceStatus === 'surplus';
              norm = (hair.refMin + hair.refMax) / 2;
              consequenceText =
                balanceStatus === 'deficit'
                  ? hair.deficitText
                  : balanceStatus === 'surplus'
                    ? hair.surplusText
                    : null;
              return {
                name: hair.label,
                value: row.value,
                norm,
                refMin,
                refMax,
                unit: unitOut || hair.unit,
                deficiency,
                surplus,
                balanceStatus,
                consequenceText,
                elementKey,
              };
            }

            if (hasNormCol && elementKey && subjectProfile) {
              const hair = getDemoHairNorm(subjectProfile, elementKey);
              if (hair) {
                refMin = hair.refMin;
                refMax = hair.refMax;
                balanceStatus = classifyHairValue(row.value, hair.refMin, hair.refMax);
                deficiency = balanceStatus === 'deficit';
                surplus = balanceStatus === 'surplus';
                norm = (hair.refMin + hair.refMax) / 2;
                consequenceText =
                  balanceStatus === 'deficit'
                    ? hair.deficitText
                    : balanceStatus === 'surplus'
                      ? hair.surplusText
                      : null;
              } else {
                norm = row.normCsv ?? 0;
                deficiency = row.value < norm;
                balanceStatus = deficiency ? 'deficit' : row.value > norm ? 'surplus' : 'normal';
                surplus = balanceStatus === 'surplus';
              }
            } else {
              norm = row.normCsv ?? 0;
              deficiency = row.value < norm;
              balanceStatus = deficiency ? 'deficit' : row.value > norm ? 'surplus' : 'normal';
              surplus = balanceStatus === 'surplus';
            }

            return {
              name: row.name,
              value: row.value,
              norm,
              refMin,
              refMax,
              unit: unitOut,
              deficiency,
              surplus,
              balanceStatus,
              consequenceText,
              elementKey: elementKey || undefined,
            };
          });

          const orderIndex = (el: MicroElement) => {
            const k = el.elementKey as HairElementKey | undefined;
            if (!k) return 99;
            const i = KEY_ORDER.indexOf(k);
            return i === -1 ? 99 : i;
          };
          const elements = [...elementsUnsorted].sort((a, b) => orderIndex(a) - orderIndex(b));

          const deficiencies = elements
            .filter((el) => el.balanceStatus === 'deficit' || el.deficiency)
            .map(
              (el) =>
                `${el.name}: ${el.value.toFixed(2)} ${el.unit}` +
                (el.refMin != null && el.refMax != null
                  ? ` (референс ${el.refMin}–${el.refMax})`
                  : ` (норма: ${el.norm.toFixed(2)})`) +
                (el.consequenceText ? `. ${el.consequenceText}` : '')
            );

          const surpluses = elements
            .filter((el) => el.balanceStatus === 'surplus' || el.surplus)
            .map(
              (el) =>
                `${el.name}: ${el.value.toFixed(2)} ${el.unit}` +
                (el.refMin != null && el.refMax != null
                  ? ` (референс ${el.refMin}–${el.refMax})`
                  : '') +
                (el.consequenceText ? `. ${el.consequenceText}` : '')
            );

          const charts = [
            {
              type: 'bar' as const,
              labels: elements.map((el) => el.name),
              values: elements.map((el) => el.value),
              title: 'Значения микроэлементов',
            },
          ];

          const analysisData: AnalysisData = {
            id: `analysis-${Date.now()}`,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            subjectProfile: subjectProfile || undefined,
            elements,
            deficiencies,
            surpluses,
            charts,
          };

          resolve(analysisData);
        } catch (error: any) {
          reject(new Error(`Ошибка обработки данных: ${error.message}`));
        }
      },
      error: (error) => {
        reject(new Error(`Ошибка парсинга CSV: ${error.message}`));
      },
    });
  });
};
