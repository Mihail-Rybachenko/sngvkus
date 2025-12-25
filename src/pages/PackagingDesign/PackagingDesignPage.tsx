import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Image as ImageIcon,
  TextFields as TextFieldsIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@mui/icons-material';
import { COLORS } from '@/utils/constants';
import { fabric } from 'fabric';

const DEMO_MODE = true;

// Шаблоны упаковки для снеков
interface PackagingTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  bgColor: string;
  createElements: (canvas: fabric.Canvas) => void;
}

const createTemplate1 = (canvas: fabric.Canvas) => {
  // Классический стиль - зеленый с белым
  const bgRect = new fabric.Rect({
    left: 0,
    top: 0,
    width: 400,
    height: 600,
    fill: '#4CAF50',
    selectable: false,
  });
  canvas.add(bgRect);

  const whiteRect = new fabric.Rect({
    left: 20,
    top: 20,
    width: 360,
    height: 560,
    fill: '#FFFFFF',
    rx: 10,
    selectable: false,
  });
  canvas.add(whiteRect);

  const title = new fabric.Text('SNACKS', {
    left: 200,
    top: 80,
    fontSize: 42,
    fontFamily: 'Roboto',
    fill: '#4CAF50',
    fontWeight: 'bold',
    originX: 'center',
    selectable: true,
  });
  canvas.add(title);

  const subtitle = new fabric.Text('Персонализированные снеки', {
    left: 200,
    top: 140,
    fontSize: 18,
    fontFamily: 'Roboto',
    fill: '#757575',
    originX: 'center',
    selectable: true,
  });
  canvas.add(subtitle);

  // Декоративный элемент
  const circle1 = new fabric.Circle({
    left: 100,
    top: 250,
    radius: 30,
    fill: '#4CAF50',
    opacity: 0.3,
    selectable: true,
  });
  canvas.add(circle1);

  const circle2 = new fabric.Circle({
    left: 300,
    top: 250,
    radius: 30,
    fill: '#4CAF50',
    opacity: 0.3,
    selectable: true,
  });
  canvas.add(circle2);

  const infoText = new fabric.Text('Обогащено\nмикроэлементами', {
    left: 200,
    top: 350,
    fontSize: 16,
    fontFamily: 'Roboto',
    fill: '#212121',
    textAlign: 'center',
    originX: 'center',
    selectable: true,
  });
  canvas.add(infoText);

  const weightText = new fabric.Text('100 г', {
    left: 200,
    top: 500,
    fontSize: 24,
    fontFamily: 'Roboto',
    fill: '#4CAF50',
    fontWeight: 'bold',
    originX: 'center',
    selectable: true,
  });
  canvas.add(weightText);
};

const createTemplate2 = (canvas: fabric.Canvas) => {
  // Современный стиль - синий градиент
  const bgRect = new fabric.Rect({
    left: 0,
    top: 0,
    width: 400,
    height: 600,
    fill: '#2196F3',
    selectable: false,
  });
  canvas.add(bgRect);

  const title = new fabric.Text('SNACKS', {
    left: 200,
    top: 100,
    fontSize: 48,
    fontFamily: 'Roboto',
    fill: '#FFFFFF',
    fontWeight: 'bold',
    originX: 'center',
    selectable: true,
  });
  canvas.add(title);

  const line = new fabric.Line([50, 180, 350, 180], {
    stroke: '#FFFFFF',
    strokeWidth: 3,
    selectable: true,
  });
  canvas.add(line);

  const subtitle = new fabric.Text('Здоровое питание', {
    left: 200,
    top: 220,
    fontSize: 20,
    fontFamily: 'Roboto',
    fill: '#FFFFFF',
    originX: 'center',
    selectable: true,
  });
  canvas.add(subtitle);

  // Декоративные элементы
  const triangle = new fabric.Triangle({
    left: 200,
    top: 300,
    width: 80,
    height: 80,
    fill: '#FF9800',
    originX: 'center',
    originY: 'center',
    selectable: true,
  });
  canvas.add(triangle);

  const infoBox = new fabric.Rect({
    left: 50,
    top: 420,
    width: 300,
    height: 120,
    fill: 'rgba(255, 255, 255, 0.2)',
    rx: 10,
    selectable: true,
  });
  canvas.add(infoBox);

  const infoText = new fabric.Text('Персонализировано\nпод ваши потребности', {
    left: 200,
    top: 480,
    fontSize: 16,
    fontFamily: 'Roboto',
    fill: '#FFFFFF',
    textAlign: 'center',
    originX: 'center',
    selectable: true,
  });
  canvas.add(infoText);
};

