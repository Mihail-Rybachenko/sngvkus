import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  CardActionArea,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import { COLORS, DEMO_MODE } from '@/utils/constants';
import { useAppSelector } from '@/store/hooks';
import api from '@/services/api';
import {
  AVAILABLE_PREMIXES,
  calculateNutritionalValue,
  checkTRTS021Compliance,
} from '@/utils/mockData';
import { resolveHairElementKey } from '@/utils/hairNormsClient';
import { downloadWordDocument } from '@/utils/wordExport';
import type { ProductType, Premix, Recipe, NutritionalInfo, AnalysisData, ProjectStatus } from '@/types';
import { findMergedDemoProject } from '@/utils/demoProjectsMerge';
import { canDownloadExports, EXPORT_LOCKED_MESSAGE } from '@/utils/exportPolicy';
import { fetchProjectStatus } from '@/utils/projectStatus';

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface OptionItem {
  id: string;
  label: string;
  image: string;
  priceDelta?: number;
  requiresDeficitKey?: string;
}

function makeFallbackImage(label: string, bg = '#E3F2FD') {
  const safe = encodeURIComponent(label);
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='320'><rect width='100%%' height='100%%' fill='${bg}'/><text x='50%%' y='50%%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%230D47A1' font-family='Arial'>${safe}</text></svg>`;
}

type LocalImageTheme = { emoji: string; bg: string; fg: string; title: string };

const LOCAL_THEMES: Record<string, LocalImageTheme> = {
  'vegetable chips': { emoji: '🥔', bg: '#fff7ed', fg: '#9a3412', title: 'Овощные чипсы' },
  'breakfast cereal flakes': { emoji: '🥣', bg: '#fef9c3', fg: '#854d0e', title: 'Хлопья' },
  'snack bars healthy': { emoji: '🍫', bg: '#ecfccb', fg: '#3f6212', title: 'Снеки' },
  'crispbread rye': { emoji: '🍞', bg: '#f5f5f4', fg: '#44403c', title: 'Хлебцы' },
  potato: { emoji: '🥔', bg: '#fff1d6', fg: '#92400e', title: 'Картофель' },
  'sweet potato': { emoji: '🍠', bg: '#ffedd5', fg: '#9a3412', title: 'Батат' },
  'carrot vegetable': { emoji: '🥕', bg: '#ffedd5', fg: '#9a3412', title: 'Морковь' },
  beetroot: { emoji: '🥬', bg: '#fce7f3', fg: '#9d174d', title: 'Свекла' },
  'oat grain': { emoji: '🌾', bg: '#fef9c3', fg: '#713f12', title: 'Овес' },
  'buckwheat grain': { emoji: '🌰', bg: '#fef3c7', fg: '#78350f', title: 'Гречка' },
  'food dehydration machine': { emoji: '♨️', bg: '#e0f2fe', fg: '#0c4a6e', title: 'Сушка' },
  'industrial baking oven': { emoji: '🔥', bg: '#fee2e2', fg: '#991b1b', title: 'Запекание' },
  'food extrusion process': { emoji: '🏭', bg: '#e0e7ff', fg: '#312e81', title: 'Экструзия' },
  'puffed cereal production': { emoji: '💨', bg: '#e0f2fe', fg: '#0c4a6e', title: 'Взрывная обработка' },
  'deep frying food': { emoji: '🍟', bg: '#ffedd5', fg: '#9a3412', title: 'Фритюр' },
  'sea salt': { emoji: '🧂', bg: '#f1f5f9', fg: '#1e293b', title: 'Соль' },
  'paprika spice': { emoji: '🌶️', bg: '#fee2e2', fg: '#991b1b', title: 'Паприка' },
  'yogurt powder': { emoji: '🥛', bg: '#eef2ff', fg: '#3730a3', title: 'Йогурт' },
  'stevia leaves': { emoji: '🍃', bg: '#dcfce7', fg: '#166534', title: 'Стевия' },
  'lemon zest': { emoji: '🍋', bg: '#fef9c3', fg: '#854d0e', title: 'Лимонная кислинка' },
  'mushroom powder seasoning': { emoji: '🍄', bg: '#f3e8ff', fg: '#581c87', title: 'Умами' },
  'pea protein powder': { emoji: '🟢', bg: '#dcfce7', fg: '#166534', title: 'Гороховый белок' },
  'inulin powder': { emoji: '🧪', bg: '#ecfeff', fg: '#155e75', title: 'Инулин' },
  'probiotic capsules': { emoji: '💊', bg: '#e0e7ff', fg: '#1e3a8a', title: 'Пробиотики' },
  'iron supplement': { emoji: '🧲', bg: '#fee2e2', fg: '#7f1d1d', title: 'Железо' },
  'zinc supplement': { emoji: '⚙️', bg: '#e5e7eb', fg: '#374151', title: 'Цинк' },
  'copper supplement': { emoji: '🔶', bg: '#ffedd5', fg: '#7c2d12', title: 'Медь' },
  'sodium mineral supplement': { emoji: '🧂', bg: '#f1f5f9', fg: '#1e293b', title: 'Натрий' },
  'potassium supplement': { emoji: '🍌', bg: '#fef9c3', fg: '#854d0e', title: 'Калий' },
  'selenium supplement': { emoji: '🧴', bg: '#ede9fe', fg: '#5b21b6', title: 'Селен' },
  'doypack packaging': { emoji: '🛍️', bg: '#f3f4f6', fg: '#111827', title: 'Doy-pack' },
  'cardboard box packaging': { emoji: '📦', bg: '#f3f4f6', fg: '#111827', title: 'Коробка' },
  'food cup packaging': { emoji: '🥤', bg: '#f3f4f6', fg: '#111827', title: 'Стакан' },
};

function localImage(theme: LocalImageTheme): string {
  const safeTitle = theme.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const safeEmoji = theme.emoji.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const words = safeTitle.split(' ');
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
  const titleBlock = line2
    ? `<text x="360" y="272" text-anchor="middle" font-size="27" font-family="Arial" font-weight="700" fill="${theme.fg}">${line1}</text><text x="360" y="306" text-anchor="middle" font-size="27" font-family="Arial" font-weight="700" fill="${theme.fg}">${line2}</text>`
    : `<text x="360" y="292" text-anchor="middle" font-size="30" font-family="Arial" font-weight="700" fill="${theme.fg}">${line1}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${theme.bg}"/><stop offset="100%" stop-color="#ffffff"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="360" cy="146" r="72" fill="#ffffff" fill-opacity="0.86"/><text x="360" y="164" text-anchor="middle" font-size="56">${safeEmoji}</text>${titleBlock}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const photo = (keyword: string) =>
  localImage(
    LOCAL_THEMES[keyword] || { emoji: '🍽️', bg: '#f3f4f6', fg: '#111827', title: keyword }
  );

const STEPS = [
  'Тип продукта',
  'Базовая матрица',
  'Термообработка',
  'Вкус и покрытие',
  'Функциональные добавки',
  'Упаковка',
  'Расчёт и результат',
];

const PRODUCT_SEED: Array<{ id: ProductType; label: string; baseCost: number }> = [
  { id: 'chips', label: 'Чипсы', baseCost: 95 },
  { id: 'flakes', label: 'Хлопья', baseCost: 120 },
  { id: 'snacks', label: 'Снеки', baseCost: 130 },
  { id: 'crackers', label: 'Хлебцы', baseCost: 110 },
];
const PRODUCT_OPTIONS: Array<{ id: ProductType; label: string; image: string; baseCost: number }> =
  PRODUCT_SEED.map((p) => ({
    ...p,
    image:
      p.id === 'chips'
        ? photo('vegetable chips')
        : p.id === 'flakes'
          ? photo('breakfast cereal flakes')
          : p.id === 'snacks'
            ? photo('snack bars healthy')
            : photo('crispbread rye'),
  }));

const BASE_MATRIX_OPTIONS: OptionItem[] = [
  { id: 'potato', label: 'Картофель', image: photo('potato'), priceDelta: 8 },
  { id: 'sweet_potato', label: 'Батат', image: photo('sweet potato'), priceDelta: 14 },
  { id: 'carrot', label: 'Морковь', image: photo('carrot vegetable'), priceDelta: 6 },
  { id: 'beet', label: 'Свекла', image: photo('beetroot'), priceDelta: 7 },
  { id: 'oats', label: 'Овес', image: photo('oat grain'), priceDelta: 10 },
  { id: 'buckwheat', label: 'Гречка', image: photo('buckwheat grain'), priceDelta: 11 },
];

const THERMAL_OPTIONS: OptionItem[] = [
  { id: 'dehydration', label: 'Сушка', image: photo('food dehydration machine'), priceDelta: 6 },
  { id: 'baking', label: 'Запекание', image: photo('industrial baking oven'), priceDelta: 5 },
  { id: 'extrusion', label: 'Экструзия', image: photo('food extrusion process'), priceDelta: 15 },
  { id: 'puffed', label: 'Взрывная обработка', image: photo('puffed cereal production'), priceDelta: 12 },
  { id: 'fried', label: 'Во фритюре', image: photo('deep frying food'), priceDelta: 9 },
];

const FLAVOR_OPTIONS: OptionItem[] = [
  { id: 'salt', label: 'Соль', image: photo('sea salt'), priceDelta: 1 },
  { id: 'paprika', label: 'Паприка', image: photo('paprika spice'), priceDelta: 2 },
  { id: 'yogurt', label: 'Йогурт', image: photo('yogurt powder'), priceDelta: 4 },
  { id: 'stevia', label: 'Стевия', image: photo('stevia leaves'), priceDelta: 3 },
  { id: 'lemon', label: 'Лимонная кислинка', image: photo('lemon zest'), priceDelta: 2 },
  { id: 'umami', label: 'Умами (дрожжи/грибы)', image: photo('mushroom powder seasoning'), priceDelta: 4 },
];

const FUNCTIONAL_OPTIONS: OptionItem[] = [
  { id: 'protein_pea', label: 'Белок гороховый', image: photo('pea protein powder'), priceDelta: 9 },
  { id: 'fiber_inulin', label: 'Клетчатка (инулин)', image: photo('inulin powder'), priceDelta: 6 },
  { id: 'probiotics', label: 'Пробиотики', image: photo('probiotic capsules'), priceDelta: 8 },
  { id: 'micro_iron', label: 'Железо (при дефиците)', image: photo('iron supplement'), priceDelta: 5, requiresDeficitKey: 'iron' },
  { id: 'micro_zinc', label: 'Цинк (при дефиците)', image: photo('zinc supplement'), priceDelta: 5, requiresDeficitKey: 'zinc' },
  { id: 'micro_copper', label: 'Медь (при дефиците)', image: photo('copper supplement'), priceDelta: 4, requiresDeficitKey: 'copper' },
  { id: 'micro_sodium', label: 'Натрий (при дефиците)', image: photo('sodium mineral supplement'), priceDelta: 3, requiresDeficitKey: 'sodium' },
  { id: 'micro_potassium', label: 'Калий (при дефиците)', image: photo('potassium supplement'), priceDelta: 4, requiresDeficitKey: 'potassium' },
  { id: 'micro_selenium', label: 'Селен (при дефиците)', image: photo('selenium supplement'), priceDelta: 4, requiresDeficitKey: 'selenium' },
];

const PACKAGING_TYPES: OptionItem[] = [
  { id: 'doypack', label: 'Пакет (doy-pack)', image: photo('doypack packaging'), priceDelta: 6 },
  { id: 'box', label: 'Коробка', image: photo('cardboard box packaging'), priceDelta: 8 },
  { id: 'cup', label: 'Стакан', image: photo('food cup packaging'), priceDelta: 7 },
];

const PACK_SIZES = ['20г', '40г', '100г', '500г'];
const ATM_OPTIONS = ['Обычная', 'Азот'];

function normalizeText(s: string) {
  return String(s || '').trim().toLowerCase().replace(/ё/g, 'е');
}

const TRACKED_ELEMENT_KEYS = new Set(['copper', 'sodium', 'potassium', 'zinc', 'selenium', 'iron']);

function mapDeficitKeys(analysis: AnalysisData | null): Set<string> {
  const keys = new Set<string>();
  if (!analysis) return keys;

  for (const line of analysis.deficiencies || []) {
    const head = String(line).split(':')[0]?.trim() || String(line);
    const k = resolveHairElementKey(head);
    if (k && TRACKED_ELEMENT_KEYS.has(k)) keys.add(k);
  }

  if (!analysis.elements?.length) return keys;
  for (const el of analysis.elements) {
    const isDeficit = el.balanceStatus === 'deficit' || el.deficiency;
    if (!isDeficit) continue;
    const rawKey = (el as { elementKey?: string }).elementKey;
    if (rawKey && TRACKED_ELEMENT_KEYS.has(rawKey)) {
      keys.add(rawKey);
      continue;
    }
    const n = normalizeText(el.name);
    if (n.includes('желез')) keys.add('iron');
    else if (n.includes('цинк')) keys.add('zinc');
    else if (n.includes('медь')) keys.add('copper');
    else if (n.includes('мед') && !n.includes('мёд')) keys.add('copper');
    else if (n.includes('натри')) keys.add('sodium');
    else if (n.includes('кали')) keys.add('potassium');
    else if (n.includes('селен')) keys.add('selenium');
    else if (n.includes('copper') || n === 'cu') keys.add('copper');
    else if (n.includes('zinc') || n === 'zn') keys.add('zinc');
    else if (n.includes('iron') || n.includes('fe')) keys.add('iron');
    else if (n.includes('sodium') || n === 'na') keys.add('sodium');
    else if (n.includes('potassium') || n === 'k') keys.add('potassium');
    else if (n.includes('selenium') || n === 'se') keys.add('selenium');
  }
  return keys;
}

export const RecipeBuilderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const projectId = searchParams.get('projectId');
  const [step, setStep] = useState<WizardStep>(0);
  const [productType, setProductType] = useState<ProductType>('chips');
  const [baseMatrix, setBaseMatrix] = useState<string>('potato');
  const [thermalMethod, setThermalMethod] = useState<string>('dehydration');
  const [flavors, setFlavors] = useState<string[]>([]);
  const [functionalAdditives, setFunctionalAdditives] = useState<string[]>([]);
  const [packagingType, setPackagingType] = useState<string>('doypack');
  const [packagingSize, setPackagingSize] = useState<string>('40г');
  const [packagingAtmosphere, setPackagingAtmosphere] = useState<string>('Обычная');
  const [availableDeficits, setAvailableDeficits] = useState<Set<string>>(new Set());
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisData | null>(null);

  const [selectedPremixes, setSelectedPremixes] = useState<Premix[]>([]);
  const [nutritionalValue, setNutritionalValue] = useState<NutritionalInfo | null>(null);
  const [compliance, setCompliance] = useState<{ trts021: boolean; issues: string[] } | null>(null);
  const [pricePerKg, setPricePerKg] = useState<number>(0);
  const [pricePerPack, setPricePerPack] = useState<number>(0);
  const [moq, setMoq] = useState<number>(500);
  const [productionDays, setProductionDays] = useState<number>(7);
  const [saved, setSaved] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    if (DEMO_MODE) return;
    if (!projectId) {
      setAccessError('Сначала создайте проект и пройдите этап анализа.');
      setProjectStatus(null);
      return;
    }
    fetchProjectStatus(projectId).then((status) => {
      setProjectStatus(status);
      if (status === 'completed') {
        setAccessError('Проект завершён — редактирование рецептуры недоступно.');
      } else {
        setAccessError(null);
      }
    });
  }, [projectId, user?.role]);

  useEffect(() => {
    if (!projectId) return;
    if (DEMO_MODE) {
      const project = findMergedDemoProject(projectId);
      setProjectStatus((project?.status as ProjectStatus) ?? null);
      const analysis = (project?.analysis || null) as AnalysisData | null;
      const deficits = mapDeficitKeys(analysis);
      setLatestAnalysis(analysis);
      setAvailableDeficits(deficits);
      if (project) {
        const st = project.status as string;
        if (st === 'completed') {
          setAccessError('Проект завершён — редактирование рецептуры недоступно.');
        } else {
          setAccessError(null);
        }
      }
      return;
    }
    api
      .get(`/analysis/project/${projectId}/latest`)
      .then((resp) => {
        const analysis = resp.data as AnalysisData;
        const deficits = mapDeficitKeys(analysis);
        setLatestAnalysis(analysis);
        setAvailableDeficits(deficits);
      })
      .catch(() => {
        setLatestAnalysis(null);
        setAvailableDeficits(new Set());
      });
  }, [projectId, user?.role]);

  // Подгружаем сохранённый конструктор рецептуры при переключении проектов (API-режим)
  useEffect(() => {
    if (DEMO_MODE) return;
    if (!projectId) return;
    api
      .get(`/projects/${projectId}/recipe`)
      .then((resp) => {
        const r = resp.data || {};
        const ctor = r.constructor || {};
        if (ctor.productType) setProductType(ctor.productType);
        if (ctor.baseMatrix) setBaseMatrix(ctor.baseMatrix);
        if (ctor.thermalMethod) setThermalMethod(ctor.thermalMethod);
        if (Array.isArray(ctor.flavors)) setFlavors(ctor.flavors);
        if (Array.isArray(ctor.functionalAdditives)) setFunctionalAdditives(ctor.functionalAdditives);
        if (ctor.packagingType) setPackagingType(ctor.packagingType);
        if (ctor.packagingSize) setPackagingSize(ctor.packagingSize);
        if (ctor.packagingAtmosphere) setPackagingAtmosphere(ctor.packagingAtmosphere);
        if (typeof ctor.pricePerKg === 'number') setPricePerKg(ctor.pricePerKg);
        if (typeof ctor.pricePerPack === 'number') setPricePerPack(ctor.pricePerPack);
        if (typeof ctor.moq === 'number') setMoq(ctor.moq);
        if (typeof ctor.productionDays === 'number') setProductionDays(ctor.productionDays);
      })
      .catch(() => {
        // рецептуры может не быть — это нормально
      });
  }, [projectId]);

  useEffect(() => {
    // Автоматически включаем микро-добавки только по подтвержденным дефицитам.
    setFunctionalAdditives((prev) => {
      const nonMicro = prev.filter((x) => !x.startsWith('micro_'));
      const autoMicro = Array.from(availableDeficits).map((x) => `micro_${x}`);
      return [...nonMicro, ...autoMicro];
    });
  }, [availableDeficits]);

  useEffect(() => {
    const selectedMicro = functionalAdditives
      .filter((id) => id.startsWith('micro_'))
      .map((id) => id.replace('micro_', ''));
    const mappedPremixIds = new Set<string>();
    if (selectedMicro.includes('iron')) mappedPremixIds.add('premix-iron');
    if (selectedMicro.includes('zinc')) mappedPremixIds.add('premix-zinc');
    if (
      selectedMicro.some((x) => ['copper', 'sodium', 'potassium', 'selenium'].includes(x))
    ) {
      mappedPremixIds.add('premix-complex');
    }
    const premixes = AVAILABLE_PREMIXES.filter((p) => mappedPremixIds.has(p.id));
    setSelectedPremixes(premixes);

    const calculated = calculateNutritionalValue(productType, premixes);
    setNutritionalValue(calculated);
    const scopeMap: Record<string, string> = {
      iron: 'железо',
      zinc: 'цинк',
      copper: 'медь',
      selenium: 'селен',
      sodium: 'натрий',
      potassium: 'калий',
    };
    const complianceScope = selectedMicro.map((k) => scopeMap[k]).filter(Boolean);
    const baseCompliance = checkTRTS021Compliance(calculated, complianceScope);
    const keyLabelMap: Record<string, string> = {
      iron: 'Железо',
      zinc: 'Цинк',
      copper: 'Медь',
      sodium: 'Натрий',
      potassium: 'Калий',
      selenium: 'Селен',
    };
    const missingRequired = Array.from(availableDeficits).filter((k) => !selectedMicro.includes(k));
    const missingIssues = missingRequired.map(
      (k) => `Не добавлен обязательный микроэлемент по дефициту: ${keyLabelMap[k] || k}`
    );
    const mergedIssues = [...missingIssues, ...baseCompliance.issues];
    setCompliance({ trts021: mergedIssues.length === 0, issues: mergedIssues });

    const baseCost = PRODUCT_OPTIONS.find((p) => p.id === productType)?.baseCost || 100;
    const matrixCost = BASE_MATRIX_OPTIONS.find((x) => x.id === baseMatrix)?.priceDelta || 0;
    const thermalCost = THERMAL_OPTIONS.find((x) => x.id === thermalMethod)?.priceDelta || 0;
    const flavorCost = flavors.reduce(
      (sum, id) => sum + (FLAVOR_OPTIONS.find((x) => x.id === id)?.priceDelta || 0),
      0
    );
    const additiveCost = functionalAdditives.reduce(
      (sum, id) => sum + (FUNCTIONAL_OPTIONS.find((x) => x.id === id)?.priceDelta || 0),
      0
    );
    const packCost = PACKAGING_TYPES.find((x) => x.id === packagingType)?.priceDelta || 0;
    const totalPerKg = baseCost + matrixCost + thermalCost + flavorCost + additiveCost + packCost;
    setPricePerKg(totalPerKg);

    const sizeGrams = Number(packagingSize.replace(/[^\d]/g, '')) || 40;
    setPricePerPack((totalPerKg / 1000) * sizeGrams);
    setMoq(thermalMethod === 'extrusion' ? 1000 : thermalMethod === 'puffed' ? 800 : 500);
    setProductionDays(thermalMethod === 'fried' ? 5 : thermalMethod === 'extrusion' ? 10 : 7);
  }, [productType, baseMatrix, thermalMethod, flavors, functionalAdditives, packagingType, packagingSize, availableDeficits]);

  const toggleMulti = (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!nutritionalValue || !compliance) return;

    const recipe: Recipe = {
      id: `recipe-${Date.now()}`,
      productType,
      premixes: selectedPremixes,
      nutritionalValue,
      compliance,
    };

    if (DEMO_MODE) {
      const savedRecipes = JSON.parse(localStorage.getItem('recipes') || '[]');
      savedRecipes.push({
        ...recipe,
        constructor: {
          productType,
          baseMatrix,
          thermalMethod,
          flavors,
          functionalAdditives,
          packagingType,
          packagingSize,
          packagingAtmosphere,
          pricePerKg,
          pricePerPack,
          moq,
          productionDays,
        },
      });
      localStorage.setItem('recipes', JSON.stringify(savedRecipes));
      
      if (projectId) {
        const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        const projectIndex = savedProjects.findIndex((p: any) => p.id === projectId);
        if (projectIndex !== -1) {
          savedProjects[projectIndex].status = 'recipe';
          savedProjects[projectIndex].recipe = {
            ...recipe,
            constructor: {
              productType,
              baseMatrix,
              thermalMethod,
              flavors,
              functionalAdditives,
              packagingType,
              packagingSize,
              packagingAtmosphere,
              pricePerKg,
              pricePerPack,
              moq,
              productionDays,
            },
          };
          localStorage.setItem('projects', JSON.stringify(savedProjects));
        }
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return;
    }

    if (!projectId) return;
    try {
      await api.put(`/projects/${projectId}/recipe`, {
        productType,
        premixIds: selectedPremixes.map((p) => p.id),
        nutritionalValue,
        compliance,
        constructor: {
          productType,
          baseMatrix,
          thermalMethod,
          flavors,
          functionalAdditives,
          packagingType,
          packagingSize,
          packagingAtmosphere,
          pricePerKg,
          pricePerPack,
          moq,
          productionDays,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setAccessError('Не удалось сохранить рецептуру на сервере.');
    }
  };

  const handleExportRecipeAnalysisPdf = async () => {
    if (!canDownloadExports(projectStatus)) return;
    if (!nutritionalValue) return;
    const deficits = latestAnalysis
      ? latestAnalysis.elements.filter((e) => e.balanceStatus === 'deficit' || e.deficiency)
      : [];
    const surpluses = latestAnalysis
      ? latestAnalysis.elements.filter((e) => e.balanceStatus === 'surplus' || e.surplus)
      : [];
    downloadWordDocument(`recipe-analysis-${Date.now()}`, 'SngVkus: спецификация рецептуры + анализ', [
      {
        lines: [`Дата: ${new Date().toLocaleString()}`, `Проект: ${projectId || '—'}`],
      },
      {
        heading: 'Параметры рецептуры',
        lines: [
          `Тип продукта: ${productType}`,
          `База: ${baseMatrix}`,
          `Термообработка: ${thermalMethod}`,
          `Вкус/покрытие: ${flavors.join(', ') || '—'}`,
          `Функциональные добавки: ${functionalAdditives.join(', ') || '—'}`,
          `Упаковка: ${packagingType}, ${packagingSize}, атмосфера: ${packagingAtmosphere}`,
        ],
      },
      {
        heading: 'Экономика и нутриенты',
        lines: [
          `Себестоимость 1 кг: ${pricePerKg.toFixed(2)} ₽`,
          `Себестоимость упаковки: ${pricePerPack.toFixed(2)} ₽`,
          `MOQ: ${moq} уп., срок производства: ${productionDays} дней`,
          `Б/Ж/У: ${nutritionalValue.proteins}/${nutritionalValue.fats}/${nutritionalValue.carbohydrates}, ккал: ${nutritionalValue.calories}`,
          ...(compliance?.issues?.length ? compliance.issues.map((x) => `Предупреждение: ${x}`) : []),
        ],
      },
      {
        heading: 'Данные анализа',
        lines: !latestAnalysis
          ? ['Анализ для проекта не найден']
          : [
              `Файл: ${latestAnalysis.fileName}`,
              `Дефициты: ${deficits.length ? deficits.map((d) => d.name).join(', ') : 'не выявлены'}`,
              `Избытки: ${surpluses.length ? surpluses.map((d) => d.name).join(', ') : 'не выявлены'}`,
            ],
      },
    ]);
  };

  const handleSubmitRecipeForExpertReview = async () => {
    setAccessError(null);
    if (!projectId) return;
    if (!compliance?.trts021) {
      setAccessError('Перед подачей на проверку устраните несоответствия рецептуры.');
      return;
    }
    if (DEMO_MODE) {
      const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      const idx = savedProjects.findIndex((p: any) => String(p.id) === String(projectId));
      if (idx !== -1) {
        savedProjects[idx].status = 'recipe_expert_review';
        savedProjects[idx].updatedAt = new Date().toISOString();
        localStorage.setItem('projects', JSON.stringify(savedProjects));
      }
      setProjectStatus('recipe_expert_review');
      setAccessError('Рецептура отправлена эксперту на проверку. Ожидайте одобрения.');
      return;
    }
    try {
      const resp = await api.post(`/projects/${projectId}/workflow`, { action: 'next' });
      const to = (resp.data?.to as ProjectStatus | undefined) || null;
      if (to) setProjectStatus(to);
      if (to === 'recipe_expert_review') {
        setAccessError('Рецептура отправлена эксперту на проверку. Ожидайте одобрения.');
      }
    } catch (e: any) {
      setAccessError(e?.response?.data?.message || e?.message || 'Не удалось подать на проверку эксперту.');
    }
  };

  const canGoNext = useMemo(() => {
    if (step === 0) return !!productType;
    if (step === 1) return !!baseMatrix;
    if (step === 2) return !!thermalMethod;
    if (step === 3) return flavors.length > 0;
    if (step === 4) return functionalAdditives.length > 0;
    if (step === 5) return !!packagingType && !!packagingSize;
    return true;
  }, [step, productType, baseMatrix, thermalMethod, flavors, functionalAdditives, packagingType, packagingSize]);

  const renderChoiceCard = (
    item: OptionItem,
    selected: boolean,
    onClick: () => void,
    disabled = false
  ) => (
    <Card
      key={item.id}
      sx={{
        border: selected ? `2px solid ${COLORS.primary}` : '1px solid #e0e0e0',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <CardActionArea onClick={onClick} disabled={disabled}>
        <CardContent>
          <Box
            component="img"
            src={item.image}
            alt={item.label}
            onError={(e: any) => {
              e.currentTarget.src = makeFallbackImage(item.label);
            }}
            sx={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 1, mb: 1 }}
          />
          <Typography variant="subtitle2">{item.label}</Typography>
          {item.priceDelta ? (
            <Typography variant="caption" color="text.secondary">
              +{item.priceDelta} руб/кг
            </Typography>
          ) : null}
        </CardContent>
      </CardActionArea>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Конструктор рецептур
        </Typography>
        {DEMO_MODE && (
          <Chip label="Демо-режим" color="info" size="small" sx={{ bgcolor: COLORS.secondary, color: 'white' }} />
        )}
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaved(false)}>
          Рецептура сохранена!
        </Alert>
      )}
      {accessError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {accessError}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={step} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

          <Paper sx={{ p: 3 }}>
        {step === 0 && (
          <Grid container spacing={2}>
            {PRODUCT_OPTIONS.map((p) => (
              <Grid item xs={12} sm={6} md={3} key={p.id}>
                {renderChoiceCard(
                  { id: p.id, label: p.label, image: p.image, priceDelta: p.baseCost },
                  productType === p.id,
                  () => setProductType(p.id)
                )}
              </Grid>
            ))}
          </Grid>
        )}

        {step === 1 && (
          <Grid container spacing={2}>
            {BASE_MATRIX_OPTIONS.map((m) => (
              <Grid item xs={12} sm={6} md={4} key={m.id}>
                {renderChoiceCard(m, baseMatrix === m.id, () => setBaseMatrix(m.id))}
              </Grid>
            ))}
          </Grid>
        )}

        {step === 2 && (
          <Grid container spacing={2}>
            {THERMAL_OPTIONS.map((m) => (
              <Grid item xs={12} sm={6} md={4} key={m.id}>
                {renderChoiceCard(m, thermalMethod === m.id, () => setThermalMethod(m.id))}
              </Grid>
            ))}
        </Grid>
        )}

        {step === 3 && (
          <Grid container spacing={2}>
            {FLAVOR_OPTIONS.map((f) => (
              <Grid item xs={12} sm={6} md={4} key={f.id}>
                <Card sx={{ border: flavors.includes(f.id) ? `2px solid ${COLORS.primary}` : '1px solid #e0e0e0' }}>
                  <CardActionArea onClick={() => toggleMulti(f.id, setFlavors)}>
                    <CardContent>
                      <Box
                        component="img"
                        src={f.image}
                        alt={f.label}
                        onError={(e: any) => {
                          e.currentTarget.src = makeFallbackImage(f.label);
                        }}
                        sx={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 1, mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2">{f.label}</Typography>
                        <Checkbox checked={flavors.includes(f.id)} />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {step === 4 && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Микроэлементные добавки доступны только при подтверждённом дефиците по анализу.
              {availableDeficits.size > 0 && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  По последнему анализу открыты: {Array.from(availableDeficits).join(', ')}
                </Typography>
              )}
            </Alert>
            <Grid container spacing={2}>
              {FUNCTIONAL_OPTIONS.map((f) => {
                const disabled = !!f.requiresDeficitKey && !availableDeficits.has(f.requiresDeficitKey);
                return (
                  <Grid item xs={12} sm={6} md={4} key={f.id}>
                    <Card sx={{ border: functionalAdditives.includes(f.id) ? `2px solid ${COLORS.primary}` : '1px solid #e0e0e0', opacity: disabled ? 0.5 : 1 }}>
                      <CardActionArea onClick={() => !disabled && toggleMulti(f.id, setFunctionalAdditives)} disabled={disabled}>
                        <CardContent>
                          <Box
                            component="img"
                            src={f.image}
                            alt={f.label}
                            onError={(e: any) => {
                              e.currentTarget.src = makeFallbackImage(f.label);
                            }}
                            sx={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 1, mb: 1 }}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2">{f.label}</Typography>
                            <Checkbox checked={functionalAdditives.includes(f.id)} disabled={disabled} />
                          </Box>
                          {disabled && f.requiresDeficitKey && (
                            <Typography variant="caption" color="text.secondary">
                              Нет дефицита: {f.requiresDeficitKey}
                            </Typography>
                          )}
                        </CardContent>
                      </CardActionArea>
                  </Card>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}

        {step === 5 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Тип упаковки</Typography>
              <Grid container spacing={2}>
                {PACKAGING_TYPES.map((p) => (
                  <Grid item xs={12} sm={4} key={p.id}>
                    {renderChoiceCard(p, packagingType === p.id, () => setPackagingType(p.id))}
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Размер</InputLabel>
                <Select value={packagingSize} label="Размер" onChange={(e) => setPackagingSize(String(e.target.value))}>
                  {PACK_SIZES.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Атмосфера</InputLabel>
                <Select value={packagingAtmosphere} label="Атмосфера" onChange={(e) => setPackagingAtmosphere(String(e.target.value))}>
                  {ATM_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
        </Grid>
        )}

        {step === 6 && nutritionalValue && compliance && (
          <Grid container spacing={2}>
            {!canDownloadExports(projectStatus) && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  {EXPORT_LOCKED_MESSAGE}
                </Alert>
              </Grid>
            )}
          <Grid item xs={12} md={6}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Показатель</TableCell>
                      <TableCell align="right">Значение</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow><TableCell>Себестоимость (1 кг)</TableCell><TableCell align="right">{pricePerKg.toFixed(2)} ₽</TableCell></TableRow>
                    <TableRow><TableCell>Себестоимость (упаковка)</TableCell><TableCell align="right">{pricePerPack.toFixed(2)} ₽</TableCell></TableRow>
                    <TableRow><TableCell>MOQ</TableCell><TableCell align="right">{moq} уп.</TableCell></TableRow>
                    <TableRow><TableCell>Срок производства</TableCell><TableCell align="right">{productionDays} дней</TableCell></TableRow>
                    <TableRow><TableCell>Калории</TableCell><TableCell align="right">{nutritionalValue.calories} ккал</TableCell></TableRow>
                    <TableRow><TableCell>Белки/Жиры/Углеводы</TableCell><TableCell align="right">{nutritionalValue.proteins}/{nutritionalValue.fats}/{nutritionalValue.carbohydrates}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
          </Grid>
          <Grid item xs={12} md={6}>
              <Alert severity={compliance.trts021 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                {compliance.trts021 ? 'Рецептура соответствует.' : 'Есть несоответствия.'}
                </Alert>
              {!compliance.trts021 && (
                <Box component="ul" sx={{ mt: 0 }}>
                  {compliance.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                  </Box>
              )}
            </Grid>
          </Grid>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button startIcon={<ArrowBackIcon />} disabled={step === 0} onClick={() => setStep((s) => (Math.max(0, s - 1) as WizardStep))}>
            Назад
          </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
            {step < 6 ? (
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                disabled={!canGoNext || !!accessError}
                onClick={() => setStep((s) => (Math.min(6, s + 1) as WizardStep))}
                sx={{ bgcolor: COLORS.primary }}
              >
                Далее
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={!!accessError || !nutritionalValue}
                  sx={{ bgcolor: COLORS.primary }}
                >
                  Сохранить рецептуру
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleSubmitRecipeForExpertReview}
                  disabled={
                    !!accessError ||
                    !nutritionalValue ||
                    !compliance?.trts021 ||
                    (projectStatus !== 'recipe' && projectStatus !== 'analysis')
                  }
                >
                  Подать на проверку эксперту
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleExportRecipeAnalysisPdf}
                  disabled={!canDownloadExports(projectStatus) || !nutritionalValue}
                >
                  Word: рецептура + анализ
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/packaging' + (projectId ? `?projectId=${projectId}` : ''))}
                  disabled={
                    !!accessError ||
                    !compliance?.trts021 ||
                    !['packaging', 'presentation', 'expert_review', 'completed'].includes(projectStatus || '')
                  }
                >
                  Перейти к упаковке
              </Button>
              </>
            )}
          </Box>
            </Box>
          </Paper>
    </Box>
  );
};

