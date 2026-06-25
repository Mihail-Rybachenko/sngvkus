import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import {
  Slideshow as SlideshowIcon,
  Description as PptxIcon,
} from '@mui/icons-material';
import { COLORS, DEMO_MODE } from '@/utils/constants';
import api from '@/services/api';
import PptxGenJS from 'pptxgenjs';
import { loadPackagingPreviewForPresentation } from '@/utils/presentationPackaging';
import type { ProjectStatus } from '@/types';
import { findMergedDemoProject } from '@/utils/demoProjectsMerge';
import { canDownloadExports, EXPORT_LOCKED_MESSAGE } from '@/utils/exportPolicy';
import { fetchProjectStatus } from '@/utils/projectStatus';

/** Только формат из 8 слайдов: 1 — упаковка (при наличии), 2–8 — тематические (зелёные). */
const PRESENTATION_TEMPLATE = { id: 'template-8', name: 'Презентация (8 слайдов)', slides: 8 as const };

// Структура слайдов
interface Slide {
  id: string;
  title: string;
  content: string[];
  type: 'title' | 'content' | 'data' | 'conclusion' | 'packaging3d';
  packaging?: { frontDataUrl: string; backDataUrl: string };
}

function mergePackagingFirstSlide(
  base: Slide[],
  urls: { front: string; back: string } | null,
  maxSlides: number
): Slide[] {
  if (!urls) return base.slice(0, maxSlides);
  if (base[0]?.type === 'packaging3d') return base.slice(0, maxSlides);
  const packagingSlide: Slide = {
    id: 'slide-packaging-3d',
    title: 'Упаковка продукта',
    content: [],
    type: 'packaging3d',
    packaging: { frontDataUrl: urls.front, backDataUrl: urls.back },
  };
  const withoutTitle = base.filter((s) => s.type !== 'title');
  const rest = withoutTitle.slice(0, Math.max(0, maxSlides - 1));
  return [packagingSlide, ...rest];
}

/** Слайды 2–8 (индексы 1…7 при восьми слайдах): зелёный фон как у бывшего титульного. */
function isGreenBlockSlide(slide: Slide, index: number, totalSlides: number): boolean {
  if (slide.type === 'packaging3d') return false;
  if (totalSlides !== PRESENTATION_TEMPLATE.slides) return slide.type === 'title';
  return index >= 1 && index <= 7;
}

