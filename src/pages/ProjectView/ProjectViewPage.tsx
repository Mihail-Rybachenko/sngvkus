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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAppSelector } from '@/store/hooks';
import { ProjectWorkflow } from '@/components/workflow/ProjectWorkflow';
import { CommentSection } from '@/components/comments/CommentSection';
import { COLORS } from '@/utils/constants';
import { demoProjects } from '@/utils/demoData';
import type { Project, ProjectStatus, Comment } from '@/types';

const DEMO_MODE = true;

export const ProjectViewPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!projectId) return;

    if (DEMO_MODE) {
      // Сначала ищем в сохраненных проектах
      const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      let found = savedProjects.find((p: Project) => p.id === projectId);
      
      // Если не нашли, ищем в демо-проектах
      if (!found) {
        found = demoProjects.find((p) => p.id === projectId);
      }
      
      if (found) {
        setProject(found);
      }
    }
  }, [projectId]);

  if (!project) {
    return (
      <Box>
        <Typography>Проект не найден</Typography>
      </Box>
    );
  }

  const handleStatusChange = (newStatus: ProjectStatus) => {
    if (DEMO_MODE && project) {
      const updatedProject = { ...project, status: newStatus, updatedAt: new Date().toISOString() };
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
    }
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
    }
  };

  // Ролевая логика для изменения статусов:
  // - Студент: НЕ может менять статусы (только работает над проектом)
  // - Координатор: МОЖЕТ менять статусы за студентов
  // - Эксперт: МОЖЕТ менять статусы только на этапе экспертизы
  const canEditStatus = () => {
    if (!user) return false;
    
    if (user.role === 'coordinator') {
      // Координатор может менять статусы для всех проектов
      return true;
    }
    
    if (user.role === 'expert') {
      // Эксперт может менять статусы только на этапе экспертизы
      return project.status === 'expert_review';
    }
    
    // Студент НЕ может менять статусы вручную
    return false;
  };

  const canComment = user?.role === 'expert' || user?.role === 'coordinator' || user?.role === 'student';

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
      case 'expert_review':
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
            Перейти к дизайну упаковки
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
            </Grid>
          </Paper>

          {getActionButton() && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>{getActionButton()}</Box>
            </Paper>
          )}

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
            projectStudentId={project.student.id}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

