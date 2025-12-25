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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useRegisterMutation } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { COLORS } from '@/utils/constants';
import type { UserRole } from '@/types';

// Демо-режим: если true, работает локально без API
const DEMO_MODE = true;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [register, { isLoading: isApiLoading, error: apiError }] = useRegisterMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as UserRole,
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        // Демо-режим: локальная регистрация
        await new Promise((resolve) => setTimeout(resolve, 500)); // Имитация загрузки

        const user = {
          id: 'user-' + Date.now(),
          email: formData.email,
          role: formData.role,
          name: formData.name || formData.email.split('@')[0],
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
        const result = await register({
          email: formData.email,
          password: formData.password,
          role: formData.role,
          name: formData.name || undefined,
        }).unwrap();
        dispatch(setCredentials(result));
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(
        err?.data?.message || err?.message || 'Ошибка регистрации. Попробуйте снова.'
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
            Регистрация
          </Typography>

          {(error || apiError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error ||
                ('data' in apiError! &&
                  typeof apiError.data === 'object' &&
                  apiError.data &&
                  'message' in apiError.data
                  ? String(apiError.data.message)
                  : 'Ошибка регистрации. Попробуйте снова.')}
            </Alert>
          )}

          {DEMO_MODE && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Демо-режим: регистрация работает локально
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Имя (необязательно)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
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
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Роль</InputLabel>
              <Select
                value={formData.role}
                label="Роль"
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <MenuItem value="student">Студент</MenuItem>
                <MenuItem value="expert">Эксперт-диетолог</MenuItem>
                <MenuItem value="coordinator">Координатор Неофуд</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              margin="normal"
              required
              autoComplete="new-password"
            />
            <TextField
              fullWidth
              label="Подтвердите пароль"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              margin="normal"
              required
              error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
              helperText={
                formData.password !== formData.confirmPassword && formData.confirmPassword !== ''
                  ? 'Пароли не совпадают'
                  : ''
              }
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
              disabled={(isLoading || isApiLoading) || formData.password !== formData.confirmPassword}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Зарегистрироваться'}
            </Button>
          </form>

          <Box textAlign="center">
            <Link to="/login" style={{ textDecoration: 'none', color: COLORS.secondary }}>
              Уже есть аккаунт? Войти
            </Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