/** PptxGenJS ожидает data в виде полного data URI (`image/png;base64,...`), а не «сырой» base64 */
function pptxImageData(dataUrl: string): string {
  if (/^data:image\//i.test(dataUrl)) return dataUrl;
  const i = dataUrl.indexOf(',');
  if (i >= 0) return `data:image/png;base64,${dataUrl.slice(i + 1)}`;
  return `data:image/png;base64,${dataUrl}`;
}

/** Расширенный текст только в PPTX для зелёных слайдов (позиции 2–8 в презентации). */
function getPptxExtraLines(slide: Slide): string[] {
  const t = slide.title.toLowerCase();
  if (t.includes('проблем'))
    return [
      'Для целевой аудитории важна не только «вкусная упаковка», но и понятная связка: какие нутриенты закрывает продукт и почему именно в таком формате.',
      'На слайде зафиксированы типовые барьеры: разрыв между анализом и готовым SKU, нехватка времени команды на согласование состава и маркировки.',
    ];
  if (t.includes('реш') || t.includes('sngvkus'))
    return [
      'Платформа снимает часть рисков за счёт единого контура данных: изменения в анализе или рецептуре последовательно отражаются в тексте оборота и в презентации.',
      'Шаблоны и проверки помогают не потерять регуляторные формулировки при итерациях дизайна и состава.',
    ];
  if (t.includes('анализ'))
    return [
      'При интерпретации слайда полезно сослаться на период сдачи анализа и на то, какие элементы были в фокусе обогащения при выборе премиксов.',
      'Если дефициты не выявлены, акцент переносится на поддерживающий состав и прозрачность маркировки без избыточных заявлений.',
    ];
  if (t.includes('рецептур') || t.includes('состав'))
    return [
      'На защите проекта стоит отдельно проговорить допущения калькулятора (база, влажность, условия расчёта КБЖУ) и план валидации на производстве.',
      'Список премиксов — не декорация: каждый пункт должен быть согласован с допустимыми дозами и целевой группой потребителей.',
    ];
  if (t.includes('упаков'))
    return [
      'Лицевая и оборотная стороны в редакторе связаны с полями проекта: при смене рецептуры проверьте, что числа на обороте обновлены перед экспортом.',
      'Визуальный стиль шаблона можно менять без потери структуры блоков — это ускоряет A/B варианты для фокус-группы.',
    ];
  if (t.includes('рынок') || t.includes('канал') || t.includes('позицион'))
    return [
      'Каналы продаж лучше привязать к гипотезе цены и к логистике: маркетплейс, нишевый ритейл и B2B требуют разных УТП на лицевой стороне.',
      'Корпоративные программы и школы чаще смотрят на прозрачность состава и документальное обоснование обогащения — подготовьте короткий one-pager к этому слайду.',
    ];
  if (t.includes('дорожн') || t.includes('следующ') || t.includes('шаг'))
    return [
      'Рекомендуется явно назвать владельцев подзадач (регуляторика, производство, маркетинг) и горизонт пилота в неделях, а не только общие формулировки.',
      'После пилота зафиксируйте метрики успеха: повторная покупка, NPS, доля возвратов, отзывы о читаемости этикетки.',
    ];
  return [
    'Слайд дополняет линию повествования проекта; при выступлении добавьте цифры, сроки и имена ответственных из вашей команды.',
  ];
}

function buildPptxGreenBody(slide: Slide): string {
  const base = slide.content.map((x) => `• ${x}`);
  const extra = getPptxExtraLines(slide).map((x) => `• ${x}`);
  return [...base, ...extra].join('\n');
}

const Packaging3DPreview: React.FC<{ frontUrl: string; backUrl: string }> = ({ frontUrl, backUrl }) => {
  const [face, setFace] = useState<'front' | 'back'>('front');
  return (
    <Box sx={{ width: '100%', py: 0.5 }}>
      <Box
        sx={{
          perspective: '1100px',
          perspectiveOrigin: '50% 40%',
          width: '100%',
          maxWidth: 280,
          height: 220,
          minHeight: 220,
          mx: 'auto',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: `${face === 'front' ? 'rotateY(0deg)' : 'rotateY(180deg)'} rotateX(5deg)`,
          }}
        >
          <Box
            component="img"
            src={frontUrl}
            alt="Лицевая сторона упаковки"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 2,
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          />
          <Box
            component="img"
            src={backUrl}
            alt="Оборотная сторона упаковки"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 2,
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          />
        </Box>
      </Box>
      <Stack spacing={1} sx={{ mt: 1.5, maxWidth: 280, mx: 'auto' }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'grey.100', fontWeight: 700, mb: 0.25 }}>
            Лицевая сторона
          </Typography>
          <Typography variant="caption" sx={{ color: 'grey.400', lineHeight: 1.45, display: 'block' }}>
            То, что видит покупатель первым: тип продукта, база (например, морковные), вес пачки, визуальный стиль
            шаблона — всё так же, как вы оформили в редакторе упаковки.
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'grey.100', fontWeight: 700, mb: 0.25 }}>
            Оборотная сторона
          </Typography>
          <Typography variant="caption" sx={{ color: 'grey.400', lineHeight: 1.45, display: 'block' }}>
            Состав, пищевая ценность, обогащение по дефицитам анализа (если есть), предупреждения по рецептуре —
            отображается так же, как на обороте в редакторе.
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant={face === 'front' ? 'contained' : 'outlined'}
          onClick={() => setFace('front')}
          sx={{ textTransform: 'none', minWidth: 0, px: 1.5 }}
        >
          Повернуть: лицевая
        </Button>
        <Button
          size="small"
          variant={face === 'back' ? 'contained' : 'outlined'}
          onClick={() => setFace('back')}
          sx={{ textTransform: 'none', minWidth: 0, px: 1.5 }}
        >
          Повернуть: оборот
        </Button>
      </Stack>
    </Box>
  );
};

