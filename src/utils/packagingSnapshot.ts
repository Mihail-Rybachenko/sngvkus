// Снимки лицевой/оборотной стороны упаковки (Fabric) — общий код для редактора и презентации
// @ts-expect-error local package has no bundled types in this setup
import { fabric } from 'fabric';

export type Side = 'front' | 'back';

export interface PackagingTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  bgColor: string;
}

export interface RecipeBackInfo {
  productType?: string;
  baseMatrix?: string;
  thermalMethod?: string;
  proteins?: number;
  fats?: number;
  carbohydrates?: number;
  calories?: number;
  complianceIssues?: string[];
  packWeightGrams?: number;
}

function productTypeRu(id?: string): string {
  const m: Record<string, string> = {
    chips: 'Чипсы',
    flakes: 'Хлопья',
    snacks: 'Снеки',
    crackers: 'Хлебцы',
  };
  return m[String(id || '').trim()] || 'Продукт';
}

function baseMatrixRu(id?: string): string {
  const m: Record<string, string> = {
    potato: 'Картофель',
    sweet_potato: 'Батат',
    carrot: 'Морковь',
    beet: 'Свекла',
    oats: 'Овёс',
    buckwheat: 'Гречка',
  };
  return m[String(id || '').trim()] || (id ? String(id) : '');
}

/** Для лицевой стороны: «Морковные», «Картофельные» и т.д. */
function baseAdjectiveRu(id?: string): string {
  const m: Record<string, string> = {
    potato: 'Картофельные',
    sweet_potato: 'Бататные',
    carrot: 'Морковные',
    beet: 'Свекольные',
    oats: 'Овсяные',
    buckwheat: 'Гречневые',
  };
  return m[String(id || '').trim()] || '';
}

function thermalRu(id?: string): string {
  const m: Record<string, string> = {
    dehydration: 'Сушка',
    baking: 'Запекание',
    extrusion: 'Экструзия',
    puffed: 'Взрывная обработка',
    fried: 'Во фритюре',
  };
  return m[String(id || '').trim()] || (id ? String(id) : '');
}

export type SideDesignState = {
  templateId: string;
  bgColor: string;
  canvasData: string | null;
};

export const TEMPLATES: PackagingTemplate[] = [
  { id: 'template-classic', name: 'Классический', width: 430, height: 640, bgColor: '#4CAF50' },
  { id: 'template-modern', name: 'Современный', width: 430, height: 640, bgColor: '#1E88E5' },
  { id: 'template-vibrant', name: 'Яркий', width: 430, height: 640, bgColor: '#FB8C00' },
  { id: 'template-minimal', name: 'Минималистичный', width: 430, height: 640, bgColor: '#FFFFFF' },
  { id: 'template-eco', name: 'Эко-стиль', width: 430, height: 640, bgColor: '#E8F5E9' },
];

export const DEFAULT_TEMPLATE = TEMPLATES[0];

function createText(text: string, top: number, color = '#FFFFFF', size = 26) {
  return new fabric.Text(text, {
    left: 215,
    top,
    originX: 'center',
    fontSize: size,
    fontFamily: 'Roboto',
    fill: color,
    fontWeight: 'bold',
  });
}

function toInstrumentalRu(name: string): string {
  const n = String(name || '').trim().toLowerCase();
  if (n.includes('цинк')) return 'цинком';
  if (n.includes('желез')) return 'железом';
  if (n.includes('мед')) return 'медью';
  if (n.includes('натри')) return 'натрием';
  if (n.includes('кали')) return 'калием';
  if (n.includes('селен')) return 'селеном';
  return name;
}