const createTemplate3 = (canvas: fabric.Canvas) => {
  // Яркий стиль - оранжевый с акцентами
  const bgRect = new fabric.Rect({
    left: 0,
    top: 0,
    width: 400,
    height: 600,
    fill: '#FF9800',
    selectable: false,
  });
  canvas.add(bgRect);

  const whiteCircle = new fabric.Circle({
    left: 200,
    top: 150,
    radius: 100,
    fill: '#FFFFFF',
    originX: 'center',
    originY: 'center',
    selectable: true,
  });
  canvas.add(whiteCircle);

  const title = new fabric.Text('SNACKS', {
    left: 200,
    top: 150,
    fontSize: 36,
    fontFamily: 'Roboto',
    fill: '#FF9800',
    fontWeight: 'bold',
    originX: 'center',
    originY: 'center',
    selectable: true,
  });
  canvas.add(title);

  const subtitle = new fabric.Text('Энергия в каждой порции', {
    left: 200,
    top: 280,
    fontSize: 18,
    fontFamily: 'Roboto',
    fill: '#FFFFFF',
    originX: 'center',
    selectable: true,
  });
  canvas.add(subtitle);

  // Декоративные звезды
  const star1 = new fabric.Polygon([
    { x: 0, y: -20 },
    { x: 5, y: -5 },
    { x: 20, y: -5 },
    { x: 8, y: 5 },
    { x: 12, y: 20 },
    { x: 0, y: 10 },
    { x: -12, y: 20 },
    { x: -8, y: 5 },
    { x: -20, y: -5 },
    { x: -5, y: -5 },
  ], {
    left: 100,
    top: 350,
    fill: '#FFFFFF',
    originX: 'center',
    originY: 'center',
    selectable: true,
  });
  canvas.add(star1);

  const star2 = new fabric.Polygon([
    { x: 0, y: -20 },
    { x: 5, y: -5 },
    { x: 20, y: -5 },
    { x: 8, y: 5 },
    { x: 12, y: 20 },
    { x: 0, y: 10 },
    { x: -12, y: 20 },
    { x: -8, y: 5 },
    { x: -20, y: -5 },
    { x: -5, y: -5 },
  ], {
    left: 300,
    top: 350,
    fill: '#FFFFFF',
    originX: 'center',
    originY: 'center',
    selectable: true,
  });
  canvas.add(star2);

  const weightText = new fabric.Text('100 г', {
    left: 200,
    top: 500,
    fontSize: 28,
    fontFamily: 'Roboto',
    fill: '#FFFFFF',
    fontWeight: 'bold',
    originX: 'center',
    selectable: true,
  });
  canvas.add(weightText);
};

