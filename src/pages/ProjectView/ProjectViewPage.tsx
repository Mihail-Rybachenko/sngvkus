import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Divider,
  Alert,
  Stack,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAppSelector } from '@/store/hooks';
import { ProjectWorkflow } from '@/components/workflow/ProjectWorkflow';
import { CommentSection } from '@/components/comments/CommentSection';
import { COLORS, DEMO_MODE } from '@/utils/constants';
import { findMergedDemoProject } from '@/utils/demoProjectsMerge';
import type { Project, ProjectStatus, Comment } from '@/types';
import api from '@/services/api';

export const ProjectViewPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [project, setProject] = useState<Project | null>(null);
  const [projectLoadState, setProjectLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<{ deficits: string[]; surpluses: string[] } | null>(null);
  const [recipeSummary, setRecipeSummary] = useState<{
    nutritionalValue: {
      calories: number;
      proteins: number;
      fats: number;
      carbohydrates: number;
      microelements: Record<string, number>;
    };
    compliance: { trts021: boolean; issues: string[] };
    premixes: Array<{ id: string; name: string }>;
  } | null>(null);
  const [recipeLoadState, setRecipeLoadState] = useState<'idle' | 'loading' | 'ready' | 'missing'>('idle');

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setProjectLoadState('missing');
      return;
    }

    if (DEMO_MODE) {
      const found = findMergedDemoProject(projectId);
      setProject(found ?? null);
      setProjectLoadState(found ? 'ready' : 'missing');
      return;
    }

    setProjectLoadState('loading');
    api
      .get<Project>(`/projects/${projectId}`)
      .then((resp) => {
        setProject(resp.data);
        setProjectLoadState('ready');
      })
      .catch(async () => {
        // Фолбэк для эксперта: если прямой GET не сработал, пробуем найти проект в общем списке.
        if (user?.role === 'expert') {
          try {
            const listResp = await api.get<Project[]>('/projects');
            const found = (listResp.data || []).find((p) => String(p.id) === String(projectId));
            if (found) {
              setProject(found);
              setProjectLoadState('ready');
              return;
            }
          } catch {
            // ignore
          }
        }
        setProject(null);
        setProjectLoadState('missing');
      });
  }, [projectId, user?.role]);

  useEffect(() => {
    if (!projectId) return;
    if (DEMO_MODE) {
      const p = findMergedDemoProject(projectId);
      const elements = p?.analysis?.elements || [];
      const deficits = elements
        .filter((e: any) => e.balanceStatus === 'deficit' || e.deficiency)
        .map((e: any) => e.name);
      const surpluses = elements
        .filter((e: any) => e.balanceStatus === 'surplus' || e.surplus)
        .map((e: any) => e.name);
      setAnalysisSummary({ deficits, surpluses });
      return;
    }
    api
      .get(`/analysis/project/${projectId}/latest`)
      .then((resp) => {
        const elements = resp.data?.elements || [];
        const deficits = elements
          .filter((e: any) => e.balanceStatus === 'deficit' || e.deficiency)
          .map((e: any) => e.name);
        const surpluses = elements
          .filter((e: any) => e.balanceStatus === 'surplus' || e.surplus)
          .map((e: any) => e.name);
        setAnalysisSummary({ deficits, surpluses });
      })
      .catch(() => setAnalysisSummary(null));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (DEMO_MODE) {
      const p = findMergedDemoProject(projectId);
      const r: any = p?.recipe;
      if (r?.nutritionalValue) {
        setRecipeSummary({
          nutritionalValue: r.nutritionalValue,
          compliance: r.compliance || { trts021: false, issues: [] },
          premixes: Array.isArray(r.premixes) ? r.premixes.map((x: any) => ({ id: String(x.id), name: String(x.name) })) : [],
        });
        setRecipeLoadState('ready');
      } else {
        setRecipeSummary(null);
        setRecipeLoadState('missing');
      }
      return;
    }
    setRecipeLoadState('loading');
    api
      .get(`/projects/${projectId}/recipe`)
      .then((resp) => {
        const r: any = resp.data || {};
        if (r?.nutritionalValue) {
          setRecipeSummary({
            nutritionalValue: r.nutritionalValue,
            compliance: r.compliance || { trts021: false, issues: [] },
            premixes: Array.isArray(r.premixes) ? r.premixes.map((x: any) => ({ id: String(x.id), name: String(x.name) })) : [],
          });
          setRecipeLoadState('ready');
        } else {
          setRecipeSummary(null);
          setRecipeLoadState('missing');
        }
      })
      .catch(() => {
        setRecipeSummary(null);
        setRecipeLoadState('missing');
      });
  }, [projectId]);

  useEffect(() => {
    if (DEMO_MODE) return;
    if (!projectId) return;
    api
      .get<Comment[]>(`/projects/${projectId}/comments`)
      .then((resp) => {
        setProject((prev) => (prev ? { ...prev, comments: resp.data } : prev));
      })
      .catch(() => {
        // ignore
      });
  }, [projectId]);

  if (projectLoadState === 'loading') {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Загрузка проекта…</Typography>
      </Box>
    );
  }

  if (!project || projectLoadState === 'missing') {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 2 }}>
          К списку проектов
        </Button>
        <Typography>Проект не найден или нет доступа.</Typography>
      </Box>
    );
  }

  const STATUS_ORDER: ProjectStatus[] = [
    'draft',
    'analysis',
    'recipe',
    'recipe_expert_review',
    'packaging',
    'presentation',
    'expert_review',
    'completed',
  ];

  const handleStatusChange = (newStatus: ProjectStatus) => {
    if (DEMO_MODE && project) {
      const updatedProject = { ...project, status: newStatus, updatedAt: new Date().toISOString() };
      setProject(updatedProject);

      const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      const projectIndex = savedProjects.findIndex((p: Project) => String(p.id) === String(project.id));
      if (projectIndex !== -1) {
        savedProjects[projectIndex] = updatedProject;
      } else {
        savedProjects.push(updatedProject);
      }
      localStorage.setItem('projects', JSON.stringify(savedProjects));
    } else if (project) {
      setWorkflowError(null);
      const from = project.status;
      let body: { action: string; to?: ProjectStatus } = { action: 'next' };

      if (from === 'recipe_expert_review' && newStatus === 'packaging') body = { action: 'approve_recipe' };
      else if (from === 'recipe_expert_review' && newStatus === 'recipe') body = { action: 'reject_recipe' };
      else if (from === 'expert_review' && newStatus === 'presentation') body = { action: 'reject' };
      else if (from === 'expert_review' && newStatus === 'completed') body = { action: 'approve' };
      else if (from === 'presentation' && newStatus === 'expert_review') body = { action: 'submit_review' };
      else if (STATUS_ORDER.indexOf(newStatus) === STATUS_ORDER.indexOf(from) + 1) body = { action: 'next' };
      else if (STATUS_ORDER.indexOf(newStatus) === STATUS_ORDER.indexOf(from) - 1) body = { action: 'prev' };
      else body = { action: 'goto', to: newStatus };

      api
        .post(`/projects/${project.id}/workflow`, body)
        .then((resp) => {
          const to = (resp.data?.to as ProjectStatus | undefined) ?? newStatus;
          setProject({ ...project, status: to, updatedAt: new Date().toISOString() });
        })
        .catch((e) => {
          setWorkflowError(
            e?.response?.data?.message || e?.message || 'Не удалось изменить статус проекта'
          );
        });
    }
  };

  const goToStagePath = (target: ProjectStatus) => {
    switch (target) {
      case 'analysis':
        return `/analysis?projectId=${project?.id}`;
      case 'recipe':
        return `/recipe?projectId=${project?.id}`;
      case 'packaging':
        return `/packaging?projectId=${project?.id}`;
      case 'presentation':
        return `/presentation?projectId=${project?.id}`;
      default:
        return `/project/${project?.id}`;
    }
  };

  const handleQuickJump = (target: ProjectStatus) => {
    if (!project) return;
    const path = goToStagePath(target);
    if (user?.role === 'expert') {
      navigate(path);
      return;
    }
    if (DEMO_MODE) {
      handleStatusChange(target);
      navigate(path);
      return;
    }
    setWorkflowError(null);
    api
      .post(`/projects/${project.id}/workflow`, { action: 'goto', to: target })
      .then((resp) => {
        const to = (resp.data?.to as ProjectStatus | undefined) ?? target;
        setProject({ ...project, status: to, updatedAt: new Date().toISOString() });
        navigate(path);
      })
      .catch((e) => {
        setWorkflowError(e?.response?.data?.message || e?.message || 'Не удалось перейти на этап');
      });
  };

  const handleAddComment = (text: string) => {
    if (!user) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      author: user,
      text,
      createdAt: new Date().toISOString(),
      type: user.role === 'expert' ? 'expert' : user.role === 'coordinator' ? 'coordinator' : 'student',
    };

    if (DEMO_MODE && project) {
      const updatedProject = {
        ...project,
        comments: [...(project.comments || []), newComment],
        updatedAt: new Date().toISOString(),
      };
      setProject(updatedProject);
      
      // Сохраняем в localStorage
      const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      const projectIndex = savedProjects.findIndex((p: Project) => p.id === project.id);
      if (projectIndex !== -1) {
        savedProjects[projectIndex] = updatedProject;
      } else {
        savedProjects.push(updatedProject);
      }
      localStorage.setItem('projects', JSON.stringify(savedProjects));
    } else if (project) {
      api
        .post(`/projects/${project.id}/comments`, { text })
        .then((resp) => {
          const saved = resp.data as Comment;
          setProject({
            ...project,
            comments: [saved, ...(project.comments || [])],
            updatedAt: new Date().toISOString(),
          });
        })
        .catch(() => {
          // если API недоступен — не падаем UI
        });
    }
  };

  // Ролевая логика для изменения статусов:
  // - Студент: НЕ может менять статусы (только работает над проектом)
  // - Координатор: МОЖЕТ менять статусы за студентов
  // - Эксперт: МОЖЕТ менять статусы только на этапе экспертизы
  const canEditStatus = () => {
    if (!user) return false;

    if (user.role === 'coordinator') {
      return true;
    }

    if (user.role === 'expert') {
      return project.status === 'recipe_expert_review' || project.status === 'expert_review';
    }

    if (user.role === 'student') {
      return (
        project.status !== 'expert_review' &&
        project.status !== 'completed' &&
        project.status !== 'recipe_expert_review'
      );
    }
    return false;
  };

  const canComment = user?.role === 'expert' || user?.role === 'coordinator' || user?.role === 'student';

  const QUICK_STAGES: { status: ProjectStatus; label: string }[] = [
    { status: 'analysis', label: 'Анализ данных' },
    { status: 'recipe', label: 'Рецептура' },
    { status: 'packaging', label: 'Упаковка' },
    { status: 'presentation', label: 'Презентация' },
  ];

  const getActionButton = () => {
    switch (project.status) {
      case 'draft':
      case 'analysis':
        return (
          <Button
            variant="contained"
            onClick={() => navigate(`/analysis?projectId=${project.id}`)}
            sx={{ bgcolor: COLORS.secondary }}
          >
            Перейти к анализу данных
          </Button>
        );
      case 'recipe':
      case 'recipe_expert_review':
        return (
          <Button
            variant="contained"
            onClick={() => navigate(`/recipe?projectId=${project.id}`)}
            sx={{ bgcolor: COLORS.accent }}
          >
            Перейти к рецептуре
          </Button>
        );
      case 'packaging':
        return (
          <Button
            variant="contained"
            onClick={() => navigate(`/packaging?projectId=${project.id}`)}
            sx={{ bgcolor: COLORS.primary }}
          >
            Перейти к упаковке
          </Button>
        );
      case 'presentation':
        return (
          <Button
            variant="contained"
            onClick={() => navigate(`/presentation?projectId=${project.id}`)}
            sx={{ bgcolor: '#9C27B0' }}
          >
            Перейти к презентации
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>
          Назад
        </Button>
        <Typography variant="h4" component="h1">
          {project.name}
        </Typography>
        <Chip
          label={project.status}
          sx={{
            bgcolor: project.status === 'completed' ? COLORS.success : COLORS.primary,
            color: 'white',
          }}
        />
      </Box>

      {workflowError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setWorkflowError(null)}>
          {workflowError}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Информация о проекте
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Студент
                </Typography>
                <Typography variant="body1">{project.student.name || project.student.email}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Создан
                </Typography>
                <Typography variant="body1">
                  {new Date(project.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
              {project.expert && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Эксперт
                  </Typography>
                  <Typography variant="body1">{project.expert.name || project.expert.email}</Typography>
                </Grid>
              )}
              {project.coordinator && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Координатор
                  </Typography>
                  <Typography variant="body1">
                    {project.coordinator.name || project.coordinator.email}
                  </Typography>
                </Grid>
              )}
              {analysisSummary && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Дефициты (последний анализ)
                    </Typography>
                    <Typography variant="body1">
                      {analysisSummary.deficits.length ? analysisSummary.deficits.join(', ') : 'не выявлены'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Избыток (последний анализ)
                    </Typography>
                    <Typography variant="body1">
                      {analysisSummary.surpluses.length ? analysisSummary.surpluses.join(', ') : 'не выявлен'}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Рецептура (итоговый расчёт)
            </Typography>
            <Divider sx={{ my: 2 }} />
            {recipeLoadState === 'loading' && <Typography>Загрузка рецептуры…</Typography>}
            {recipeLoadState !== 'loading' && !recipeSummary && (
              <Alert severity="info">Рецептура ещё не сохранена для этого проекта.</Alert>
            )}
            {recipeSummary && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Макросы (на 100 г)
                  </Typography>
                  <Typography variant="body1">Калории: {recipeSummary.nutritionalValue.calories} ккал</Typography>
                  <Typography variant="body1">Белки: {recipeSummary.nutritionalValue.proteins} г</Typography>
                  <Typography variant="body1">Жиры: {recipeSummary.nutritionalValue.fats} г</Typography>
                  <Typography variant="body1">Углеводы: {recipeSummary.nutritionalValue.carbohydrates} г</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Статус соответствия
                  </Typography>
                  <Chip
                    label={recipeSummary.compliance?.trts021 ? 'Рецептура соответствует' : 'Есть несоответствия'}
                    color={recipeSummary.compliance?.trts021 ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                  {!!recipeSummary.compliance?.issues?.length && (
                    <Typography variant="body2">Замечания: {recipeSummary.compliance.issues.join('; ')}</Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Микроэлементы (расчёт)
                  </Typography>
                  <Typography variant="body1">
                    {Object.keys(recipeSummary.nutritionalValue.microelements || {}).length
                      ? Object.entries(recipeSummary.nutritionalValue.microelements || {})
                          .slice(0, 12)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')
                      : 'нет данных'}
                  </Typography>
                  {Object.keys(recipeSummary.nutritionalValue.microelements || {}).length > 12 && (
                    <Typography variant="caption" color="text.secondary">
                      Показаны первые 12 значений
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Премиксы
                  </Typography>
                  <Typography variant="body1">
                    {recipeSummary.premixes?.length ? recipeSummary.premixes.map((p) => p.name).join(', ') : 'не выбраны'}
                  </Typography>
                </Grid>
              </Grid>
            )}
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Этапы работы (можно вернуться и изменить данные)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
              <Button size="small" variant="outlined" onClick={() => navigate(`/project/${project.id}`)}>
                Карточка проекта
              </Button>
              {QUICK_STAGES.map(({ status: st, label }) => (
                <Button
                  key={st}
                  size="small"
                  variant={project.status === st ? 'contained' : 'outlined'}
                  disabled={
                    user?.role === 'student' &&
                    (project.status === 'expert_review' ||
                      project.status === 'completed' ||
                      project.status === 'recipe_expert_review' ||
                      (st === 'packaging' &&
                        ['draft', 'analysis', 'recipe', 'recipe_expert_review'].includes(project.status)))
                  }
                  onClick={() => handleQuickJump(st)}
                  sx={project.status === st ? { bgcolor: COLORS.secondary } : undefined}
                >
                  {label}
                </Button>
              ))}
            </Stack>
            {getActionButton() && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>{getActionButton()}</Box>
            )}
          </Paper>

          <CommentSection
            comments={project.comments}
            onAddComment={handleAddComment}
            canComment={canComment}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <ProjectWorkflow
            currentStatus={project.status}
            onStatusChange={canEditStatus() ? handleStatusChange : undefined}
            canEdit={canEditStatus()}
            userRole={user?.role}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