function buildBackText(recipe?: RecipeBackInfo, deficitElements: string[] = []): string {
  if (!recipe) {
    return 'Состав:\nКартофель, растительное масло, соль.\n\nПищевая ценность на 100 г:\nБелки 6 г, Жиры 30 г, Углеводы 58 г.';
  }
  const p = recipe.proteins ?? 0;
  const f = recipe.fats ?? 0;
  const c = recipe.carbohydrates ?? 0;
  const kcal = recipe.calories ?? 0;
  const packWeight = recipe.packWeightGrams ?? 40;
  const enrichLine =
    deficitElements.length > 0
      ? `Обогащено: ${deficitElements.map((x) => toInstrumentalRu(x)).join(', ')}`
      : '';
  const issues = recipe.complianceIssues?.length
    ? `\n\nВнимание:\n${recipe.complianceIssues.slice(0, 3).join('\n')}`
    : '';
  const thermalLine = recipe.thermalMethod ? thermalRu(recipe.thermalMethod) : '';
  return [
    `Тип продукта: ${productTypeRu(recipe.productType)}`,
    ...(recipe.baseMatrix ? [`База: ${baseMatrixRu(recipe.baseMatrix)}`] : []),
    ...(thermalLine ? [`Термообработка: ${thermalLine}`] : []),
    `Вес пачки: ${packWeight} г`,
    '',
    'Пищевая ценность на 100 г:',
    `Белки ${p.toFixed(1)} г, Жиры ${f.toFixed(1)} г, Углеводы ${c.toFixed(1)} г`,
    `Калорийность: ${kcal.toFixed(0)} ккал`,
    ...(enrichLine ? [enrichLine] : []),
    issues,
  ]
    .filter(Boolean)
    .join('\n');
}

type HeroBox = { left: number; top: number; width: number; height: number };

/** Пустое поле под фото — только оформление, без текста и иконок */
function addEmptyPhotoFrame(canvas: fabric.Canvas, templateId: string, box: HeroBox) {
  const inert = { selectable: false, evented: false };
  const { left, top, width, height } = box;
  const shadowSoft = new fabric.Shadow({
    color: 'rgba(15, 23, 42, 0.1)',
    blur: 22,
    offsetX: 0,
    offsetY: 8,
  });

  if (templateId === 'template-modern') {
    canvas.add(
      new fabric.Rect({
        left,
        top,
        width,
        height,
        rx: 30,
        ry: 30,
        fill: new fabric.Gradient({
          type: 'linear',
          gradientUnits: 'pixels',
          coords: { x1: 0, y1: 0, x2: 0, y2: height },
          colorStops: [
            { offset: 0, color: '#e0f2fe' },
            { offset: 0.55, color: '#f8fafc' },
            { offset: 1, color: '#ffffff' },
          ],
        }),
        stroke: '#0ea5e9',
        strokeWidth: 2,
        shadow: shadowSoft,
        ...inert,
      })
    );
    canvas.add(
      new fabric.Rect({
        left: left + 14,
        top: top + 14,
        width: width - 28,
        height: height - 28,
        rx: 22,
        ry: 22,
        fill: 'rgba(255,255,255,0.45)',
        stroke: 'rgba(14, 165, 233, 0.28)',
        strokeWidth: 1,
        ...inert,
      })
    );
  } else if (templateId === 'template-vibrant') {
    canvas.add(
      new fabric.Rect({
        left,
        top,
        width,
        height,
        rx: 22,
        ry: 22,
        fill: '#fffbeb',
        stroke: '#f97316',
        strokeWidth: 2.5,
        shadow: new fabric.Shadow({ color: 'rgba(234, 88, 12, 0.22)', blur: 20, offsetY: 10 }),
        ...inert,
      })
    );
    canvas.add(
      new fabric.Rect({
        left: left + 6,
        top: top + 6,
        width: 76,
        height: 76,
        rx: 22,
        ry: 22,
        fill: 'rgba(251, 191, 36, 0.9)',
        ...inert,
      })
    );
    canvas.add(
      new fabric.Rect({
        left: left + width - 82,
        top: top + height - 82,
        width: 76,
        height: 76,
        rx: 22,
        ry: 22,
        fill: 'rgba(249, 115, 22, 0.48)',
        ...inert,
      })
    );
    canvas.add(
      new fabric.Rect({
        left: left + 18,
        top: top + 18,
        width: width - 36,
        height: height - 36,
        rx: 16,
        ry: 16,
        fill: 'rgba(255, 255, 255, 0.35)',
        stroke: 'rgba(251, 146, 60, 0.35)',
        strokeWidth: 1,
        ...inert,
      })
    );
  } else if (templateId === 'template-minimal') {
    canvas.add(
      new fabric.Rect({
        left,
        top,
        width,
        height,
        rx: 6,
        ry: 6,
        fill: '#fafafa',
        stroke: '#a3a3a3',
        strokeWidth: 1,
        strokeDashArray: [16, 12],
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 12, offsetY: 4 }),
        ...inert,
      })
    );
    canvas.add(
      new fabric.Rect({
        left: left + 20,
        top: top + 20,
        width: width - 40,
        height: height - 40,
        rx: 4,
        ry: 4,
        fill: 'transparent',
        stroke: '#e5e5e5',
        strokeWidth: 1,
        ...inert,
      })
    );
  } else if (templateId === 'template-eco') {
    canvas.add(
      new fabric.Rect({
        left,
        top,
        width,
        height,
        rx: 28,
        ry: 28,
        fill: '#f0fdf4',
        stroke: '#4ade80',
        strokeWidth: 2,
        shadow: new fabric.Shadow({ color: 'rgba(22, 163, 74, 0.12)', blur: 18, offsetY: 6 }),
        ...inert,
      })
    );
    canvas.add(
      new fabric.Rect({
        left: left + 10,
        top: top + 10,
        width: width - 20,
        height: height - 20,
        rx: 22,
        ry: 22,
        fill: 'transparent',
        stroke: 'rgba(21, 128, 61, 0.25)',
        strokeWidth: 1,
        ...inert,
      })
    );
  } else {
    canvas.add(
      new fabric.Rect({
        left,
        top,
        width,
        height,
        rx: 24,
        ry: 24,
        fill: '#fefefe',
        stroke: '#bbf7d0',
        strokeWidth: 2,
        shadow: new fabric.Shadow({ color: 'rgba(22, 163, 74, 0.12)', blur: 20, offsetY: 8 }),
        ...inert,
      })
    );
    canvas.add(
      new fabric.Rect({
        left: left + 18,
        top: top + height - 14,
        width: width - 36,
        height: 5,
        rx: 2,
        fill: '#22c55e',
        ...inert,
      })
    );
  }
}

