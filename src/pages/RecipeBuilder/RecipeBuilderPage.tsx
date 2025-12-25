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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAppSelector } from '@/store/hooks';
import { COLORS } from '@/utils/constants';
import {
  AVAILABLE_PREMIXES,
  calculateNutritionalValue,
  checkTRTS021Compliance,
} from '@/utils/mockData';
import type { ProductType, Premix, Recipe, NutritionalInfo } from '@/types';

const DEMO_MODE = true;

export const RecipeBuilderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('projectId');
  const { user } = useAppSelector((state) => state.auth);

  const [productType, setProductType] = useState<ProductType>('chips');
  const [selectedPremixes, setSelectedPremixes] = useState<Premix[]>([]);
  const [nutritionalValue, setNutritionalValue] = useState<NutritionalInfo | null>(null);
  const [compliance, setCompliance] = useState<{ trts021: boolean; issues: string[] } | null>(null);
  const [saved, setSaved] = useState(false);

  // Расчет при изменении
  useEffect(() => {
    if (selectedPremixes.length > 0) {
      const calculated = calculateNutritionalValue(productType, selectedPremixes);
      setNutritionalValue(calculated);
      const complianceCheck = checkTRTS021Compliance(calculated);
      setCompliance(complianceCheck);
    } else {
      setNutritionalValue(null);
      setCompliance(null);
    }
  }, [productType, selectedPremixes]);

  const handlePremixToggle = (premix: Premix) => {
    setSaved(false);
    if (selectedPremixes.find((p) => p.id === premix.id)) {
      setSelectedPremixes(selectedPremixes.filter((p) => p.id !== premix.id));
    } else {
      setSelectedPremixes([...selectedPremixes, premix]);
    }
  };

  const handleSave = () => {
    if (!nutritionalValue || !compliance) return;

    const recipe: Recipe = {
      id: `recipe-${Date.now()}`,
      productType,
      premixes: selectedPremixes,
      nutritionalValue,
      compliance,
    };

    // В демо-режиме сохраняем в localStorage
    if (DEMO_MODE) {
      const savedRecipes = JSON.parse(localStorage.getItem('recipes') || '[]');
      savedRecipes.push(recipe);
      localStorage.setItem('recipes', JSON.stringify(savedRecipes));
      
      // Автоматически меняем статус проекта на 'packaging' после создания рецептуры
      if (projectId) {
        const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        const projectIndex = savedProjects.findIndex((p: any) => p.id === projectId);
        if (projectIndex !== -1) {
          savedProjects[projectIndex].status = 'packaging';
          savedProjects[projectIndex].recipe = recipe;
          localStorage.setItem('projects', JSON.stringify(savedProjects));
        }
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const productTypeLabels: Record<ProductType, string> = {
    chips: 'Чипсы',
    flakes: 'Хлопья',
    snacks: 'Снеки',
    crackers: 'Хлебцы',
  };

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

      <Grid container spacing={3}>
        {/* Выбор типа продукта */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              1. Выбор типа продукта
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Тип продукта</InputLabel>
              <Select
                value={productType}
                label="Тип продукта"
                onChange={(e) => {
                  setProductType(e.target.value as ProductType);
                  setSaved(false);
                }}
              >
                {Object.entries(productTypeLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Базовые значения (на 100г):
            </Typography>
            {nutritionalValue && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  Калории: {nutritionalValue.calories} ккал
                </Typography>
                <Typography variant="body2">
                  Белки: {nutritionalValue.proteins}г | Жиры: {nutritionalValue.fats}г | Углеводы:{' '}
                  {nutritionalValue.carbohydrates}г
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Подбор премиксов */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              2. Подбор обогатительных премиксов
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Выберите премиксы для компенсации выявленных дефицитов
            </Typography>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {AVAILABLE_PREMIXES.map((premix) => {
                const isSelected = selectedPremixes.some((p) => p.id === premix.id);
                return (
                  <Card
                    key={premix.id}
                    sx={{
                      mb: 2,
                      border: isSelected ? `2px solid ${COLORS.primary}` : '1px solid #e0e0e0',
                      cursor: 'pointer',
                    }}
                    onClick={() => handlePremixToggle(premix)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {premix.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Состав:
                          </Typography>
                          <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                            {Object.entries(premix.composition).map(([element, value]) => (
                              <li key={element}>
                                <Typography variant="body2">
                                  {element}: {value} {element.includes('витамин') ? 'мг' : 'мг/кг'}
                                </Typography>
                              </li>
                            ))}
                          </Box>
                          <Typography variant="body2" sx={{ mt: 1, color: COLORS.accent }}>
                            Цена: {premix.price} ₽
                          </Typography>
                        </Box>
                        <Checkbox checked={isSelected} color="primary" />
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Пищевая ценность */}
        {nutritionalValue && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                3. Пищевая ценность (расчет в реальном времени)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Показатель</TableCell>
                      <TableCell align="right">Значение</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Калории</TableCell>
                      <TableCell align="right">{nutritionalValue.calories} ккал</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Белки</TableCell>
                      <TableCell align="right">{nutritionalValue.proteins} г</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Жиры</TableCell>
                      <TableCell align="right">{nutritionalValue.fats} г</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Углеводы</TableCell>
                      <TableCell align="right">{nutritionalValue.carbohydrates} г</TableCell>
                    </TableRow>
                    {Object.entries(nutritionalValue.microelements).map(([element, value]) => (
                      <TableRow key={element}>
                        <TableCell>{element.charAt(0).toUpperCase() + element.slice(1)}</TableCell>
                        <TableCell align="right">
                          {value.toFixed(2)} {element.includes('витамин') ? 'мг' : 'мг/кг'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}

        {/* Проверка соответствия ТР ТС 021/2011 */}
        {compliance && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                4. Проверка соответствия ТР ТС 021/2011
              </Typography>
              {compliance.trts021 ? (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon />
                    <Typography>Рецептура соответствует нормативам ТР ТС 021/2011</Typography>
                  </Box>
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Выявлены несоответствия:
                  </Typography>
                  <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                    {compliance.issues.map((issue, idx) => (
                      <li key={idx}>
                        <Typography variant="body2">{issue}</Typography>
                      </li>
                    ))}
                  </Box>
                </Alert>
              )}
            </Paper>
          </Grid>
        )}

        {/* Действия */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!nutritionalValue || selectedPremixes.length === 0}
                sx={{ bgcolor: COLORS.primary }}
              >
                Сохранить рецептуру
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/packaging' + (projectId ? `?projectId=${projectId}` : ''))}
                disabled={!nutritionalValue || !compliance?.trts021}
              >
                Перейти к дизайну упаковки
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

