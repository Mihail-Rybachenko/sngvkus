import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useLoginMutation } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { COLORS } from '@/utils/constants';
import { demoUser } from '@/utils/demoData';

// Демо-режим: если true, работает локально без API
const DEMO_MODE = true;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading: isApiLoading, error: apiError }] = useLoginMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        // Демо-режим: локальная аутентификация
        await new Promise((resolve) => setTimeout(resolve, 500)); // Имитация загрузки
        
        // В демо-режиме принимаем любой email и пароль
        const user = {
          ...demoUser,
          email: formData.email || demoUser.email,
          name: formData.email.split('@')[0] || demoUser.name,
        };

        dispatch(
          setCredentials({
            user,
            token: 'demo-token-' + Date.now(),
          })
        );
        navigate('/dashboard');
      } else {
        // Режим с API
        const result = await login(formData).unwrap();
        dispatch(setCredentials(result));
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(
        err?.data?.message || err?.message || 'Ошибка входа. Проверьте данные.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 3, color: COLORS.primary }}>
            SngVkus
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom align="center" sx={{ mb: 4 }}>
            Вход в систему
          </Typography>

          {(error || apiError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error ||
                ('data' in apiError! &&
                  typeof apiError.data === 'object' &&
                  apiError.data &&
                  'message' in apiError.data
                  ? String(apiError.data.message)
                  : 'Ошибка входа. Проверьте данные.')}
            </Alert>
          )}

          {DEMO_MODE && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Демо-режим: используйте любой email и пароль для входа
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              required
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              margin="normal"
              required
              autoComplete="current-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                bgcolor: COLORS.primary,
                '&:hover': { bgcolor: '#45a049' },
              }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Войти'}
            </Button>
          </form>

          <Box textAlign="center">
            <Link to="/register" style={{ textDecoration: 'none', color: COLORS.secondary }}>
              Нет аккаунта? Зарегистрироваться
            </Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