function layoutPackagingFront(canvas: fabric.Canvas, template: PackagingTemplate, recipeInfo?: RecipeBackInfo) {
  const pt = recipeInfo?.productType || 'chips';
  const bm = recipeInfo?.baseMatrix;
  const tm = recipeInfo?.thermalMethod;
  const packW = recipeInfo?.packWeightGrams ?? 40;
  const tid = template.id;
  const templateTextInert = { selectable: false, evented: false };

  const titleUpper = productTypeRu(pt).toUpperCase();
  const baseAdj = bm ? baseAdjectiveRu(bm) : '';
  const thermalLine = tm ? thermalRu(tm) : '';

  const titleColor =
    tid === 'template-vibrant'
      ? '#7c2d12'
      : tid === 'template-eco'
        ? '#14532d'
        : tid === 'template-modern'
          ? '#0c4a6e'
          : '#111827';
  const baseColor =
    tid === 'template-vibrant' ? '#9a3412' : tid === 'template-eco' ? '#166534' : tid === 'template-modern' ? '#075985' : '#374151';
  const thermalColor = tid === 'template-minimal' ? '#737373' : '#6b7280';

  const titleSize = tid === 'template-minimal' ? 36 : tid === 'template-eco' ? 38 : 40;
  const titleTop = 62;
  canvas.add(
    new fabric.Text(titleUpper, {
      left: 215,
      top: titleTop,
    originX: 'center',
      fontSize: titleSize,
    fontFamily: 'Roboto',
      fontWeight: '800',
      fill: titleColor,
      letterSpacing: tid === 'template-minimal' ? 10 : 6,
    })
  );

  let y = titleTop + (tid === 'template-minimal' ? 48 : 44);
  if (baseAdj) {
    canvas.add(
      new fabric.Text(baseAdj, {
        left: 215,
        top: y,
    originX: 'center',
        fontSize: tid === 'template-minimal' ? 20 : 23,
    fontFamily: 'Roboto',
        fill: baseColor,
        fontWeight: '600',
      })
    );
    y += 30;
  }
  if (thermalLine) {
    canvas.add(
      new fabric.Text(thermalLine, {
        left: 215,
        top: y,
    originX: 'center',
        fontSize: 13,
    fontFamily: 'Roboto',
        fill: thermalColor,
        fontWeight: '500',
      })
    );
    y += 24;
  } else {
    y += baseAdj ? 4 : 10;
  }

  const heroTop = y + 10;
  const heroBox: HeroBox = { left: 90, top: heroTop, width: 250, height: 268 };
  addEmptyPhotoFrame(canvas, tid, heroBox);

  const weightColor =
    tid === 'template-vibrant' ? '#c2410c' : tid === 'template-modern' ? '#0369a1' : tid === 'template-eco' ? '#15803d' : '#047857';
  canvas.add(
    new fabric.Text(`${packW} г`, {
      left: 215,
      top: heroTop + heroBox.height + 26,
      originX: 'center',
      fontSize: 28,
      fontFamily: 'Roboto',
      fill: weightColor,
      fontWeight: 'bold',
      ...templateTextInert,
    })
  );
}

