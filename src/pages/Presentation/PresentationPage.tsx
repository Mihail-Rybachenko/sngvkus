import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Slideshow as SlideshowIcon,
  PictureAsPdf as PdfIcon,
  Description as PptxIcon,
} from '@mui/icons-material';
import { COLORS } from '@/utils/constants';

const DEMO_MODE = true;

// Шаблоны презентаций
const PRESENTATION_TEMPLATES = [
  { id: 'template-demo', name: 'Для демо-дня', slides: 8 },
  { id: 'template-investor', name: 'Для инвесторов', slides: 10 },
  { id: 'template-pitch', name: 'Питч-презентация', slides: 6 },
  { id: 'template-detailed', name: 'Детальная презентация', slides: 12 },
];

// Структура слайдов
interface Slide {
  id: string;
  title: string;
  content: string[];
  type: 'title' | 'content' | 'data' | 'conclusion';
}

export const PresentationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('projectId');
  const [selectedTemplate, setSelectedTemplate] = useState(PRESENTATION_TEMPLATES[0].id);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [generated, setGenerated] = useState(false);

  // Генерация слайдов на основе шаблона
  useEffect(() => {
    if (!selectedTemplate) return;

    const template = PRESENTATION_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (!template) return;

    // Моковые данные для генерации
    const generatedSlides: Slide[] = [
      {
        id: 'slide-1',
        title: 'Название проекта',
        content: ['Персонализированные продукты питания', 'На основе микроэлементного анализа'],
        type: 'title',
      },
      {
        id: 'slide-2',
        title: 'Проблема',
        content: [
          'Дефицит микроэлементов у школьников 10-17 лет',
          'Отсутствие персонализированных решений',
          'Фрагментированность инструментов разработки',
        ],
        type: 'content',
      },
      {
        id: 'slide-3',
        title: 'Решение',
        content: [
          'Автоматизированная платформа SngVkus',
          'Анализ данных за 3 часа вместо 5 дней',
          'Персонализированные рецептуры на основе анализов',
        ],
        type: 'content',
      },
      {
        id: 'slide-4',
        title: 'Результаты анализа',
        content: [
          'Выявлены дефициты: Железо, Цинк, Кальций',
          'Автоматический подбор обогатительных премиксов',
          'Соответствие ТР ТС 021/2011',
        ],
        type: 'data',
      },
      {
        id: 'slide-5',
        title: 'Продукт',
        content: [
          'Тип: Чипсы',
          'Обогащенные микроэлементами',
          'Персонализированная рецептура',
        ],
        type: 'content',
      },
      {
        id: 'slide-6',
        title: 'Дизайн упаковки',
        content: [
          'Современный минималистичный дизайн',
          'Информация о составе и пользе',
          'Брендинг Неофуд',
        ],
        type: 'content',
      },
      {
        id: 'slide-7',
        title: 'Рынок',
        content: [
          'Целевая аудитория: школьники 10-17 лет',
          'Родители как лица, принимающие решение',
          'Растущий рынок здорового питания',
        ],
        type: 'content',
      },
      {
        id: 'slide-8',
        title: 'Следующие шаги',
        content: [
          'Тестирование с целевой аудиторией',
          'Масштабирование производства',
          'Расширение линейки продуктов',
        ],
        type: 'conclusion',
      },
    ];

    setSlides(generatedSlides.slice(0, template.slides));
    setGenerated(true);
  }, [selectedTemplate]);

  const handleExportPDF = () => {
    // В реальном проекте здесь был бы jsPDF
    alert('Экспорт в PDF (в полной версии использует jsPDF)');
  };

  const handleExportPPTX = () => {
    // В реальном проекте здесь был бы pptxgenjs
    alert('Экспорт в PPTX (в полной версии использует pptxgenjs)');
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

      <Grid container spacing={3}>
        {/* Настройки */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Настройки
            </Typography>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Шаблон презентации</InputLabel>
              <Select
                value={selectedTemplate}
                label="Шаблон презентации"
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {PRESENTATION_TEMPLATES.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name} ({template.slides} слайдов)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              fullWidth
              variant="contained"
              startIcon={<SlideshowIcon />}
              onClick={() => setGenerated(true)}
              sx={{ mb: 2, bgcolor: COLORS.primary }}
            >
              Сгенерировать презентацию
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<PdfIcon />}
              onClick={handleExportPDF}
              sx={{ mb: 2 }}
            >
              Экспорт PDF
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<PptxIcon />}
              onClick={handleExportPPTX}
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
                {slides.map((slide, index) => (
                  <Grid item xs={12} sm={6} md={4} key={slide.id}>
                    <Card
                      sx={{
                        height: 250,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: slide.type === 'title' ? COLORS.primary : 'white',
                        color: slide.type === 'title' ? 'white' : 'inherit',
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, p: 2 }}>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          Слайд {index + 1}
                        </Typography>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                          {slide.title}
                        </Typography>
                        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2, fontSize: '0.875rem' }}>
                          {slide.content.map((item, idx) => (
                            <li key={idx}>
                              <Typography variant="body2">{item}</Typography>
                            </li>
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <SlideshowIcon sx={{ fontSize: 64, color: COLORS.textSecondary, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Выберите шаблон и сгенерируйте презентацию
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Презентация будет автоматически создана на основе данных вашего проекта
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

