import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  FormControl,
  FormLabel,
  Stack,
  Chip,
  CircularProgress,
  Sheet,
  LinearProgress,
  IconButton,
  Card,
  Avatar,
  Select,
  Option,
} from '@mui/joy';
import {
  Add,
  Edit,
  Delete,
  TrackChanges as Target,
  CalendarMonth,
  EmojiEvents,
} from '@mui/icons-material';
import { getEmojiColor } from '../../utils/colors';
import EmojiPicker from '../../components/EmojiPicker';
import ModuleHeader from '../../components/ui/ModuleHeader';

const formatByCurrency = (val, currency = 'GBP') => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-GB', { style: 'currency', currency: currency });
};

/**
 * SavingsGoalsView
 * Item 275: Financial Goal Tracker
 */
export default function SavingsGoalsView({ financialProfileId }) {
  const { api, id: householdId, isDark, showNotification, confirmAction } = useOutletContext();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!financialProfileId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/households/${householdId}/finance/savings-goals?financial_profile_id=${financialProfileId}`
      );
      setGoals(res.data || []);
    } catch (err) {
      console.error('Failed to fetch goals', err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, financialProfileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.financial_profile_id = financialProfileId;
    data.emoji = selectedEmoji;

    try {
      if (editingId) {
        await api.put(`/households/${householdId}/finance/savings-goals/${editingId}`, data);
        showNotification('Goal updated.', 'success');
      } else {
        await api.post(`/households/${householdId}/finance/savings-goals`, data);
        showNotification('Goal created.', 'success');
      }
      setOpen(false);
      setEditingId(null);
      fetchData();
    } catch {
      showNotification('Failed to save goal.', 'danger');
    }
  };

  const handleDelete = (id) => {
    confirmAction('Delete Goal', 'Are you sure you want to remove this savings goal?', async () => {
      try {
        await api.delete(`/households/${householdId}/finance/savings-goals/${id}`);
        showNotification('Goal deleted.', 'neutral');
        fetchData();
      } catch {
        showNotification('Failed to delete.', 'danger');
      }
    });
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      <ModuleHeader
        title="Savings Goals"
        description="Track your long-term household objectives."
        emoji="🎯"
        isDark={isDark}
        action={
          <Button
            variant="solid"
            startDecorator={<Add />}
            onClick={() => {
              setEditingId(null);
              setSelectedEmoji('🎯');
              setOpen(true);
            }}
          >
            Add Goal
          </Button>
        }
      />

      <Grid container spacing={3}>
        {goals.map((goal) => {
          const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
          const isComplete = progress >= 100;

          return (
            <Grid xs={12} md={6} lg={4} key={goal.id}>
              <Card variant="outlined" sx={{ p: 3, position: 'relative' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Avatar
                    size="lg"
                    sx={{ bgcolor: getEmojiColor(goal.emoji, isDark), fontSize: '2rem' }}
                  >
                    {goal.emoji}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography level="title-lg">{goal.name}</Typography>
                    <Typography
                      level="body-xs"
                      color="neutral"
                      startDecorator={<CalendarMonth sx={{ fontSize: '0.9rem' }} />}
                    >
                      Target: {goal.target_date || 'Ongoing'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="sm"
                      variant="plain"
                      onClick={() => {
                        setEditingId(goal.id);
                        setSelectedEmoji(goal.emoji);
                        setOpen(true);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="plain"
                      color="danger"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Stack>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography level="body-sm" fontWeight="bold">
                      {formatByCurrency(goal.current_amount, goal.currency)} /{' '}
                      {formatByCurrency(goal.target_amount, goal.currency)}
                    </Typography>
                    <Typography level="body-sm" color={isComplete ? 'success' : 'neutral'}>
                      {Math.round(progress)}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    determinate
                    value={progress}
                    color={isComplete ? 'success' : 'primary'}
                    sx={{ height: 10, borderRadius: 'sm' }}
                  />
                </Box>

                {isComplete && (
                  <Chip
                    variant="solid"
                    color="success"
                    size="sm"
                    startDecorator={<EmojiEvents />}
                    sx={{ mt: 2, alignSelf: 'center' }}
                  >
                    Goal Achieved!
                  </Chip>
                )}
              </Card>
            </Grid>
          );
        })}
        {goals.length === 0 && (
          <Grid xs={12}>
            <Sheet variant="soft" sx={{ p: 4, textAlign: 'center', borderRadius: 'md' }}>
              <Typography color="neutral">No savings goals yet. Start by adding one!</Typography>
            </Sheet>
          </Grid>
        )}
      </Grid>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
          <DialogTitle>{editingId ? 'Edit Goal' : 'New Savings Goal'}</DialogTitle>
          <DialogContent>
            <form onSubmit={handleSave}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <IconButton
                    variant="outlined"
                    onClick={() => setEmojiPickerOpen(true)}
                    sx={{
                      width: 50,
                      height: 50,
                      fontSize: '1.5rem',
                      bgcolor: getEmojiColor(selectedEmoji, isDark),
                    }}
                  >
                    {selectedEmoji}
                  </IconButton>
                  <FormControl sx={{ flexGrow: 1 }} required>
                    <FormLabel>Goal Name</FormLabel>
                    <Input
                      name="name"
                      defaultValue={goals.find((g) => g.id === editingId)?.name}
                      placeholder="e.g. New Car"
                    />
                  </FormControl>
                </Box>

                <Grid container spacing={2}>
                  <Grid xs={6}>
                    <FormControl required>
                      <FormLabel>Target Amount (£)</FormLabel>
                      <Input
                        name="target_amount"
                        type="number"
                        step="0.01"
                        defaultValue={goals.find((g) => g.id === editingId)?.target_amount}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={6}>
                    <FormControl>
                      <FormLabel>Current Amount (£)</FormLabel>
                      <Input
                        name="current_amount"
                        type="number"
                        step="0.01"
                        defaultValue={goals.find((g) => g.id === editingId)?.current_amount || 0}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={6}>
                    <FormControl required>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        name="currency"
                        defaultValue={goals.find((g) => g.id === editingId)?.currency || 'GBP'}
                      >
                        <Option value="GBP">GBP (£)</Option>
                        <Option value="USD">USD ($)</Option>
                        <Option value="EUR">EUR (€)</Option>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid xs={12}>
                    <FormControl>
                      <FormLabel>Target Date (Optional)</FormLabel>
                      <Input
                        name="target_date"
                        type="date"
                        defaultValue={goals.find((g) => g.id === editingId)?.target_date}
                      />
                    </FormControl>
                  </Grid>
                </Grid>

                <FormControl>
                  <FormLabel>Notes</FormLabel>
                  <Input name="notes" defaultValue={goals.find((g) => g.id === editingId)?.notes} />
                </FormControl>

                <DialogActions>
                  <Button variant="plain" color="neutral" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingId ? 'Save Changes' : 'Create Goal'}</Button>
                </DialogActions>
              </Stack>
            </form>
          </DialogContent>
        </ModalDialog>
      </Modal>

      <EmojiPicker
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onEmojiSelect={(e) => {
          setSelectedEmoji(e);
          setEmojiPickerOpen(false);
        }}
        isDark={isDark}
      />
    </Box>
  );
}