export const PresentationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    if (!projectId) {
      setAccessError('Сначала создайте проект и завершите этап упаковки.');
      setProjectStatus(null);
      return;
    }
    if (DEMO_MODE) {
      const p = findMergedDemoProject(projectId);
      const status = (p?.status as ProjectStatus) || null;
      setProjectStatus(status);
      if (!['packaging', 'presentation', 'expert_review', 'completed'].includes(status || '')) {
        setAccessError(
          status === 'recipe_expert_review'
            ? 'Сначала дождитесь одобрения рецептуры экспертом, затем выполните упаковку.'
            : 'Этап презентации доступен после этапа упаковки.'
        );
      } else {
        setAccessError(null);
      }
      return;
    }
    fetchProjectStatus(projectId).then((status) => {
      setProjectStatus(status);
      if (!['packaging', 'presentation', 'expert_review', 'completed'].includes(status || '')) {
        setAccessError(
          status === 'recipe_expert_review'
            ? 'Сначала дождитесь одобрения рецептуры экспертом, затем выполните упаковку.'
            : 'Этап презентации доступен только после этапа упаковки.'
        );
      } else {
        setAccessError(null);
      }
    });
  }, [projectId]);

  // Генерация: фиксированно 8 слайдов
  useEffect(() => {
    setError(null);
    const template = PRESENTATION_TEMPLATE;

    if (!DEMO_MODE && projectId) {
      api
        .get(`/projects/${projectId}/presentation`)
        .then(async (resp) => {
          const s = resp.data?.slides;
          if (Array.isArray(s)) {
            const raw = s as Slide[];
            const urls = await loadPackagingPreviewForPresentation(projectId);
            setSlides(mergePackagingFirstSlide(raw, urls, template.slides));
            setGenerated(true);
          }
        })
        .catch(() => {
          // ignore: можно будет сгенерировать
        });
      return;
    }

    const generatedSlides: Slide[] = [
      {
        id: 'slide-title',
        title: 'Проект и контекст',
        content: [
          'Продуктовая линейка персонализированного питания: от микроэлементного анализа до готовой упаковки и презентации.',
          'Команда объединяет нутрициологию, рецептуру и дизайн, чтобы предложить рынку понятный и проверяемый формат.',
        ],
        type: 'title',
      },
      {
        id: 'slide-2',
        title: 'Проблема рынка',
        content: [
          'У части потребителей (в т.ч. школьников 10–17 лет) на фоне рациона фиксируются дефициты железа, цинка, кальция и др. — это влияет на самочувствие и концентрацию.',
          'Покупателю сложно самостоятельно подобрать продукт под свой микроэлементный статус: составы на полке не привязаны к персональным данным.',
          'Разработка рецептуры и упаковки разнесена по разным инструментам и экспертам, что удлиняет цикл вывода продукта.',
        ],
        type: 'content',
      },
      {
        id: 'slide-3',
        title: 'Решение SngVkus',
        content: [
          'Единая платформа: загрузка анализа → расчёт дефицитов и избытков → подбор премиксов и рецептуры → дизайн двух сторон упаковки → презентация для демо или инвесторов.',
          'Сокращение времени подготовки концепции: типовые расчёты и шаблоны упаковки убирают ручную рутину на ранних этапах.',
          'Прозрачность для регуляторики: учёт ТР ТС 021/2011 и фиксация предупреждений по рецептуре в карточке проекта.',
        ],
        type: 'content',
      },
      {
        id: 'slide-4',
        title: 'Результаты анализа',
        content: [
          'По загруженному файлу анализа система выделяет элементы в дефиците и избытке; для дефицитов предлагается обогащение, для избытков — безопасные формулировки без «передозировки» в тексте.',
          'Визуализация (графики) помогает объяснить заказчику или куратору, почему выбраны именно эти премиксы и дозы.',
          'Все шаги сохраняются в проекте — удобно для отчётности и повторного входа в проект через несколько недель.',
        ],
        type: 'data',
      },
      {
        id: 'slide-5',
        title: 'Рецептура и состав',
        content: [
          'Тип продукта (чипсы, хлопья, снеки, хлебцы) и базовая матрица (картофель, морковь, овёс и т.д.) задают вкусовой и технологический профиль.',
          'КБЖУ и калорийность считаются с учётом выбранных премиксов; микроэлементы агрегируются по составу премиксов.',
          'Блок соответствия ТР ТС 021/2011 и список замечаний помогают до финализации довести рецептуру до согласуемого состояния.',
        ],
        type: 'content',
      },
      {
        id: 'slide-6',
        title: 'Дизайн упаковки',
        content: [
          'Двусторонний редактор: лицевая сторона под бренд и «витрину», оборот — состав, пищевая ценность и обогащение по дефицитам из анализа.',
          'Набор шаблонов (классика, современный, яркий, минимализм, эко) задаёт палитру и композицию без отдельного макетера на черновике.',
          'Экспорт в PNG/PDF и использование макета в презентации сохраняют визуальную связку «продукт на полке» ↔ «слайд питча».',
        ],
        type: 'content',
      },
      {
        id: 'slide-7',
        title: 'Рынок и каналы',
        content: [
          'Целевые сегменты: семьи с детьми, аудитория ЗОЖ, спортивные и образовательные организации, где важны понятные нутриентные истории.',
          'Каналы выхода: маркетплейсы, специализированные ритейлеры, B2B-поставки в школы и фитнес, корпоративные программы здоровья.',
          'Упаковка с персонализированным посылом усиливает отстройку от массовых брендов без уникального нутриентного обоснования.',
        ],
        type: 'content',
      },
      {
        id: 'slide-8',
        title: 'Дорожная карта',
        content: [
          'Краткий пилот: тест рецептуры и дизайна на фокус-группе или в ограниченной партии, сбор обратной связи по вкусу и читаемости этикетки.',
          'Регуляторная проверка и согласование с производством: фиксация спецификаций, MOQ и сроков.',
          'Масштабирование: расширение линейки вкусов и форматов при сохранении единой платформы анализа и рецептур.',
        ],
        type: 'conclusion',
      },
    ];

    void (async () => {
      const base = generatedSlides.slice(0, template.slides);
      const urls = await loadPackagingPreviewForPresentation(projectId);
      setSlides(mergePackagingFirstSlide(base, urls, template.slides));
      setGenerated(true);
    })();
  }, [projectId]);

  const handleGenerate = async () => {
    setError(null);
    if (DEMO_MODE) {
      setGenerated(true);
      return;
    }
    if (!projectId) return;
    try {
      const resp = await api.post(`/projects/${projectId}/presentation/generate`, {
        templateId: PRESENTATION_TEMPLATE.id,
      });
      const s = resp.data?.slides;
      if (Array.isArray(s)) {
        const urls = await loadPackagingPreviewForPresentation(projectId);
        const merged = mergePackagingFirstSlide(s as Slide[], urls, PRESENTATION_TEMPLATE.slides);
        setSlides(merged);
        setGenerated(true);
      } else {
        throw new Error('Некорректный ответ генератора');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка генерации презентации');
    }
  };

  const handleSave = async () => {
    setError(null);
    if (DEMO_MODE) return;
    if (!projectId) return;
    try {
      await api.put(`/projects/${projectId}/presentation`, {
        templateId: PRESENTATION_TEMPLATE.id,
        slides,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка сохранения презентации');
    }
  };

  const handleExportPPTX = () => {
    if (!canDownloadExports(projectStatus)) return;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    const total = slides.length;

    slides.forEach((s, idx) => {
      const slide = pptx.addSlide();
      const green = isGreenBlockSlide(s, idx, total);

      if (s.type === 'packaging3d' && s.packaging?.frontDataUrl && s.packaging?.backDataUrl) {
        slide.background = { color: '263238' };
        slide.addText(s.title, {
          x: 0.5,
          y: 0.16,
          w: 12.3,
          h: 0.4,
          fontSize: 24,
          bold: true,
          color: 'FFFFFF',
        });
        const imgY = 0.58;
        const imgH = 6.12;
        const imgW = 6.22;
        slide.addImage({
          data: pptxImageData(s.packaging.frontDataUrl),
          x: 0.42,
          y: imgY,
          w: imgW,
          h: imgH,
          sizing: { type: 'contain', w: imgW, h: imgH },
        });
        slide.addImage({
          data: pptxImageData(s.packaging.backDataUrl),
          x: 6.68,
          y: imgY,
          w: imgW,
          h: imgH,
          sizing: { type: 'contain', w: imgW, h: imgH },
        });
        slide.addText(
          'Лицевая сторона: витринный блок — тип продукта, база (например, овощная), вес нетто, визуальный стиль шаблона; всё соответствует макету из редактора упаковки.',
          {
            x: 0.42,
            y: 6.78,
            w: imgW,
            h: 0.62,
            fontSize: 10,
            color: 'B0BEC5',
            valign: 'top',
          }
        );
        slide.addText(
          'Оборотная сторона: полный состав, КБЖУ на 100 г (или как в проекте), обогащение по выявленным дефицитам анализа, предупреждения и маркировка по рецептуре.',
          {
            x: 6.68,
            y: 6.78,
            w: imgW,
            h: 0.62,
            fontSize: 10,
            color: 'B0BEC5',
            valign: 'top',
          }
        );
        return;
      }

      if (green) {
        slide.background = { color: '4CAF50' };
      }

      slide.addText(s.title, {
        x: 0.5,
        y: 0.35,
        w: 12.3,
        h: 0.65,
        fontSize: 26,
        bold: true,
        color: green ? 'FFFFFF' : '1B1B1B',
      });

      const body = green ? buildPptxGreenBody(s) : s.content.map((x) => `• ${x}`).join('\n');
      slide.addText(body, {
        x: 0.75,
        y: 1.12,
        w: 11.8,
        h: 5.75,
        fontSize: green ? 13.5 : 15,
        color: green ? 'FFFFFF' : '1B1B1B',
        valign: 'top',
        lineSpacingMultiple: green ? 1.08 : 1.12,
      });
    });

    pptx.writeFile({ fileName: `sngvkus-presentation-${Date.now()}.pptx` });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Генератор презентаций
        </Typography>
        {DEMO_MODE && (
          <Chip label="Демо-режим" color="info" size="small" sx={{ bgcolor: COLORS.secondary, color: 'white' }} />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {accessError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {accessError}
        </Alert>
      )}
      {!accessError && projectId && !canDownloadExports(projectStatus) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {EXPORT_LOCKED_MESSAGE}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Настройки */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Настройки
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Формат: <strong>{PRESENTATION_TEMPLATE.name}</strong> — первый слайд с макетом упаковки (если дизайн
              сохранён), слайды 2–8 с зелёным оформлением; в PPTX первый слайд с увеличенной областью макета, с 2 по 8
              слайд — развёрнутый текст.
            </Typography>

            <Button
              fullWidth
              variant="contained"
              startIcon={<SlideshowIcon />}
              onClick={handleGenerate}
              disabled={!!accessError}
              sx={{ mb: 2, bgcolor: COLORS.primary }}
            >
              Сгенерировать презентацию
            </Button>

            {!DEMO_MODE && (
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSave}
                disabled={!!accessError}
                sx={{ mb: 2 }}
              >
                Сохранить
              </Button>
            )}

            <Button
              fullWidth
              variant="outlined"
              startIcon={<PptxIcon />}
              onClick={handleExportPPTX}
              disabled={!canDownloadExports(projectStatus)}
              sx={{ mb: 2 }}
            >
              Экспорт PPTX
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Презентация автоматически формируется на основе данных проекта
            </Typography>
          </Paper>
        </Grid>

        {/* Предпросмотр слайдов */}
        <Grid item xs={12} md={9}>
          {generated && slides.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Предпросмотр ({slides.length} слайдов)
              </Typography>
              <Grid container spacing={2}>
                {slides.map((slide, index) => {
                  const green = isGreenBlockSlide(slide, index, slides.length);
                  return (
                  <Grid item xs={12} sm={6} md={4} key={slide.id}>
                    <Card
                      sx={{
                        height: 300,
                        minHeight: 300,
                        maxHeight: 300,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor:
                          slide.type === 'packaging3d'
                            ? '#1e293b'
                            : green
                              ? COLORS.primary
                              : 'white',
                        color:
                          slide.type === 'packaging3d' || green ? 'white' : 'inherit',
                      }}
                    >
                      <CardContent
                        sx={{
                          flexGrow: 1,
                          p: 2,
                          overflow: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: 0,
                        }}
                      >
                        <Typography variant="caption" sx={{ opacity: 0.75 }}>
                          Слайд {index + 1}
                        </Typography>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                          {slide.title}
                        </Typography>
                        {slide.type === 'packaging3d' && slide.packaging ? (
                          <Box sx={{ mt: 1 }}>
                            <Packaging3DPreview
                              frontUrl={slide.packaging.frontDataUrl}
                              backUrl={slide.packaging.backDataUrl}
                            />
                          </Box>
                        ) : (
                          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2, fontSize: '0.875rem' }}>
                            {slide.content.map((item, idx) => (
                              <li key={idx}>
                                <Typography variant="body2" sx={{ color: green ? 'rgba(255,255,255,0.95)' : undefined }}>
                                  {item}
                                </Typography>
                              </li>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  );
                })}
              </Grid>
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <SlideshowIcon sx={{ fontSize: 64, color: COLORS.textSecondary, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Сгенерируйте презентацию из 8 слайдов
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Первый слайд — макет упаковки (если дизайн сохранён), слайды 2–8 — зелёные блоки. Экспорт презентации —
                только PPTX (расширенный текст на слайдах 2–8 и увеличенный макет на первом слайде в файле).
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