export function applyTemplate(
  canvas: fabric.Canvas,
  template: PackagingTemplate,
  side: Side,
  recipeInfo?: RecipeBackInfo,
  deficitElements: string[] = []
) {
  canvas.clear();
  canvas.setDimensions({ width: template.width, height: template.height });
  canvas.setBackgroundColor(template.bgColor, () => undefined);

  const panel = new fabric.Rect({
    left: 20,
    top: 20,
    width: template.width - 40,
    height: template.height - 40,
    rx: 20,
    fill: side === 'front' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.82)',
    stroke: 'rgba(0,0,0,0.08)',
    strokeWidth: 1,
    selectable: false,
    evented: false,
  });
  canvas.add(panel);

  if (side === 'front') {
    layoutPackagingFront(canvas, template, recipeInfo);
  } else {
    canvas.add(createText('Оборотная сторона', 80, '#111827', 32));
    canvas.add(
      new fabric.Text(
        buildBackText(recipeInfo, deficitElements),
        {
          left: 45,
          top: 160,
          width: template.width - 90,
          fontSize: 16,
    fontFamily: 'Roboto',
          fill: '#1f2937',
          lineHeight: 1.4,
        }
      )
    );
    canvas.add(
      new fabric.Rect({
        left: 65,
        top: 460,
        width: template.width - 130,
        height: 85,
        rx: 10,
        fill: '#ffffff',
        stroke: '#9ca3af',
        strokeDashArray: [7, 5],
        strokeWidth: 1.2,
      })
    );
    canvas.add(
      new fabric.Text('Штрихкод / QR', {
        left: 215,
        top: 502,
    originX: 'center',
    originY: 'center',
        fontSize: 18,
    fontFamily: 'Roboto',
        fill: '#6b7280',
      })
    );
  }

  canvas.requestRenderAll();
}

export function serializeCanvas(canvas: fabric.Canvas): string {
  return JSON.stringify(canvas.toJSON());
}

export async function sideDataUrlFromState(
  sideState: SideDesignState,
  side: Side,
  width: number,
  height: number,
  recipeInfo?: RecipeBackInfo,
  deficitElements: string[] = []
): Promise<string> {
  const tempEl = document.createElement('canvas');
  const tempCanvas = new fabric.StaticCanvas(tempEl, { width, height, backgroundColor: sideState.bgColor });
  try {
    if (sideState.canvasData) {
      await new Promise<void>((resolve) => {
        tempCanvas.loadFromJSON(sideState.canvasData as any, () => resolve());
      });
    } else {
      const t = TEMPLATES.find((x) => x.id === sideState.templateId) || DEFAULT_TEMPLATE;
      applyTemplate(tempCanvas as unknown as fabric.Canvas, t, side, recipeInfo, deficitElements);
    }
    return tempCanvas.toDataURL({ format: 'png', quality: 1 });
  } finally {
    tempCanvas.dispose();
  }
}

export async function exportPackagingSidesToDataUrls(
  packagingBundleJson: string | null | undefined,
  recipeInfo?: RecipeBackInfo,
  deficitElements: string[] = []
): Promise<{ front: string; back: string } | null> {
  if (!packagingBundleJson || typeof packagingBundleJson !== 'string') return null;
  let bundle: { front?: SideDesignState; back?: SideDesignState };
  try {
    bundle = JSON.parse(packagingBundleJson);
  } catch {
    return null;
  }
  if (!bundle?.front || !bundle?.back) return null;
  const tf = TEMPLATES.find((x) => x.id === bundle.front!.templateId) || DEFAULT_TEMPLATE;
  const tb = TEMPLATES.find((x) => x.id === bundle.back!.templateId) || DEFAULT_TEMPLATE;
  const [front, back] = await Promise.all([
    sideDataUrlFromState(bundle.front, 'front', tf.width, tf.height, recipeInfo, deficitElements),
    sideDataUrlFromState(bundle.back, 'back', tb.width, tb.height, recipeInfo, deficitElements),
  ]);
  return { front, back };
}

