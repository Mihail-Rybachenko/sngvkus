import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Download as DownloadIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  Image as ImageIcon,
  Layers as LayersIcon,
  Save as SaveIcon,
  TextFields as TextFieldsIcon,
} from '@mui/icons-material';
// @ts-expect-error local package has no bundled types in this setup
import { fabric } from 'fabric';
import jsPDF from 'jspdf';
import api from '@/services/api';
import { COLORS, DEMO_MODE } from '@/utils/constants';
import type { ProjectStatus } from '@/types';
import { findMergedDemoProject } from '@/utils/demoProjectsMerge';
import { canDownloadExports, EXPORT_LOCKED_MESSAGE } from '@/utils/exportPolicy';
import { fetchProjectStatus } from '@/utils/projectStatus';
import type { Side, RecipeBackInfo, SideDesignState } from '@/utils/packagingSnapshot';
import { TEMPLATES, DEFAULT_TEMPLATE, serializeCanvas, sideDataUrlFromState, applyTemplate } from '@/utils/packagingSnapshot';

export const PackagingDesignPage: React.FC = () => {
  const handleSideChange = (_: unknown, val: Side | null) => {
    if (!val) return;
    persistCurrentSideState(activeSideRef.current);
    setActiveSide(val);
  };

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('projectId');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [activeSide, setActiveSide] = useState<Side>('front');
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Roboto');
  const [fillColor, setFillColor] = useState('#111111');
  const [saved, setSaved] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
  const [preview, setPreview] = useState<{ front: string; back: string } | null>(null);
  const [recipeInfo, setRecipeInfo] = useState<RecipeBackInfo | null>(null);
  const [deficitElements, setDeficitElements] = useState<string[]>([]);
  const [packWeightGrams, setPackWeightGrams] = useState<number>(40);
  const [sideState, setSideState] = useState<Record<Side, SideDesignState>>({
    front: { templateId: DEFAULT_TEMPLATE.id, bgColor: DEFAULT_TEMPLATE.bgColor, canvasData: null },
    back: { templateId: DEFAULT_TEMPLATE.id, bgColor: DEFAULT_TEMPLATE.bgColor, canvasData: null },
  });
  const sideStateRef = useRef(sideState);
  const activeSideRef = useRef<Side>('front');
  const historyRef = useRef<Record<Side, string[]>>({ front: [], back: [] });
  const historyIndexRef = useRef<Record<Side, number>>({ front: -1, back: -1 });
  /** Не сериализовать canvas в sideState при программной отрисовке — иначе до прихода recipeInfo застревает старый JSON */
  const suppressCanvasPersistRef = useRef(false);

  const persistCurrentSideState = (sideOverride?: Side) => {
    if (suppressCanvasPersistRef.current) return;
    const side = sideOverride || activeSideRef.current;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const json = serializeCanvas(canvas);
    const bg = String(canvas.backgroundColor || sideStateRef.current[side].bgColor);
    setSideState((prev) => ({
      ...prev,
      [side]: { ...prev[side], canvasData: json, bgColor: bg },
    }));
  };

  const pushHistory = (sideOverride?: Side) => {
    const side = sideOverride || activeSideRef.current;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const json = serializeCanvas(canvas);
    const stack = historyRef.current[side];
    const i = historyIndexRef.current[side];
    const nextStack = stack.slice(0, i + 1);
    nextStack.push(json);
    historyRef.current[side] = nextStack.slice(-100);
    historyIndexRef.current[side] = historyRef.current[side].length - 1;
  };

  useEffect(() => {
    sideStateRef.current = sideState;
  }, [sideState]);

  useEffect(() => {
    activeSideRef.current = activeSide;
  }, [activeSide]);

  useEffect(() => {
    if (DEMO_MODE) return;
    if (!projectId) {
      setAccessError('Сначала создайте проект и завершите этап рецептуры.');
      setProjectStatus(null);
      return;
    }
    fetchProjectStatus(projectId).then((status) => {
      setProjectStatus(status);
      if (!['packaging', 'presentation', 'expert_review', 'completed'].includes(status || '')) {
        setAccessError(
          status === 'recipe_expert_review'
            ? 'Дождитесь одобрения рецептуры экспертом-диетологом, затем откроется этап упаковки.'
            : 'Этап упаковки доступен после одобрения рецептуры экспертом.'
        );
      } else {
        setAccessError(null);
      }
    });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
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
            ? 'Дождитесь одобрения рецептуры экспертом-диетологом, затем откроется этап упаковки.'
            : 'Этап упаковки доступен после одобрения рецептуры экспертом.'
        );
      } else {
        setAccessError(null);
      }
      const r = p?.recipe;
      const analysisEls = p?.analysis?.elements || [];
      const deficits = analysisEls
        .filter((e: any) => e?.balanceStatus === 'deficit' || e?.deficiency)
        .map((e: any) => String(e?.name || '').trim())
        .filter(Boolean);
      setDeficitElements(deficits);
      const pack = Number(String(r?.constructor?.packagingSize || '').replace(/[^\d]/g, '')) || 40;
      setPackWeightGrams(pack);
      const c = r?.constructor || {};
      if (r?.nutritionalValue) {
        setRecipeInfo({
          productType: r.productType,
          baseMatrix: c.baseMatrix,
          thermalMethod: c.thermalMethod,
          proteins: r.nutritionalValue.proteins,
          fats: r.nutritionalValue.fats,
          carbohydrates: r.nutritionalValue.carbohydrates,
          calories: r.nutritionalValue.calories,
          complianceIssues: r.compliance?.issues || [],
          packWeightGrams: pack,
        });
      }
      return;
    }
    Promise.allSettled([
      api.get(`/projects/${projectId}/recipe`),
      api.get(`/analysis/project/${projectId}/latest`),
    ]).then(([recipeRes, analysisRes]) => {
      if (recipeRes.status === 'fulfilled') {
        const r = recipeRes.value?.data || {};
        const c = r.constructor || {};
        const pack = Number(String(c.packagingSize || '').replace(/[^\d]/g, '')) || 40;
        setPackWeightGrams(pack);
        setRecipeInfo({
          productType: r.productType,
          baseMatrix: c.baseMatrix,
          thermalMethod: c.thermalMethod,
          proteins: r?.nutritionalValue?.proteins,
          fats: r?.nutritionalValue?.fats,
          carbohydrates: r?.nutritionalValue?.carbohydrates,
          calories: r?.nutritionalValue?.calories,
          complianceIssues: r?.compliance?.issues || [],
          packWeightGrams: pack,
        });
      }
      if (analysisRes.status === 'fulfilled') {
        const elements = analysisRes.value?.data?.elements || [];
        const deficits = elements
          .filter((e: any) => e?.balanceStatus === 'deficit' || e?.deficiency)
          .map((e: any) => String(e?.name || '').trim())
          .filter(Boolean);
        setDeficitElements(deficits);
      }
    });
  }, [projectId]);

  useEffect(() => {
    setRecipeInfo((prev) => (prev ? { ...prev, packWeightGrams } : prev));
  }, [packWeightGrams]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: DEFAULT_TEMPLATE.width,
      height: DEFAULT_TEMPLATE.height,
      preserveObjectStacking: true,
      selection: true,
    });
    fabricCanvasRef.current = canvas;

    const onChange = () => {
      if (suppressCanvasPersistRef.current) return;
      persistCurrentSideState(activeSideRef.current);
    };
    const onCommit = () => {
      if (suppressCanvasPersistRef.current) return;
      pushHistory(activeSideRef.current);
      persistCurrentSideState(activeSideRef.current);
    };

    canvas.on('object:modified', onCommit);
    canvas.on('object:added', onCommit);
    canvas.on('object:removed', onCommit);
    canvas.on('selection:created', onChange);
    canvas.on('selection:updated', onChange);
    canvas.on('selection:cleared', onChange);

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const side = sideStateRef.current[activeSide];
    const template = TEMPLATES.find((t) => t.id === side.templateId) || DEFAULT_TEMPLATE;
    const load = async () => {
      suppressCanvasPersistRef.current = true;
      try {
        canvas.clear();
        if (side.canvasData) {
          canvas.setDimensions({ width: template.width, height: template.height });
          canvas.setBackgroundColor(side.bgColor, () => undefined);
          await new Promise<void>((resolve) => {
            canvas.loadFromJSON(side.canvasData as any, () => resolve());
          });
          canvas.requestRenderAll();
        } else {
          applyTemplate(canvas, template, activeSide, recipeInfo || undefined, deficitElements);
        }
      } finally {
        suppressCanvasPersistRef.current = false;
      }
      pushHistory(activeSide);
    };
    void load();
  }, [activeSide, recipeInfo, deficitElements]);

  const handleTemplateChange = (templateId: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const template = TEMPLATES.find((t) => t.id === templateId) || DEFAULT_TEMPLATE;
    suppressCanvasPersistRef.current = true;
    try {
      applyTemplate(canvas, template, activeSide, recipeInfo || undefined, deficitElements);
    } finally {
      suppressCanvasPersistRef.current = false;
    }
    setSideState((prev) => ({
      ...prev,
      [activeSide]: {
        templateId,
        bgColor: template.bgColor,
        canvasData: serializeCanvas(canvas),
      },
    }));
    pushHistory();
  };

  const handleAddText = () => {
    if (!fabricCanvasRef.current || !textInput.trim()) return;

    const text = new fabric.Textbox(textInput, {
      left: 100,
      top: 200,
      width: 220,
      fontSize,
      fontFamily,
      fill: fillColor,
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
      const file = e.target.files?.[0];
      if (!file || !fabricCanvasRef.current) return;

      const canvas = fabricCanvasRef.current;

      const placeImage = (img: fabric.Image) => {
        const maxW = 260;
        const maxH = 260;
        const scale = Math.min(maxW / (img.width || maxW), maxH / (img.height || maxH));
        img.scale(scale);
        img.set({
          left: 90,
          top: 240,
          cornerStyle: 'circle',
          transparentCorners: false,
          selectable: true,
          evented: true,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.bringToFront(img);
        canvas.requestRenderAll();
        pushHistory();
        persistCurrentSideState(activeSideRef.current);
      };

      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const dataUrl = String(event.target?.result || '');
        if (!dataUrl) return;

        const httpUrl = /^https?:\/\//i.test(dataUrl);
        fabric.Image.fromURL(
          dataUrl,
          (img: fabric.Image | undefined, isError?: boolean) => {
            if (isError || !img) {
              const el = document.createElement('img');
              if (httpUrl) el.crossOrigin = 'anonymous';
              el.onload = () => {
                try {
                  const fImg = new fabric.Image(el, {
                    originX: 'center',
                    originY: 'center',
                  });
                  placeImage(fImg);
                } catch {
                  canvas.requestRenderAll();
                }
              };
              el.onerror = () => canvas.requestRenderAll();
              el.src = dataUrl;
              return;
            }
            placeImage(img);
          },
          httpUrl ? { crossOrigin: 'anonymous' } : {}
        );
      };
      reader.readAsDataURL(file);
      input.value = '';
    };
    input.click();
  };

  const handleDeleteSelected = () => {
    if (!fabricCanvasRef.current) return;
    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    activeObjects.forEach((obj: any) => fabricCanvasRef.current?.remove(obj));
    fabricCanvasRef.current.discardActiveObject().requestRenderAll();
  };

  const handleObjectColor = (color: string) => {
    setFillColor(color);
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject() as fabric.Object & { fill?: string };
    if (!obj) return;
    obj.set('fill', color);
    canvas.requestRenderAll();
  };

  const handleBackgroundColor = (color: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setBackgroundColor(color, () => canvas.requestRenderAll());
    setSideState((prev) => ({
      ...prev,
      [activeSide]: { ...prev[activeSide], bgColor: color },
    }));
  };

  const styleActiveText = (patch: Partial<fabric.Textbox>) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject() as fabric.Textbox | null;
    if (!obj || (obj.type !== 'textbox' && obj.type !== 'text')) return;
    obj.set(patch);
    canvas.requestRenderAll();
  };

  const handleBringForward = () => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    canvas.bringForward(obj);
    canvas.requestRenderAll();
  };

  const handleSendBackward = () => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    canvas.sendBackwards(obj);
    canvas.requestRenderAll();
  };

  const handleDuplicate = () => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    obj.clone((cloned: any) => {
      cloned.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
    });
  };

  const handleUndo = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const i = historyIndexRef.current[activeSide];
    if (i <= 0) return;
    historyIndexRef.current[activeSide] = i - 1;
    const json = historyRef.current[activeSide][historyIndexRef.current[activeSide]];
    suppressCanvasPersistRef.current = true;
    try {
      await new Promise<void>((resolve) => canvas.loadFromJSON(json as any, () => resolve()));
      canvas.requestRenderAll();
    } finally {
      suppressCanvasPersistRef.current = false;
    }
    persistCurrentSideState(activeSideRef.current);
  };

  const handleRedo = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const i = historyIndexRef.current[activeSide];
    const stack = historyRef.current[activeSide];
    if (i >= stack.length - 1) return;
    historyIndexRef.current[activeSide] = i + 1;
    const json = stack[historyIndexRef.current[activeSide]];
    suppressCanvasPersistRef.current = true;
    try {
      await new Promise<void>((resolve) => canvas.loadFromJSON(json as any, () => resolve()));
      canvas.requestRenderAll();
    } finally {
      suppressCanvasPersistRef.current = false;
    }
    persistCurrentSideState();
  };

  const handleUpdatePreview = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    persistCurrentSideState();

    const templateFront = TEMPLATES.find((x) => x.id === sideStateRef.current.front.templateId) || DEFAULT_TEMPLATE;
    const templateBack = TEMPLATES.find((x) => x.id === sideStateRef.current.back.templateId) || DEFAULT_TEMPLATE;
    const [front, back] = await Promise.all([
      sideDataUrlFromState(
        sideStateRef.current.front,
        'front',
        templateFront.width,
        templateFront.height,
        recipeInfo || undefined,
        deficitElements
      ),
      sideDataUrlFromState(
        sideStateRef.current.back,
        'back',
        templateBack.width,
        templateBack.height,
        recipeInfo || undefined,
        deficitElements
      ),
    ]);
    setPreview({ front, back });
  };

  const handleSave = () => {
    if (!fabricCanvasRef.current) return;
    persistCurrentSideState();
    const canvasData = JSON.stringify(sideStateRef.current);

    if (DEMO_MODE) {
      const savedDesigns = JSON.parse(localStorage.getItem('packagingDesigns') || '[]');
      const design = {
        id: `design-${Date.now()}`,
        templateId: sideStateRef.current.front.templateId,
        canvasData,
        exportedAt: new Date().toISOString(),
      };
      savedDesigns.push(design);
      localStorage.setItem('packagingDesigns', JSON.stringify(savedDesigns));
      
      // Автоматически меняем статус проекта на 'presentation' после создания упаковки
      if (projectId) {
        const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        const projectIndex = savedProjects.findIndex((p: any) => String(p.id) === String(projectId));
        if (projectIndex !== -1) {
          savedProjects[projectIndex].status = 'presentation';
          savedProjects[projectIndex].packaging = design;
          localStorage.setItem('projects', JSON.stringify(savedProjects));
        }
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      if (!projectId) return;
      api
        .put(`/projects/${projectId}/packaging`, {
          templateId: sideStateRef.current.front.templateId,
          canvasData,
          exportedAt: new Date().toISOString(),
        })
        .then(() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        })
        .catch(() => {
          // ignore
        });
    }
  };

  const handleExportPNG = async () => {
    if (!canDownloadExports(projectStatus)) return;
    await handleUpdatePreview();
    if (!preview) return;
    const left = new Image();
    const right = new Image();
    left.src = preview.front;
    right.src = preview.back;
    await Promise.all([
      new Promise((resolve) => (left.onload = resolve)),
      new Promise((resolve) => (right.onload = resolve)),
    ]);
    const merged = document.createElement('canvas');
    merged.width = left.width + right.width + 40;
    merged.height = Math.max(left.height, right.height) + 20;
    const ctx = merged.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, merged.width, merged.height);
    ctx.drawImage(left, 10, 10);
    ctx.drawImage(right, left.width + 30, 10);
    const dataURL = merged.toDataURL('image/png', 1);
    const link = document.createElement('a');
    link.download = `packaging-2-sides-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleExportPDF = async () => {
    if (!canDownloadExports(projectStatus)) return;
    await handleUpdatePreview();
    if (!preview) return;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const fitW = pageW - margin * 2;
    const fitH = pageH - margin * 2;
    pdf.text('Лицевая сторона', margin, 14);
    pdf.addImage(preview.front, 'PNG', margin, margin + 10, fitW, fitH - 10);
    pdf.addPage();
    pdf.text('Оборотная сторона', margin, 14);
    pdf.addImage(preview.back, 'PNG', margin, margin + 10, fitW, fitH - 10);
    pdf.save(`packaging-${Date.now()}.pdf`);
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
      {accessError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {accessError}
        </Alert>
      )}
      {!accessError && !canDownloadExports(projectStatus) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {EXPORT_LOCKED_MESSAGE}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Инструменты дизайна</Typography>
            <ToggleButtonGroup
              fullWidth
              exclusive
              value={activeSide}
              onChange={handleSideChange}
              sx={{ mb: 2 }}
            >
              <ToggleButton value="front">Лицевая</ToggleButton>
              <ToggleButton value="back">Оборотная</ToggleButton>
            </ToggleButtonGroup>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Шаблон стороны</InputLabel>
              <Select
                value={sideState[activeSide].templateId}
                label="Шаблон стороны"
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {TEMPLATES.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                label="Цвет объекта"
                type="color"
                value={fillColor}
                onChange={(e) => handleObjectColor(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
              />
              <TextField
                label="Фон стороны"
                type="color"
                value={sideState[activeSide].bgColor}
                onChange={(e) => handleBackgroundColor(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
              />
            </Stack>

            <TextField
              fullWidth
              label="Текст"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              sx={{ mb: 2 }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
            />

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                label="Размер"
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value) || 24)}
                size="small"
              fullWidth
              />
              <FormControl fullWidth size="small">
                <InputLabel>Шрифт</InputLabel>
                <Select label="Шрифт" value={fontFamily} onChange={(e) => setFontFamily(String(e.target.value))}>
                  <MenuItem value="Roboto">Roboto</MenuItem>
                  <MenuItem value="Arial">Arial</MenuItem>
                  <MenuItem value="Times New Roman">Times New Roman</MenuItem>
                  <MenuItem value="Montserrat">Montserrat</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Button fullWidth variant="outlined" startIcon={<TextFieldsIcon />} onClick={handleAddText} disabled={!textInput.trim()}>
                Текст
            </Button>
              <Button fullWidth variant="outlined" startIcon={<ImageIcon />} onClick={handleAddImage}>
                Фото
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button fullWidth variant="outlined" onClick={() => {
                const rect = new fabric.Rect({ left: 120, top: 120, width: 120, height: 60, fill: fillColor, rx: 10 });
                fabricCanvasRef.current?.add(rect);
              }}>
                Плашка
              </Button>
              <Button fullWidth variant="outlined" onClick={() => {
                const circle = new fabric.Circle({ left: 180, top: 180, radius: 40, fill: fillColor });
                fabricCanvasRef.current?.add(circle);
              }}>
                Круг
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button size="small" variant="outlined" startIcon={<FormatBoldIcon />} onClick={() => styleActiveText({ fontWeight: 'bold' })}>
                Bold
              </Button>
              <Button size="small" variant="outlined" startIcon={<FormatItalicIcon />} onClick={() => styleActiveText({ fontStyle: 'italic' })}>
                Italic
              </Button>
              <Button size="small" variant="outlined" onClick={() => styleActiveText({ fontSize })}>
                Размер
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button size="small" variant="outlined" startIcon={<LayersIcon />} onClick={handleBringForward}>
                Слой +
              </Button>
              <Button size="small" variant="outlined" onClick={handleSendBackward}>
                Слой -
              </Button>
              <Button size="small" variant="outlined" onClick={handleDuplicate}>
                Дубль
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button size="small" variant="outlined" onClick={handleUndo}>Undo</Button>
              <Button size="small" variant="outlined" onClick={handleRedo}>Redo</Button>
              <Button size="small" variant="outlined" color="error" onClick={handleDeleteSelected}>Удалить</Button>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Перетаскивайте элементы, масштабируйте за углы, выбирайте сторону упаковки и редактируйте отдельно.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle1">
              Редактор: {activeSide === 'front' ? 'Лицевая сторона' : 'Оборотная сторона'}
            </Typography>
            <Box sx={{ border: '1px solid #ccc', bgcolor: 'white', p: 1 }}>
              <canvas ref={canvasRef}></canvas>
            </Box>
            <Button variant="outlined" onClick={handleUpdatePreview}>Обновить предпросмотр 2 сторон</Button>
            {preview && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption">Лицевая</Typography>
                    <Box component="img" src={preview.front} sx={{ width: '100%', mt: 1 }} />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption">Оборотная</Typography>
                    <Box component="img" src={preview.back} sx={{ width: '100%', mt: 1 }} />
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Действия</Typography>

            <Button
              fullWidth
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!!accessError}
              sx={{ mb: 2, bgcolor: COLORS.primary }}
            >
              Сохранить дизайн 2 сторон
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportPNG}
              disabled={!canDownloadExports(projectStatus)}
              sx={{ mb: 2 }}
            >
              Экспорт PNG (2 стороны)
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportPDF}
              disabled={!canDownloadExports(projectStatus)}
              sx={{ mb: 2 }}
            >
              Экспорт PDF (front/back)
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/presentation' + (projectId ? `?projectId=${projectId}` : ''))}
              disabled={!!accessError}
              sx={{ mt: 3 }}
            >
              Перейти к презентации
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Готовых шаблонов: {TEMPLATES.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

