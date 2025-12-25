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
} from '@mui/material';
import {
  Add as AddIcon,
  Science as ScienceIcon,
  Restaurant as RestaurantIcon,
} from '@mui/icons-material';
import { useGetProjectsQuery, useCreateProjectMutation } from '@/store/api';
import { useAppSelector } from '@/store/hooks';
import { COLORS } from '@/utils/constants';
import { demoProjects } from '@/utils/demoData';
import type { ProjectStatus, Project } from '@/types';

// Демо-режим: если true, используем демо-данные
const DEMO_MODE = true;

const statusLabels: Record<ProjectStatus, string> = {
  draft: 'Черновик',
  analysis: 'Анализ',
  recipe: 'Рецептура',
  packaging: 'Упаковка',
  completed: 'Завершен',
};

const statusColors: Record<ProjectStatus, string> = {
  draft: '#757575',
  analysis: COLORS.secondary,
  recipe: COLORS.accent,
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
  });
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  // Загружаем проекты из localStorage при инициализации
  const [localProjects, setLocalProjects] = useState<Project[]>(() => {
    if (DEMO_MODE) {
      const saved = localStorage.getItem('projects');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.length > 0 ? parsed : demoProjects;
        } catch {
          return demoProjects;
        }
      }
      return demoProjects;
    }
    return [];
  });

  // Фильтрация проектов по ролям:
  // - Студент: видит только свои проекты
  // - Координатор: видит ВСЕ проекты
  // - Эксперт: видит проекты на этапе экспертизы
  const getFilteredProjects = () => {
    if (!DEMO_MODE) return apiProjects;
    
    if (!user) return localProjects;
    
    if (user.role === 'coordinator') {
      // Координатор видит все проекты
      return localProjects;
    }
    
    if (user.role === 'expert') {
      // Эксперт видит только проекты на экспертизе
      return localProjects.filter((p) => p.status === 'expert_review');
    }
    
    // Студент видит только свои проекты
    return localProjects.filter((p) => p.student.id === user.id);
  };

  // Обновляем проекты при монтировании
  useEffect(() => {
    if (DEMO_MODE) {
      const saved = localStorage.getItem('projects');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const allProjects = [...parsed, ...demoProjects];
          const uniqueProjects = allProjects.filter((project, index, self) =>
            index === self.findIndex((p) => p.id === project.id)
          );
          setLocalProjects(uniqueProjects.length > 0 ? uniqueProjects : demoProjects);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const projects = getFilteredProjects();
  const isLoading = DEMO_MODE ? false : isApiLoading;

  const handleCreateProject = async () => {
    if (DEMO_MODE) {
      // Демо-режим: создаем локальный проект
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: `Проект ${new Date().toLocaleDateString()}`,
        status: 'draft',
        student: user || demoProjects[0].student,
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1">
            {user?.role === 'coordinator' 
              ? 'Все проекты' 
              : user?.role === 'expert' 
              ? 'Проекты на экспертизе'
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

