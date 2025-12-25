import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { CSVUploader } from '@/components/forms/CSVUploader';
import { MicroElementChart } from '@/components/charts/MicroElementChart';
import { useUploadAnalysisMutation } from '@/store/api';
import { parseCSVFile } from '@/utils/csvParser';
import { COLORS } from '@/utils/constants';
import type { AnalysisData, MicroElement } from '@/types';

// Демо-режим: если true, работает локально без API
const DEMO_MODE = true;

export const DataAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [uploadAnalysis, { isLoading: isApiLoading }] = useUploadAnalysisMutation();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);

      try {
        if (DEMO_MODE) {
          // Демо-режим: локальная обработка
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Имитация загрузки
          const result = await parseCSVFile(file);
          setAnalysisData(result);
          
          // Автоматически меняем статус проекта на 'recipe' после анализа
          if (projectId) {
            const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
            const projectIndex = savedProjects.findIndex((p: any) => p.id === projectId);
            if (projectIndex !== -1) {
              savedProjects[projectIndex].status = 'recipe';
              savedProjects[projectIndex].analysis = result;
              savedProjects[projectIndex].updatedAt = new Date().toISOString();
              localStorage.setItem('projects', JSON.stringify(savedProjects));
            } else {
              // Если проекта нет в сохраненных, создаем новый
              const newProject = {
                id: projectId,
                name: `Проект ${new Date().toLocaleDateString()}`,
                status: 'recipe',
                student: { id: 'current-user', email: 'student@demo.com', role: 'student' },
                analysis: result,
                comments: [],
                notifications: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              savedProjects.push(newProject);
              localStorage.setItem('projects', JSON.stringify(savedProjects));
            }
          }
        } else {
          // Режим с API
          const formData = new FormData();
          formData.append('file', file);
          if (projectId) {
            formData.append('projectId', projectId);
          }

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
    [uploadAnalysis, projectId]
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Анализ микроэлементного состава
        </Typography>
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

      {!analysisData ? (
        <Paper sx={{ p: 4 }}>
          <CSVUploader onFileSelect={handleFileUpload} isLoading={isLoading} />
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

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Визуализация данных
                </Typography>
                <MicroElementChart elements={analysisData.elements} />
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
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.elements.map((element, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #e0e0e0',
                          backgroundColor: element.deficiency ? '#fff3e0' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px', fontWeight: 500 }}>
                          {element.name}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>
                          {element.value.toFixed(2)} {element.unit}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>
                          {element.norm.toFixed(2)} {element.unit}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          {element.deficiency ? (
                            <Typography
                              variant="body2"
                              sx={{ color: COLORS.error, fontWeight: 500 }}
                            >
                              Дефицит
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ color: COLORS.success }}>
                              Норма
                            </Typography>
                          )}
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
            <Button
              variant="outlined"
              onClick={() => {
                // TODO: Реализовать экспорт в PDF
                console.log('Export to PDF');
              }}
            >
              Экспорт в PDF
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

