import type { Premix, ProductType, Recipe, NutritionalInfo } from '@/types';

// Базовые премиксы для обогащения
export const AVAILABLE_PREMIXES: Premix[] = [
  {
    id: 'premix-iron',
    name: 'Премикс железо',
    composition: {
      железо: 15.0,
      витамин_C: 10.0,
    },
    price: 150,
  },
  {
    id: 'premix-zinc',
    name: 'Премикс цинк',
    composition: {
      цинк: 12.0,
      витамин_A: 5.0,
    },
    price: 180,
  },
  {
    id: 'premix-calcium',
    name: 'Премикс кальций',
    composition: {
      кальций: 1200.0,
      витамин_D: 8.0,
    },
    price: 200,
  },
  {
    id: 'premix-magnesium',
    name: 'Премикс магний',
    composition: {
      магний: 450.0,
      витамин_B6: 6.0,
    },
    price: 170,
  },
  {
    id: 'premix-complex',
    name: 'Комплексный премикс',
    composition: {
      железо: 8.0,
      цинк: 6.0,
      кальций: 600.0,
      магний: 200.0,
      витамин_C: 15.0,
      витамин_D: 5.0,
    },
    price: 350,
  },
];

// Базовые пищевые ценности по типам продуктов (на 100г)
export const BASE_NUTRITIONAL_VALUES: Record<ProductType, Omit<NutritionalInfo, 'microelements'>> = {
  chips: {
    calories: 520,
    proteins: 6.0,
    fats: 30.0,
    carbohydrates: 58.0,
  },
  flakes: {
    calories: 380,
    proteins: 8.0,
    fats: 5.0,
    carbohydrates: 75.0,
  },
  snacks: {
    calories: 450,
    proteins: 10.0,
    fats: 20.0,
    carbohydrates: 55.0,
  },
  crackers: {
    calories: 420,
    proteins: 12.0,
    fats: 15.0,
    carbohydrates: 60.0,
  },
};

// Нормы ТР ТС 021/2011 для проверки
export const TRTS021_NORMS = {
  железо: { min: 14.0, max: 18.0, unit: 'мг/кг' },
  цинк: { min: 9.0, max: 12.0, unit: 'мг/кг' },
  кальций: { min: 800.0, max: 1200.0, unit: 'мг/кг' },
  магний: { min: 350.0, max: 450.0, unit: 'мг/кг' },
  медь: { min: 1.0, max: 1.5, unit: 'мг/кг' },
  селен: { min: 0.06, max: 0.1, unit: 'мг/кг' },
};

// Расчет пищевой ценности на основе базовых значений и премиксов
export const calculateNutritionalValue = (
  productType: ProductType,
  selectedPremixes: Premix[]
): NutritionalInfo => {
  const base = BASE_NUTRITIONAL_VALUES[productType];
  const microelements: Record<string, number> = {};

  // Суммируем микроэлементы из премиксов
  selectedPremixes.forEach((premix) => {
    Object.entries(premix.composition).forEach(([element, value]) => {
      microelements[element] = (microelements[element] || 0) + value;
    });
  });

  return {
    ...base,
    microelements,
  };
};

// Проверка соответствия ТР ТС 021/2011
export const checkTRTS021Compliance = (
  nutritionalValue: NutritionalInfo
): { trts021: boolean; issues: string[] } => {
  const issues: string[] = [];

  Object.entries(nutritionalValue.microelements).forEach(([element, value]) => {
    const norm = TRTS021_NORMS[element as keyof typeof TRTS021_NORMS];
    if (norm) {
      if (value < norm.min) {
        issues.push(
          `${element}: ${value.toFixed(2)} ${norm.unit} ниже нормы (минимум ${norm.min} ${norm.unit})`
        );
      } else if (value > norm.max) {
        issues.push(
          `${element}: ${value.toFixed(2)} ${norm.unit} выше нормы (максимум ${norm.max} ${norm.unit})`
        );
      }
    }
  });

  return {
    trts021: issues.length === 0,
    issues,
  };
};