const createTemplate4 = (canvas: fabric.Canvas) => {
  // Минималистичный стиль - белый с акцентами
  const bgRect = new fabric.Rect({
    left: 0,
    top: 0,
    width: 400,
    height: 600,
    fill: '#FFFFFF',
    selectable: false,
  });
  canvas.add(bgRect);

  const topBar = new fabric.Rect({
    left: 0,
    top: 0,
    width: 400,
    height: 80,
    fill: '#212121',
    selectable: false,
  });
  canvas.add(topBar);

  const title = new fabric.Text('SNACKS', {
    left: 200,
    top: 40,
    fontSize: 32,
    fontFamily: 'Roboto',
    fill: '#FFFFFF',
    fontWeight: 'bold',
    originX: 'center',
    originY: 'center',
    selectable: true,
  });
  canvas.add(title);

  const line1 = new fabric.Line([50, 150, 350, 150], {
    stroke: '#E0E0E0',
    strokeWidth: 2,
    selectable: true,
  });
  canvas.add(line1);

  const subtitle = new fabric.Text('Минимализм\nи качество', {
    left: 200,
    top: 250,
    fontSize: 24,
    fontFamily: 'Roboto',
    fill: '#212121',
    textAlign: 'center',
    originX: 'center',
    selectable: true,
  });
  canvas.add(subtitle);

  const line2 = new fabric.Line([50, 350, 350, 350], {
    stroke: '#E0E0E0',
    strokeWidth: 2,
    selectable: true,
  });
  canvas.add(line2);

  const smallText = new fabric.Text('Персонализированный продукт', {
    left: 200,
    top: 450,
    fontSize: 14,
    fontFamily: 'Roboto',
    fill: '#757575',
    originX: 'center',
    selectable: true,
  });
  canvas.add(smallText);

  const weightText = new fabric.Text('100 г', {
    left: 200,
    top: 550,
    fontSize: 20,
    fontFamily: 'Roboto',
    fill: '#212121',
    originX: 'center',
    selectable: true,
  });
  canvas.add(weightText);
};

const createTemplate5 = (canvas: fabric.Canvas) => {
  // Эко-стиль - зеленый природный
  const bgRect = new fabric.Rect({
    left: 0,
    top: 0,
    width: 400,
    height: 600,
    fill: '#E8F5E9',
    selectable: false,
  });
  canvas.add(bgRect);

  // Декоративный лист
  const leaf = new fabric.Path('M 200 100 Q 150 80 120 120 Q 100 150 130 180 Q 160 200 200 220 Q 240 200 270 180 Q 300 150 280 120 Q 250 80 200 100 Z', {
    left: 200,
    top: 150,
    fill: '#4CAF50',
    opacity: 0.6,
    originX: 'center',
    originY: 'center',
    selectable: true,
  });
  canvas.add(leaf);

  const title = new fabric.Text('ORGANIC\nSNACKS', {
    left: 200,
    top: 250,
    fontSize: 32,
    fontFamily: 'Roboto',
    fill: '#2E7D32',
    fontWeight: 'bold',
    textAlign: 'center',
    originX: 'center',
    selectable: true,
  });
  canvas.add(title);

  const subtitle = new fabric.Text('Натуральные ингредиенты', {
    left: 200,
    top: 320,
    fontSize: 16,
    fontFamily: 'Roboto',
    fill: '#388E3C',
    originX: 'center',
    selectable: true,
  });
  canvas.add(subtitle);

  // Декоративные круги
  const circle1 = new fabric.Circle({
    left: 80,
    top: 400,
    radius: 25,
    fill: '#66BB6A',
    opacity: 0.5,
    selectable: true,
  });
  canvas.add(circle1);

  const circle2 = new fabric.Circle({
    left: 200,
    top: 420,
    radius: 30,
    fill: '#4CAF50',
    opacity: 0.5,
    originX: 'center',
    originY: 'center',
    selectable: true,
  });
  canvas.add(circle2);

  const circle3 = new fabric.Circle({
    left: 320,
    top: 400,
    radius: 25,
    fill: '#66BB6A',
    opacity: 0.5,
    selectable: true,
  });
  canvas.add(circle3);

  const infoText = new fabric.Text('Эко-упаковка\n100% перерабатываемо', {
    left: 200,
    top: 500,
    fontSize: 14,
    fontFamily: 'Roboto',
    fill: '#2E7D32',
    textAlign: 'center',
    originX: 'center',
    selectable: true,
  });
  canvas.add(infoText);
};

