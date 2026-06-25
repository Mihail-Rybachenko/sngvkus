import { useEffect, useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { COLORS, DEMO_MODE } from '@/utils/constants';
import api from '@/services/api';

export const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((s) => s.auth);
  const [name, setName] = useState(user?.name || '');
  const [team, setTeam] = useState(user?.team || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name || '');
    setTeam(user?.team || '');
  }, [user?.name, user?.team]);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (DEMO_MODE) {
      if (!user || !token) return;
      dispatch(setCredentials({ user: { ...user, name, team }, token }));
      setSaved(true);
      return;
    }
    try {
      const resp = await api.put('/users/me', { name, team });
      if (!user || !token) return;
      dispatch(setCredentials({ user: { ...user, ...resp.data }, token }));
      setSaved(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка сохранения профиля');
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Профиль
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Сохранено
        </Alert>
      )}
      <Paper sx={{ p: 3, maxWidth: 520 }}>
        <TextField
          fullWidth
          label="Почта (логин)"
          value={user?.email || ''}
          disabled
          sx={{ mb: 2 }}
          helperText="Используется для входа в систему, изменяется только через администратора"
        />
        <TextField
          fullWidth
          label="Имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Команда"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{ bgcolor: COLORS.primary }}
        >
          Сохранить
        </Button>
      </Paper>
    </Box>
  );
};

