import { Box, Button, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 520 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          404
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Страница не найдена
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Проверьте адрес страницы или вернитесь на главную.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
        >
          {isAuthenticated ? 'Перейти в панель' : 'Перейти ко входу'}
        </Button>
      </Paper>
    </Box>
  );
};
