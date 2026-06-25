import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  ListItemSecondaryAction,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Science as ScienceIcon,
  Restaurant as RestaurantIcon,
  DesignServices as DesignIcon,
  Slideshow as SlideshowIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { COLORS, DEMO_MODE } from '@/utils/constants';
import api from '@/services/api';
import type { Notification } from '@/types';

const drawerWidth = 240;

const menuItems = [
  { text: 'Панель управления', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Анализ данных', icon: <ScienceIcon />, path: '/analysis' },
  { text: 'Конструктор рецептур', icon: <RestaurantIcon />, path: '/recipe' },
  { text: 'Дизайн упаковки', icon: <DesignIcon />, path: '/packaging' },
  { text: 'Презентации', icon: <SlideshowIcon />, path: '/presentation' },
];

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    if (DEMO_MODE) return;
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      try {
        const resp = await api.get<Notification[]>('/notifications');
        if (!cancelled) setNotifications(resp.data);
      } catch {
        // ignore
      }
    };

    load();
    const id = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotifOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const markNotificationRead = async (id: string) => {
    try {
      const resp = await api.post<Notification>(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === resp.data.id ? resp.data : n))
      );
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleMenuClose();
    handleNotifClose();
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      student: 'Пользователь',
      expert: 'Эксперт',
      coordinator: 'Координатор',
    };
    return labels[role] || role;
  };

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: COLORS.primary, color: 'white' }}>
        <Typography variant="h6" noWrap component="div">
          SngVkus
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? COLORS.primary : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: COLORS.primary,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find((item) => item.path === location.pathname)?.text || 'SngVkus'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!DEMO_MODE && (
              <IconButton color="inherit" onClick={handleNotifOpen}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            )}
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.name || user?.email} ({getRoleLabel(user?.role || '')})
            </Typography>
            <IconButton onClick={handleMenuOpen} size="small">
              <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS.secondary }}>
                {user?.email?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate('/profile');
                }}
              >
                <AccountCircleIcon sx={{ mr: 1 }} />
                Профиль
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Выйти
              </MenuItem>
            </Menu>

            <Menu
              anchorEl={notifAnchorEl}
              open={Boolean(notifAnchorEl)}
              onClose={handleNotifClose}
              PaperProps={{ sx: { width: 420, maxWidth: '90vw' } }}
            >
              <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Уведомления
                </Typography>
              </Box>
              <Divider />
              {notifications.length === 0 ? (
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    Нет уведомлений
                  </Typography>
                </MenuItem>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <MenuItem
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markNotificationRead(n.id);
                      handleNotifClose();
                      navigate(`/project/${n.projectId}`);
                    }}
                    sx={{ alignItems: 'flex-start', whiteSpace: 'normal' }}
                  >
                    <Box sx={{ pr: 3 }}>
                      <Typography variant="body2" sx={{ fontWeight: n.read ? 400 : 700 }}>
                        {n.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(n.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <ListItemSecondaryAction>
                      {!n.read && (
                        <Chip
                          label="Новое"
                          size="small"
                          sx={{ bgcolor: COLORS.accent, color: 'white' }}
                        />
                      )}
                    </ListItemSecondaryAction>
                  </MenuItem>
                ))
              )}
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          bgcolor: COLORS.background,
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

