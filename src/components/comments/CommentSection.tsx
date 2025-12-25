import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  Chip,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useAppSelector } from '@/store/hooks';
import { COLORS } from '@/utils/constants';
import type { Comment } from '@/types';

interface CommentSectionProps {
  comments?: Comment[];
  onAddComment: (text: string) => void;
  canComment?: boolean;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  comments = [],
  onAddComment,
  canComment = true,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment);
    setNewComment('');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'expert':
        return COLORS.accent;
      case 'coordinator':
        return COLORS.primary;
      default:
        return COLORS.secondary;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'expert':
        return 'Эксперт';
      case 'coordinator':
        return 'Координатор';
      default:
        return 'Студент';
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Комментарии и замечания
      </Typography>

      {comments.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          {comments.map((comment) => (
            <Box key={comment.id} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: getRoleColor(comment.author.role) }}>
                  {comment.author.email[0].toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2">
                    {comment.author.name || comment.author.email}
                  </Typography>
                  <Chip
                    label={getRoleLabel(comment.author.role)}
                    size="small"
                    sx={{
                      bgcolor: getRoleColor(comment.author.role),
                      color: 'white',
                      height: 20,
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {new Date(comment.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', ml: 5 }}>
                <Typography variant="body2">{comment.text}</Typography>
              </Paper>
              <Divider sx={{ mt: 2 }} />
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Пока нет комментариев
        </Typography>
      )}

      {canComment && (
        <Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Добавить комментарий..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={!newComment.trim()}
            sx={{ bgcolor: COLORS.primary }}
          >
            Отправить
          </Button>
        </Box>
      )}
    </Paper>
  );
};

