import Papa from 'papaparse';
import type { MicroElement, AnalysisData } from '@/types';

export const parseCSVFile = async (file: File): Promise<AnalysisData> => {
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

          // Проверяем наличие необходимых колонок
          const requiredColumns = ['name', 'value', 'norm', 'unit'];
          const firstRow = data[0];
          const hasAllColumns = requiredColumns.every((col) =>
            Object.keys(firstRow).some(
              (key) => key.toLowerCase() === col.toLowerCase()
            )
          );

          if (!hasAllColumns) {
            reject(
              new Error(
                `Отсутствуют необходимые колонки. Требуются: ${requiredColumns.join(', ')}`
              )
            );
            return;
          }

          // Парсим данные
          const elements: MicroElement[] = data.map((row: any) => {
            const nameKey = Object.keys(row).find(
              (k) => k.toLowerCase() === 'name'
            )!;
            const valueKey = Object.keys(row).find(
              (k) => k.toLowerCase() === 'value'
            )!;
            const normKey = Object.keys(row).find(
              (k) => k.toLowerCase() === 'norm'
            )!;
            const unitKey = Object.keys(row).find(
              (k) => k.toLowerCase() === 'unit'
            )!;

            const value = parseFloat(row[valueKey]) || 0;
            const norm = parseFloat(row[normKey]) || 0;
            const deficiency = value < norm;

            return {
              name: row[nameKey] || '',
              value,
              norm,
              unit: row[unitKey] || '',
              deficiency,
            };
          });

          // Определяем дефициты
          const deficiencies = elements
            .filter((el) => el.deficiency)
            .map((el) => `${el.name}: ${el.value.toFixed(2)} ${el.unit} (норма: ${el.norm.toFixed(2)} ${el.unit})`);

          // Создаем данные для графиков
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
            elements,
            deficiencies,
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

