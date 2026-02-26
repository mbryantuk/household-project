import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Sheet, IconButton, Input, Chip } from '@mui/joy';
import { Add, Delete, Wifi, Phone, Info } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * MESSAGE BOARD WIDGET
 * Item 243: Pin important notes
 */
export default function MessageBoardWidget({ api, householdId }) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // 1. Fetch Pinned Notes
  const { data: notes = [] } = useQuery({
    queryKey: ['households', householdId, 'pinned-notes'],
    queryFn: () =>
      api.get(`/households/${householdId}/details`).then((res) => {
        const metadata = res.data.notes || '[]';
        try {
          return JSON.parse(metadata);
        } catch {
          return [];
        }
      }),
    enabled: !!householdId,
  });

  // 2. Mutation
  const updateMutation = useMutation({
    mutationFn: (updatedNotes) =>
      api.put(`/households/${householdId}/details`, { notes: JSON.stringify(updatedNotes) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households', householdId, 'pinned-notes'] });
      setIsAdding(false);
      setNewNote('');
    },
  });

  const handleAdd = () => {
    if (!newNote.trim()) return;
    const updated = [
      ...notes,
      { id: Date.now(), content: newNote, type: 'note', createdAt: new Date() },
    ];
    updateMutation.mutate(updated);
  };

  const handleDelete = (id) => {
    const updated = notes.filter((n) => n.id !== id);
    updateMutation.mutate(updated);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 1 }}>
        <Chip variant="soft" color="primary" startDecorator={<Wifi />}>
          WiFi
        </Chip>
        <Chip variant="soft" color="success" startDecorator={<Phone />}>
          Emergency
        </Chip>
        <Chip variant="soft" color="warning" startDecorator={<Info />}>
          House Rules
        </Chip>
      </Stack>

      <Box
        sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        {notes.map((n) => (
          <Sheet
            key={n.id}
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 'md',
              position: 'relative',
              '&:hover .delete-btn': { opacity: 1 },
            }}
          >
            <Typography level="body-sm" sx={{ pr: 3 }}>
              {n.content}
            </Typography>
            <IconButton
              className="delete-btn"
              size="sm"
              variant="plain"
              color="danger"
              sx={{ position: 'absolute', top: 4, right: 4, opacity: 0, transition: '0.2s' }}
              onClick={() => handleDelete(n.id)}
            >
              <Delete sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Sheet>
        ))}

        {isAdding ? (
          <Stack spacing={1}>
            <Input
              autoFocus
              placeholder="Type something..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              size="sm"
            />
            <Stack direction="row" spacing={1}>
              <Button size="sm" onClick={handleAdd} loading={updateMutation.isPending}>
                Pin
              </Button>
              <Button size="sm" variant="plain" color="neutral" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Button
            variant="plain"
            color="neutral"
            size="sm"
            startDecorator={<Add />}
            onClick={() => setIsAdding(true)}
            sx={{ borderStyle: 'dashed', borderWidth: 1 }}
          >
            Pin New Note
          </Button>
        )}
      </Box>
    </Box>
  );
}
