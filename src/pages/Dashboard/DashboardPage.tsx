import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Science as ScienceIcon,
  Restaurant as RestaurantIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useGetProjectsQuery, useCreateProjectMutation, useDeleteProjectMutation } from '@/store/api';
import { useAppSelector } from '@/store/hooks';
import { COLORS, DEMO_MODE } from '@/utils/constants';
import { demoUser } from '@/utils/demoData';
import { getMergedDemoProjects } from '@/utils/demoProjectsMerge';
import type { ProjectStatus, Project } from '@/types';

const statusLabels: Record<ProjectStatus, string> = {
  draft: 'Черновик',
  analysis: 'Анализ',
  recipe: 'Рецептура',
  recipe_expert_review: 'Проверка рецептуры',
  packaging: 'Упаковка',
  presentation: 'Презентация',
  expert_review: 'У координатора',
  completed: 'Завершен',
};

const statusColors: Record<ProjectStatus, string> = {
  draft: '#757575',
  analysis: COLORS.secondary,
  recipe: COLORS.accent,
  recipe_expert_review: '#FF9800',
  packaging: COLORS.primary,
  presentation: '#9C27B0',
  expert_review: '#FF5722',
  completed: COLORS.success,
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { data: apiProjects = [], isLoading: isApiLoading } = useGetProjectsQuery(undefined, {
    skip: DEMO_MODE,
    refetchOnMountOrArgChange: true,
  });
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  // Загружаем проекты из localStorage при инициализации
  const [localProjects, setLocalProjects] = useState<Project[]>(() => (DEMO_MODE ? getMergedDemoProjects() : []));

  const getFilteredProjects = () => {
    if (!user) return [];

    if (!DEMO_MODE) {
      if (user.role === 'student') {
        return (apiProjects || []).filter((p) => String(p.student?.id) === String(user.id));
      }
      return apiProjects;
    }

    const merged = getMergedDemoProjects();
    if (user.role === 'coordinator' || user.role === 'expert') return merged;
    return merged.filter((p) => p.student.id === user.id);
  };

  const applyStatusFilter = (items: Project[]) => {
    if (statusFilter === 'all') return items;
    return items.filter((p) => p.status === statusFilter);
  };

  useEffect(() => {
    if (DEMO_MODE) {
      setLocalProjects(getMergedDemoProjects());
    }
  }, []);

  const projects = applyStatusFilter(getFilteredProjects());
  const isLoading = DEMO_MODE ? false : isApiLoading;

  const handleCreateProject = async () => {
    if (DEMO_MODE) {
      // Демо-режим: создаем локальный проект
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: `Проект ${new Date().toLocaleDateString()}`,
        status: 'draft',
        student: user && user.role === 'student' ? user : demoUser,
        comments: [],
        notifications: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Сохраняем в localStorage
      const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      savedProjects.push(newProject);
      localStorage.setItem('projects', JSON.stringify(savedProjects));
      
      // Обновляем локальное состояние
      setLocalProjects([...localProjects, newProject]);
      
      // Переходим к анализу данных (этап 1)
      navigate(`/analysis?projectId=${newProject.id}`);
    } else {
      try {
        const result = await createProject({
          name: `Проект ${new Date().toLocaleDateString()}`,
        }).unwrap();
        navigate(`/analysis?projectId=${result.id}`);
      } catch (error) {
        console.error('Failed to create project:', error);
      }
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const ok = window.confirm(`Удалить проект "${projectName}"? Это действие нельзя отменить.`);
    if (!ok) return;

    if (DEMO_MODE) {
      const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      const filtered = savedProjects.filter((p: Project) => p.id !== projectId);
      localStorage.setItem('projects', JSON.stringify(filtered));
      setLocalProjects((prev) => prev.filter((p) => p.id !== projectId));
      return;
    }

    try {
      await deleteProject(projectId).unwrap();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1">
            {user?.role === 'coordinator'
              ? 'Все проекты'
              : user?.role === 'expert'
                ? 'Все проекты (проверка рецептур)'
                : 'Мои проекты'}
          </Typography>
          {DEMO_MODE && (
            <Chip
              label="Демо-режим"
              color="info"
              size="small"
              sx={{ mt: 1, bgcolor: COLORS.secondary, color: 'white' }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Фильтр по этапу</InputLabel>
            <Select
              label="Фильтр по этапу"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ProjectStatus)}
            >
              <MenuItem value="all">Все этапы</MenuItem>
              <MenuItem value="draft">Черновик</MenuItem>
              <MenuItem value="analysis">Анализ</MenuItem>
              <MenuItem value="recipe">Рецептура</MenuItem>
              <MenuItem value="recipe_expert_review">Проверка рецептуры</MenuItem>
              <MenuItem value="packaging">Упаковка</MenuItem>
              <MenuItem value="presentation">Презентация</MenuItem>
              <MenuItem value="expert_review">Подтверждение</MenuItem>
              <MenuItem value="completed">Завершен</MenuItem>
            </Select>
          </FormControl>
          {user?.role !== 'expert' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateProject}
              disabled={isCreating}
              sx={{ bgcolor: COLORS.primary }}
            >
              Создать проект
            </Button>
          )}
        </Box>
      </Box>

      {isLoading ? (
        <Typography>Загрузка...</Typography>
      ) : projects.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            У вас пока нет проектов
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Создайте первый проект для начала работы
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateProject}
            disabled={isCreating}
            sx={{ bgcolor: COLORS.primary }}
          >
            Создать проект
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {project.name}
                  </Typography>
                  <Chip
                    label={statusLabels[project.status]}
                    size="small"
                    sx={{
                      bgcolor: statusColors[project.status],
                      color: 'white',
                      mb: 2,
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Создан: {new Date(project.createdAt).toLocaleDateString()}
                  </Typography>
                  {project.student && (
                    <Typography variant="body2" color="text.secondary">
                      Студент: {project.student.email}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => navigate(`/project/${project.id}`)}>
                    Открыть проект
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteProject(project.id, project.name)}
                  >
                    Удалить
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Быстрые действия
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 },
                bgcolor: COLORS.secondary,
                color: 'white',
              }}
              onClick={() => navigate('/analysis')}
            >
              <CardContent>
                <ScienceIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">Анализ данных</Typography>
                <Typography variant="body2">
                  Загрузите CSV файл с микроэлементным анализом
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 },
                bgcolor: COLORS.accent,
                color: 'white',
              }}
              onClick={() => navigate('/recipe')}
            >
              <CardContent>
                <RestaurantIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">Конструктор рецептур</Typography>
                <Typography variant="body2">
                  Создайте персонализированную рецептуру
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

