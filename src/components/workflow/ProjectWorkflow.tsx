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
    description: 'Подбор премиксов и расчёт пищевой ценности',
  },
  {
    status: 'recipe_expert_review',
    label: 'Проверка рецептуры экспертом',
    description: 'Эксперт-диетолог проверяет рецептуру и разрешает переход к упаковке',
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
    label: 'Подтверждение координатором Neofood',
    description: 'После презентации координатор Neofood подтверждает проект или возвращает на доработку',
  },
  {
    status: 'completed',
    label: 'Завершён',
    description: 'Проект утверждён координатором Neofood',
  },
];

export const ProjectWorkflow: React.FC<ProjectWorkflowProps> = ({
  currentStatus,
  onStatusChange,
  canEdit = false,
  userRole,
}) => {
  const currentStepIndex = STEPS.findIndex((step) => step.status === currentStatus);

  const getStepStatus = (index: number) => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'active';
    return 'pending';
  };

  const confirmAndChange = (status: ProjectStatus, message?: string) => {
    if (!onStatusChange) return;
    if (message && !window.confirm(message)) return;
    onStatusChange(status);
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
                {isActive && step.status === 'recipe_expert_review' && userRole === 'student' && (
                  <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                    Рецептура отправлена на проверку. Ожидайте решения эксперта-диетолога — после одобрения откроется этап
                    упаковки.
                  </Typography>
                )}
                {isActive && canEdit && onStatusChange && index < STEPS.length - 1 && (
                  <Box>
                    {step.status === 'expert_review' && userRole === 'coordinator' && (
                      <>
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          onClick={() =>
                            confirmAndChange(
                              'completed',
                              'Подтвердить утверждение проекта и перевод в статус «Завершён»?'
                            )
                          }
                          sx={{ mb: 1, mr: 1 }}
                        >
                          Утвердить проект
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() =>
                            confirmAndChange(
                              'presentation',
                              'Вернуть проект на этап «Презентация» для доработки?'
                            )
                          }
                          sx={{ mb: 1 }}
                        >
                          Вернуть на доработку
                        </Button>
                      </>
                    )}

                    {step.status === 'recipe_expert_review' && userRole === 'expert' && (
                      <>
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          onClick={() =>
                            confirmAndChange(
                              'packaging',
                              'Одобрить рецептуру и разрешить переход к этапу «Упаковка»?'
                            )
                          }
                          sx={{ mb: 1, mr: 1 }}
                        >
                          Одобрить рецептуру
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() =>
                            confirmAndChange('recipe', 'Вернуть проект на этап «Рецептура» для доработки?')
                          }
                          sx={{ mb: 1 }}
                        >
                          Вернуть на доработку
                        </Button>
                      </>
                    )}

                    {step.status === 'presentation' &&
                      (userRole === 'student' || userRole === 'coordinator') && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => confirmAndChange('expert_review')}
                          sx={{ bgcolor: COLORS.primary, mb: 1, mr: 1 }}
                        >
                          Отправить на подтверждение координатору
                        </Button>
                      )}

                    {step.status !== 'expert_review' &&
                      step.status !== 'presentation' &&
                      index > 0 &&
                      userRole !== 'expert' && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => confirmAndChange(STEPS[index - 1].status, 'Вернуться на предыдущий этап?')}
                          sx={{ mb: 1, mr: 1 }}
                        >
                          Предыдущий этап
                        </Button>
                      )}

                    {step.status !== 'expert_review' &&
                      step.status !== 'presentation' && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => confirmAndChange(STEPS[index + 1].status)}
                          sx={{ bgcolor: COLORS.primary, mb: 1, mr: 1 }}
                        >
                          {step.status === 'recipe' ? 'Отправить на проверку эксперту' : 'Следующий этап'}
                        </Button>
                      )}

                    {userRole === 'student' && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Статусы меняются при выполнении этапов и согласованиях
                      </Typography>
                    )}
                  </Box>
                )}
                {isActive &&
                  !canEdit &&
                  userRole === 'student' && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Выполните этап работы — статус обновится автоматически или после проверки эксперта
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