const PACKAGING_TEMPLATES: PackagingTemplate[] = [
  { 
    id: 'template-1', 
    name: 'Классический', 
    width: 400, 
    height: 600, 
    bgColor: '#4CAF50',
    createElements: createTemplate1,
  },
  { 
    id: 'template-2', 
    name: 'Современный', 
    width: 400, 
    height: 600, 
    bgColor: '#2196F3',
    createElements: createTemplate2,
  },
  { 
    id: 'template-3', 
    name: 'Яркий', 
    width: 400, 
    height: 600, 
    bgColor: '#FF9800',
    createElements: createTemplate3,
  },
  { 
    id: 'template-4', 
    name: 'Минималистичный', 
    width: 400, 
    height: 600, 
    bgColor: '#FFFFFF',
    createElements: createTemplate4,
  },
  { 
    id: 'template-5', 
    name: 'Эко-стиль', 
    width: 400, 
    height: 600, 
    bgColor: '#E8F5E9',
    createElements: createTemplate5,
  },
];

export const PackagingDesignPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('projectId');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(PACKAGING_TEMPLATES[0].id);
  const [textInput, setTextInput] = useState('');
  const [saved, setSaved] = useState(false);

  // Инициализация Fabric.js
  useEffect(() => {
    if (!canvasRef.current) return;

    const template = PACKAGING_TEMPLATES.find((t) => t.id === selectedTemplate) || PACKAGING_TEMPLATES[0];

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: template.width,
      height: template.height,
      backgroundColor: template.bgColor,
    });

    fabricCanvasRef.current = canvas;

    // Очищаем canvas перед применением шаблона
    canvas.clear();
    canvas.backgroundColor = template.bgColor;

    // Применяем элементы выбранного шаблона
    template.createElements(canvas);

    // Включаем редактирование текста двойным кликом
    canvas.on('mouse:dblclick', (e) => {
      const activeObject = canvas.getActiveObject();
      if (activeObject && activeObject.type === 'text') {
        const textObject = activeObject as fabric.Text;
        
        // Получаем координаты объекта на canvas
        const canvasElement = canvas.getElement();
        const canvasRect = canvasElement.getBoundingClientRect();
        const objCoords = textObject.getCoords();
        
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = textObject.text || '';
        textInput.style.position = 'fixed';
        textInput.style.top = `${canvasRect.top + (objCoords[0].y || textObject.top || 0)}px`;
        textInput.style.left = `${canvasRect.left + (objCoords[0].x || textObject.left || 0)}px`;
        textInput.style.width = `${Math.max(textObject.width || 200, 200)}px`;
        textInput.style.height = `${textObject.height || 30}px`;
        textInput.style.fontSize = `${textObject.fontSize || 24}px`;
        textInput.style.fontFamily = textObject.fontFamily || 'Roboto';
        textInput.style.fontWeight = textObject.fontWeight || 'normal';
        textInput.style.border = '2px solid #2196F3';
        textInput.style.padding = '5px';
        textInput.style.zIndex = '10000';
        textInput.style.background = 'white';
        textInput.style.boxSizing = 'border-box';
        
        document.body.appendChild(textInput);
        textInput.focus();
        textInput.select();

        const finishEditing = () => {
          if (textInput.value !== '') {
            textObject.set('text', textInput.value);
            canvas.renderAll();
          }
          if (document.body.contains(textInput)) {
            document.body.removeChild(textInput);
          }
        };

        textInput.addEventListener('blur', finishEditing);
        textInput.addEventListener('keydown', (evt) => {
          if (evt.key === 'Enter') {
            evt.preventDefault();
            finishEditing();
          } else if (evt.key === 'Escape') {
            if (document.body.contains(textInput)) {
              document.body.removeChild(textInput);
            }
          }
        });
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [selectedTemplate]);

  // Обработчик изменения шаблона
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    // Canvas пересоздастся в useEffect при изменении selectedTemplate
  };

  const handleAddText = () => {
    if (!fabricCanvasRef.current || !textInput.trim()) return;

    const text = new fabric.Text(textInput, {
      left: 100,
      top: 200,
      fontSize: 24,
      fontFamily: 'Roboto',
      fill: '#000000',
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    setTextInput('');
  };

  const handleAddImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file || !fabricCanvasRef.current) return;

      const reader = new FileReader();
      reader.onload = (event: any) => {
        fabric.Image.fromURL(event.target.result, (img) => {
          img.scale(0.5);
          img.set({
            left: 50,
            top: 300,
          });
          fabricCanvasRef.current!.add(img);
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleDeleteSelected = () => {
    if (!fabricCanvasRef.current) return;
    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    activeObjects.forEach((obj) => fabricCanvasRef.current!.remove(obj));
    fabricCanvasRef.current.discardActiveObject().renderAll();
  };

  const handleSave = () => {
    if (!fabricCanvasRef.current) return;

    const canvasData = JSON.stringify(fabricCanvasRef.current.toJSON());

    if (DEMO_MODE) {
      const savedDesigns = JSON.parse(localStorage.getItem('packagingDesigns') || '[]');
      const design = {
        id: `design-${Date.now()}`,
        templateId: selectedTemplate,
        canvasData,
        exportedAt: new Date().toISOString(),
      };
      savedDesigns.push(design);
      localStorage.setItem('packagingDesigns', JSON.stringify(savedDesigns));
      
      // Автоматически меняем статус проекта на 'presentation' после создания упаковки
      if (projectId) {
        const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        const projectIndex = savedProjects.findIndex((p: any) => p.id === projectId);
        if (projectIndex !== -1) {
          savedProjects[projectIndex].status = 'presentation';
          savedProjects[projectIndex].packaging = design;
          localStorage.setItem('projects', JSON.stringify(savedProjects));
        }
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleExportPNG = () => {
    if (!fabricCanvasRef.current) return;
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
    });
    const link = document.createElement('a');
    link.download = `packaging-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleExportPDF = () => {
    if (!fabricCanvasRef.current) return;
    // Простой экспорт через canvas
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
    });
    // В реальном проекте здесь был бы jsPDF
    alert('Экспорт в PDF (в полной версии использует jsPDF)');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Редактор упаковки
        </Typography>
        {DEMO_MODE && (
          <Chip label="Демо-режим" color="info" size="small" sx={{ bgcolor: COLORS.secondary, color: 'white' }} />
        )}
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaved(false)}>
          Дизайн сохранен!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Панель инструментов */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Шаблоны
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Выберите шаблон</InputLabel>
              <Select
                value={selectedTemplate}
                label="Выберите шаблон"
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {PACKAGING_TEMPLATES.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              При выборе шаблона canvas обновится с новым дизайном
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Добавить элементы
            </Typography>

            <TextField
              fullWidth
              label="Текст"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              sx={{ mb: 2 }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddText();
                }
              }}
            />
            <Button
              fullWidth
              variant="outlined"
              startIcon={<TextFieldsIcon />}
              onClick={handleAddText}
              disabled={!textInput.trim()}
              sx={{ mb: 2 }}
            >
              Добавить текст
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<ImageIcon />}
              onClick={handleAddImage}
              sx={{ mb: 2 }}
            >
              Добавить изображение
            </Button>

            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={handleDeleteSelected}
              sx={{ mb: 2 }}
            >
              Удалить выбранное
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Инструкция: Перетаскивайте элементы, изменяйте размер, редактируйте текст двойным кликом
            </Typography>
          </Paper>
        </Grid>

        {/* Canvas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
            <Box sx={{ border: '1px solid #ccc', bgcolor: 'white' }}>
              <canvas ref={canvasRef}></canvas>
            </Box>
          </Paper>
        </Grid>

        {/* Панель действий */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Действия
            </Typography>

            <Button
              fullWidth
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              sx={{ mb: 2, bgcolor: COLORS.primary }}
            >
              Сохранить дизайн
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportPNG}
              sx={{ mb: 2 }}
            >
              Экспорт PNG
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportPDF}
              sx={{ mb: 2 }}
            >
              Экспорт PDF
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/presentation' + (projectId ? `?projectId=${projectId}` : ''))}
              sx={{ mt: 3 }}
            >
              Перейти к презентации
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Готовых шаблонов: {PACKAGING_TEMPLATES.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

