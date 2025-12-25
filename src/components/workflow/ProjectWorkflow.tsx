import { Box, Stepper, Step, StepLabel, StepContent, Button, Paper, Typography } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { COLORS } from '@/utils/constants';
import type { ProjectStatus } from '@/types';

interface ProjectWorkflowProps {
  currentStatus: ProjectStatus;
  onStatusChange?: (status: ProjectStatus) => void;
  canEdit?: boolean;
  userRole?: 'student' | 'expert' | 'coordinator';
  projectStudentId?: string;
}

const STEPS: { status: ProjectStatus; label: string; description: string }[] = [
  {
    status: 'draft',
    label: 'Создание проекта',
    description: 'Проект создан, готов к началу работы',
  },
  {
    status: 'analysis',
    label: 'Анализ данных',
    description: 'Загрузка и анализ CSV файла с микроэлементами',
  },
  {
    status: 'recipe',
    label: 'Разработка рецептуры',
    description: 'Подбор премиксов и расчет пищевой ценности',
  },
  {
    status: 'packaging',
    label: 'Дизайн упаковки',
    description: 'Создание макета упаковки продукта',
  },
  {
    status: 'presentation',
    label: 'Презентация',
    description: 'Генерация питч-презентации',
  },
  {
    status: 'expert_review',
    label: 'Экспертиза',
    description: 'Проверка экспертом-диетологом',
  },
  {
    status: 'completed',
    label: 'Завершен',
    description: 'Проект утвержден и готов',
  },
];

export const ProjectWorkflow: React.FC<ProjectWorkflowProps> = ({
  currentStatus,
  onStatusChange,
  canEdit = false,
  userRole,
  projectStudentId,
}) => {
  const currentStepIndex = STEPS.findIndex((step) => step.status === currentStatus);

  const getStepStatus = (index: number) => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'active';
    return 'pending';
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Статус проекта
      </Typography>
      <Stepper activeStep={currentStepIndex} orientation="vertical">
        {STEPS.map((step, index) => {
          const stepStatus = getStepStatus(index);
          const isCompleted = stepStatus === 'completed';
          const isActive = stepStatus === 'active';

          return (
            <Step key={step.status} completed={isCompleted} active={isActive}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isCompleted
                        ? COLORS.success
                        : isActive
                        ? COLORS.primary
                        : '#e0e0e0',
                      color: isCompleted || isActive ? 'white' : '#757575',
                    }}
                  >
                    {isCompleted ? <CheckCircle /> : <RadioButtonUnchecked />}
                  </Box>
                )}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {step.description}
                </Typography>
                {isActive && canEdit && onStatusChange && index < STEPS.length - 1 && (
                  <Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => onStatusChange(STEPS[index + 1].status)}
                      sx={{ bgcolor: COLORS.primary, mb: 1, mr: 1 }}
                    >
                      {userRole === 'coordinator' 
                        ? 'Отметить этап как выполненный' 
                        : userRole === 'expert' 
                        ? 'Одобрить рецептуру'
                        : 'Перейти к следующему этапу'}
                    </Button>
                    {(userRole === 'expert' || userRole === 'coordinator') && step.status === 'expert_review' && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => onStatusChange('recipe')}
                        sx={{ mb: 1 }}
                      >
                        Отклонить (вернуть на доработку)
                      </Button>
                    )}
                    {userRole === 'student' && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Статусы меняются автоматически при выполнении этапов
                      </Typography>
                    )}
                  </Box>
                )}
                {isActive && !canEdit && userRole === 'student' && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Выполните этап работы - статус обновится автоматически
                  </Typography>
                )}
              </StepContent>
            </Step>
          );
        })}
      </Stepper>
    </Paper>
  );
};

