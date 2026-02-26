import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Avatar,
  Input,
  IconButton,
  Sheet,
  Divider,
  CircularProgress,
} from '@mui/joy';
import { Send, ChatBubble } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRelativeTime } from '../../utils/date';

/**
 * COMMENT THREAD COMPONENT
 * Item 245: Collaboration on entities
 */
export default function CommentThread({ api, householdId, entityType, entityId }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  // 1. Fetch Comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['households', householdId, 'comments', entityType, entityId],
    queryFn: () =>
      api
        .get(`/households/${householdId}/comments/${entityType}/${entityId}`)
        .then((res) => res.data || []),
    enabled: !!householdId && !!entityId,
  });

  // 2. Mutations
  const addMutation = useMutation({
    mutationFn: (content) =>
      api.post(`/households/${householdId}/comments/${entityType}/${entityId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['households', householdId, 'comments', entityType, entityId],
      });
      setNewComment('');
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addMutation.mutate(newComment);
  };

  if (isLoading) return <CircularProgress size="sm" sx={{ m: 2 }} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 300 }}>
      <Typography level="title-md" startDecorator={<ChatBubble />} sx={{ mb: 2 }}>
        Discussion
      </Typography>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          mb: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {comments.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center', opacity: 0.5 }}>
            <Typography level="body-sm">No comments yet. Start the conversation!</Typography>
          </Box>
        )}

        {comments.map((c) => (
          <Box key={c.id} sx={{ display: 'flex', gap: 1.5 }}>
            <Avatar size="sm">{c.user?.avatar || '👤'}</Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Sheet
                variant="soft"
                color="neutral"
                sx={{
                  p: 1.5,
                  borderRadius: 'md',
                  borderTopLeftRadius: 0,
                  bgcolor: 'background.level1',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Typography level="title-xs" fontWeight="bold">
                    {c.user?.firstName}
                  </Typography>
                  <Typography level="body-xs" sx={{ opacity: 0.6 }}>
                    {getRelativeTime(new Date(c.created_at))}
                  </Typography>
                </Box>
                <Typography level="body-sm" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {c.content}
                </Typography>
              </Sheet>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <form onSubmit={handleSend}>
        <Stack direction="row" spacing={1}>
          <Input
            placeholder="Write a message..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            sx={{ flexGrow: 1 }}
            endDecorator={
              <IconButton
                type="submit"
                color="primary"
                variant="solid"
                loading={addMutation.isPending}
                disabled={!newComment.trim()}
              >
                <Send />
              </IconButton>
            }
          />
        </Stack>
      </form>
    </Box>
  );
}
