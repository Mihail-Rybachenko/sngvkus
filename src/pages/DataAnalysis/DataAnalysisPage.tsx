import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Grid,
  Chip,
  Stack,
  TextField,
  MenuItem,
} from '@mui/material';
import { CSVUploader } from '@/components/forms/CSVUploader';
import { MicroElementChart } from '@/components/charts/MicroElementChart';
import { useUploadAnalysisMutation } from '@/store/api';
import { parseCSVFile } from '@/utils/csvParser';
import { COLORS, DEMO_MODE } from '@/utils/constants';
import type { AnalysisData, ProjectStatus } from '@/types';
import api from '@/services/api';
import { downloadWordDocument } from '@/utils/wordExport';
import { findMergedDemoProject } from '@/utils/demoProjectsMerge';
import { canDownloadExports, EXPORT_LOCKED_MESSAGE } from '@/utils/exportPolicy';
import { fetchProjectStatus } from '@/utils/projectStatus';

export const DataAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('projectId');
  const [uploadAnalysis, { isLoading: isApiLoading }] = useUploadAnalysisMutation();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subjectProfile, setSubjectProfile] = useState<string>('');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      if (DEMO_MODE) {
        const proj = findMergedDemoProject(projectId);
        if (!cancelled) setProjectStatus((proj?.status as ProjectStatus) ?? null);
        const a = proj?.analysis as AnalysisData | undefined;
        if (a?.elements?.length && !cancelled) {
          setAnalysisData(a);
          if (a.subjectProfile) setSubjectProfile(String(a.subjectProfile));
        }
        return;
      }
      const st = await fetchProjectStatus(projectId);
      if (!cancelled) setProjectStatus(st);
      try {
        const { data } = await api.get<AnalysisData>(`/analysis/project/${projectId}/latest`);
        if (!cancelled && data?.elements?.length) {
          setAnalysisData(data);
          if (data.subjectProfile) setSubjectProfile(String(data.subjectProfile));
        }
      } catch {
        /* анализа ещё нет */
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleExportAnalysisPdf = useCallback(async () => {
    if (!canDownloadExports(projectStatus)) return;
    if (!analysisData) return;
    downloadWordDocument(
      `analysis-${analysisData.id || Date.now()}`,
      'SngVkus: отчёт по анализу микроэлементов (волосы)',
      [
        {
          lines: [
            `Дата: ${new Date().toLocaleString()}`,
            projectId ? `Проект ID: ${projectId}` : '',
            analysisData.subjectProfile ? `Профиль: ${analysisData.subjectProfile}` : '',
            `Файл: ${analysisData.fileName}`,
          ].filter(Boolean),
        },
        {
          heading: 'Сводка',
          lines: [
            ...(analysisData.deficiencies.length
              ? analysisData.deficiencies.map((d) => `Дефицит: ${d}`)
              : ['Дефициты: не выявлены']),
            ...(analysisData.surpluses?.length
              ? analysisData.surpluses.map((d) => `Перенасыщение: ${d}`)
              : ['Перенасыщение: не выявлено']),
          ],
        },
        {
          heading: 'Таблица показателей',
          lines: analysisData.elements.map((el) => {
            const ref =
              el.refMin != null && el.refMax != null
                ? `референс ${el.refMin}–${el.refMax}`
                : `норма ${el.norm}`;
            const st =
              el.balanceStatus === 'deficit' || el.deficiency
                ? 'дефицит'
                : el.balanceStatus === 'surplus' || el.surplus
                  ? 'перенасыщение'
                  : 'норма';
            return (
              `${el.name}: ${el.value.toFixed(3)} ${el.unit}; ${ref}; статус: ${st}` +
              (el.consequenceText ? `. ${el.consequenceText}` : '')
            );
          }),
        },
      ]
    );
  }, [analysisData, projectId, projectStatus]);

  const SUBJECT_PROFILES = [
    { value: 'male_0_4', label: 'Мальчики/мужчины 0-4' },
    { value: 'female_0_4', label: 'Девочки/женщины 0-4' },
    { value: 'male_5_11', label: 'Мальчики 5-11' },
    { value: 'female_5_11', label: 'Девочки 5-11' },
    { value: 'male_12_17', label: 'Мальчики 12-17' },
    { value: 'female_12_17', label: 'Девочки 12-17' },
    { value: 'male_18_plus', label: 'Мужчины 18+' },
    { value: 'female_18_plus', label: 'Женщины 18+' },
  ];

  const handleFileUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);

      try {
        if (!projectId) {
          setError('Сначала создайте проект и откройте этап анализа из карточки проекта.');
          return;
        }
        if (!subjectProfile) {
          setError('Выберите профиль (пол + возрастная группа).');
          return;
        }

        if (DEMO_MODE) {
          // Демо-режим: локальная обработка
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Имитация загрузки
          const result = await parseCSVFile(file, { subjectProfile });
          setAnalysisData({
            ...result,
            subjectProfile,
          });
          
          // Автоматически меняем статус проекта на 'recipe' после анализа
          if (projectId) {
            const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
            const projectIndex = savedProjects.findIndex((p: any) => String(p.id) === String(projectId));
            if (projectIndex !== -1) {
              savedProjects[projectIndex].status = 'recipe';
              savedProjects[projectIndex].analysis = { ...result, subjectProfile };
              savedProjects[projectIndex].updatedAt = new Date().toISOString();
              localStorage.setItem('projects', JSON.stringify(savedProjects));
            } else {
              // Если проекта нет в сохраненных, создаем новый
              const newProject = {
                id: projectId,
                name: `Проект ${new Date().toLocaleDateString()}`,
                status: 'recipe',
                student: { id: 'current-user', email: 'student@demo.com', role: 'student' },
                analysis: { ...result, subjectProfile },
                comments: [],
                notifications: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              savedProjects.push(newProject);
              localStorage.setItem('projects', JSON.stringify(savedProjects));
            }
            setProjectStatus('recipe');
          }
        } else {
          // Режим с API
          const formData = new FormData();
          formData.append('file', file);
          formData.append('projectId', projectId);
          formData.append('subjectProfile', subjectProfile);

          const result = await uploadAnalysis(formData).unwrap();
          setAnalysisData(result);
        }
      } catch (err: any) {
        setError(
          err?.message || err?.data?.message || 'Ошибка при загрузке файла. Проверьте формат CSV.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [uploadAnalysis, projectId, subjectProfile]
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Анализ микроэлементного состава
        </Typography>
        {projectId && (
          <Button variant="outlined" size="small" onClick={() => navigate(`/project/${projectId}`)}>
            К проекту
          </Button>
        )}
        {DEMO_MODE && (
          <Chip
            label="Демо-режим"
            color="info"
            size="small"
            sx={{ bgcolor: COLORS.secondary, color: 'white' }}
          />
        )}
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Загрузите CSV файл с результатами микроэлементного анализа волос для выявления дефицитов
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!projectId && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Для загрузки анализа нужно сначала создать проект на панели управления и перейти в этап анализа из карточки проекта.
        </Alert>
      )}

      {!analysisData ? (
        <Paper sx={{ p: 4 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <TextField
              select
              label="Профиль (пол + возрастная группа)"
              value={subjectProfile}
              onChange={(e) => setSubjectProfile(e.target.value)}
              fullWidth
              required
            >
              {SUBJECT_PROFILES.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <CSVUploader
            onFileSelect={handleFileUpload}
            isLoading={isLoading || isApiLoading || !projectId || !subjectProfile}
          />
        </Paper>
      ) : (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Результаты анализа: {analysisData.fileName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Загружено: {new Date(analysisData.uploadedAt).toLocaleString()}
            </Typography>
            {analysisData.subjectProfile && (
              <Typography variant="body2" color="text.secondary">
                Профиль: {analysisData.subjectProfile}
              </Typography>
            )}
          </Paper>

          {analysisData.deficiencies.length > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Выявлены дефициты микроэлементов:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                {analysisData.deficiencies.map((def, idx) => (
                  <li key={idx}>{def}</li>
                ))}
              </Box>
            </Alert>
          )}
          {projectId && !canDownloadExports(projectStatus) && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {EXPORT_LOCKED_MESSAGE}
            </Alert>
          )}
          {analysisData.surpluses && analysisData.surpluses.length > 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Выявлено перенасыщение микроэлементов:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                {analysisData.surpluses.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </Box>
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Визуализация данных
                </Typography>
                <MicroElementChart elements={analysisData.elements} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    sx={{ bgcolor: COLORS.primary }}
                    onClick={() =>
                      projectId
                        ? navigate(`/recipe?projectId=${encodeURIComponent(projectId)}`)
                        : navigate('/recipe')
                    }
                  >
                    Конструктор рецептур
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleExportAnalysisPdf}
                    disabled={!canDownloadExports(projectStatus)}
                  >
                    Скачать отчёт Word
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Детальная таблица
                </Typography>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Микроэлемент</th>
                      <th style={{ textAlign: 'right', padding: '12px' }}>Значение</th>
                      <th style={{ textAlign: 'right', padding: '12px' }}>Норма</th>
                      <th style={{ textAlign: 'center', padding: '12px' }}>Статус</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Последствия/интерпретация</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.elements.map((element, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #e0e0e0',
                          backgroundColor:
                            element.balanceStatus === 'surplus'
                              ? '#e3f2fd'
                              : element.deficiency
                                ? '#fff3e0'
                                : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px', fontWeight: 500 }}>
                          {element.name}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>
                          {element.value.toFixed(2)} {element.unit}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>
                          {element.refMin != null && element.refMax != null
                            ? `${element.refMin.toFixed(2)} - ${element.refMax.toFixed(2)} ${element.unit}`
                            : `${element.norm.toFixed(2)} ${element.unit}`}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          {(element.balanceStatus === 'deficit' || element.deficiency) ? (
                            <Typography
                              variant="body2"
                              sx={{ color: COLORS.error, fontWeight: 500 }}
                            >
                              Дефицит
                            </Typography>
                          ) : element.balanceStatus === 'surplus' || element.surplus ? (
                            <Typography variant="body2" sx={{ color: COLORS.secondary, fontWeight: 500 }}>
                              Перенасыщение
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ color: COLORS.success }}>
                              Норма
                            </Typography>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" color="text.secondary">
                            {element.consequenceText || '—'}
                          </Typography>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => setAnalysisData(null)}
              sx={{ bgcolor: COLORS.secondary }}
            >
              Загрузить новый файл
            </Button>
            <Button variant="outlined" onClick={handleExportAnalysisPdf} disabled={!canDownloadExports(projectStatus)}>
              Экспорт в Word
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

