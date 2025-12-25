import { useCallback, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { COLORS } from '@/utils/constants';
import Papa from 'papaparse';
import type { MicroElement } from '@/types';

interface CSVUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({
  onFileSelect,
  isLoading = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateCSV = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as any[];
          if (data.length === 0) {
            reject(new Error('CSV файл пуст'));
            return;
          }

          // Проверяем наличие необходимых колонок
          const requiredColumns = ['name', 'value', 'norm', 'unit'];
          const firstRow = data[0];
          const hasAllColumns = requiredColumns.every((col) =>
            Object.keys(firstRow).some(
              (key) => key.toLowerCase() === col.toLowerCase()
            )
          );

          if (!hasAllColumns) {
            reject(
              new Error(
                `Отсутствуют необходимые колонки. Требуются: ${requiredColumns.join(', ')}`
              )
            );
            return;
          }

          resolve(true);
        },
        error: (error) => {
          reject(new Error(`Ошибка парсинга CSV: ${error.message}`));
        },
      });
    });
  };

  const handleFile = useCallback(
    async (file: File) => {
      setValidationError(null);

      if (!file.name.endsWith('.csv')) {
        setValidationError('Файл должен иметь расширение .csv');
        return;
      }

      try {
        await validateCSV(file);
        onFileSelect(file);
      } catch (error: any) {
        setValidationError(error.message || 'Ошибка валидации файла');
      }
    },
    [onFileSelect]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  return (
    <Box>
      <Box
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          border: `2px dashed ${dragActive ? COLORS.primary : '#ccc'}`,
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          bgcolor: dragActive ? '#f5f5f5' : 'transparent',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        }}
      >
        <CloudUploadIcon
          sx={{ fontSize: 64, color: COLORS.primary, mb: 2 }}
        />
        <Typography variant="h6" gutterBottom>
          Перетащите CSV файл сюда
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          или
        </Typography>
        <input
          accept=".csv"
          style={{ display: 'none' }}
          id="csv-upload-input"
          type="file"
          onChange={handleChange}
          disabled={isLoading}
        />
        <label htmlFor="csv-upload-input">
          <Button
            variant="contained"
            component="span"
            disabled={isLoading}
            sx={{ bgcolor: COLORS.primary }}
            startIcon={<CloudUploadIcon />}
          >
            Выбрать файл
          </Button>
        </label>
        <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
          Формат CSV: колонки name, value, norm, unit
        </Typography>
      </Box>

      {isLoading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Загрузка и анализ файла...
          </Typography>
        </Box>
      )}

      {validationError && (
        <Paper
          sx={{
            p: 2,
            mt: 2,
            bgcolor: '#ffebee',
            borderLeft: `4px solid ${COLORS.error}`,
          }}
        >
          <Typography variant="body2" color="error">
            {validationError}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

