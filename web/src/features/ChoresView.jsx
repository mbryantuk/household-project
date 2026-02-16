import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Button, Input, IconButton, Checkbox, 
  Stack, Divider, LinearProgress, Chip, Select, Option,
  FormControl, FormLabel, Modal, ModalDialog, DialogTitle, DialogContent, 
  DialogActions, Grid, Avatar, Table, Tooltip, CircularProgress
} from '@mui/joy';
import { 
  Add, Delete, CleaningServices, AttachMoney, 
  EventRepeat, Person, EmojiEvents, CheckCircle, RadioButtonUnchecked, Edit
} from '@mui/icons-material';
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns';
import { getEmojiColor } from '../theme';
import AppSelect from '../components/ui/AppSelect';
import EmojiPicker from '../components/EmojiPicker';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
};

const getFrequencyLabel = (freq) => {
    switch(freq) {
        case 'daily': return 'Daily';
        case 'weekly': return 'Weekly';
        case 'monthly': return 'Monthly';
        case 'one_off': return 'One-off';
        default: return freq;
    }
};

const getDueDateColor = (dateStr) => {
    if (!dateStr) return 'neutral';
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return 'danger';
    if (isToday(date)) return 'warning';
    if (isTomorrow(date)) return 'primary';
    return 'success';
};

export default function ChoresView() {
  const { api, household, showNotification, isDark, members, confirmAction } = useOutletContext();
  const [chores, setChores] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedChore, setSelectedChore] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
      name: '',
      description: '',
      assigned_member_id: null,
      frequency: 'weekly',
      value: '',
      next_due_date: format(new Date(), 'yyyy-MM-dd'),
      emoji: '🧹'
  });
  
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [choresRes, statsRes] = await Promise.all([
          api.get(`/households/${household.id}/chores`),
          api.get(`/households/${household.id}/chores/stats`)
      ]);
      setChores(choresRes.data || []);
      setStats(statsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch chores", err);
      showNotification("Failed to load chores", "danger");
    } finally {
      setLoading(false);
    }
  }, [api, household.id, showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  const handleOpenAdd = () => {
      setFormData({
          name: '',
          description: '',
          assigned_member_id: null,
          frequency: 'weekly',
          value: '',
          next_due_date: format(new Date(), 'yyyy-MM-dd'),
          emoji: '🧹'
      });
      setIsEditMode(false);
      setIsModalOpen(true);
  };

  const handleOpenEdit = (chore) => {
      setSelectedChore(chore);
      setFormData({
          name: chore.name,
          description: chore.description || '',
          assigned_member_id: chore.assigned_member_id,
          frequency: chore.frequency,
          value: chore.value,
          next_due_date: chore.next_due_date || format(new Date(), 'yyyy-MM-dd'),
          emoji: chore.emoji || '🧹'
      });
      setIsEditMode(true);
      setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      try {
          const payload = {
              ...formData,
              value: parseFloat(formData.value) || 0,
              assigned_member_id: formData.assigned_member_id ? parseInt(formData.assigned_member_id) : null
          };

          if (isEditMode && selectedChore) {
              await api.put(`/households/${household.id}/chores/${selectedChore.id}`, payload);
              showNotification("Chore updated", "success");
          } else {
              await api.post(`/households/${household.id}/chores`, payload);
              showNotification("Chore added", "success");
          }
          setIsModalOpen(false);
          fetchData();
      } catch {
          showNotification("Operation failed", "danger");
      }
  };

  const handleDelete = async (id) => {
    confirmAction("Delete Chore", "Are you sure you want to delete this chore?", async () => {
        try {
          await api.delete(`/households/${household.id}/chores/${id}`);
          setChores(prev => prev.filter(c => c.id !== id));
          showNotification("Chore deleted", "success");
        } catch {
          showNotification("Failed to delete", "danger");
        }
    });
  };

  const handleComplete = async (chore) => {
      try {
          // Optimistic update
          setChores(prev => prev.filter(c => c.id !== chore.id)); 
          // Note: If recurring, it should reappear with new date, but we need to re-fetch to get that date accurately from server logic or calculate locally. 
          // For simplicity, we re-fetch after success.
          
          await api.post(`/households/${household.id}/chores/${chore.id}/complete`, {
              date: new Date().toISOString()
          });
          
          showNotification(`Completed: ${chore.name} (+${formatCurrency(chore.value)})`, "success");
          // Play sound?
          fetchData();
      } catch {
          showNotification("Failed to complete chore", "danger");
          fetchData(); // Revert
      }
  };

  return (
    <Box sx={{ width: '100%', mx: 'auto', pb: 10 }}>
        {/* Header */}
        <Box sx={{  mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
                <Typography level="h2" startDecorator={<CleaningServices />}>Chores Tracker</Typography>
                <Typography level="body-md" color="neutral">Assign tasks, track completion, and manage pocket money.</Typography>
            </Box>
            <Button startDecorator={<Add />} onClick={handleOpenAdd}>Add Chore</Button>
        </Box>

        {/* Gamification / Earnings Widget */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
            {stats.map(stat => (
                <Grid key={stat.id} xs={12} sm={6} md={4} lg={3}>
                    <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar size="lg" sx={{ bgcolor: getEmojiColor(stat.emoji || '👤', isDark) }}>{stat.emoji || '👤'}</Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography level="title-sm">{stat.name}</Typography>
                            <Typography level="body-xs" color="neutral">{stat.tasks_completed} Tasks Done</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography level="h4" color="success">{formatCurrency(stat.total_earned)}</Typography>
                            <Typography level="body-xs" color="neutral">Earned</Typography>
                        </Box>
                    </Sheet>
                </Grid>
            ))}
        </Grid>

        {/* Chores List */}
        <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
            <Table hoverRow sx={{ '--TableCell-paddingX': '16px' }}>
                <thead>
                    <tr>
                        <th style={{ width: 60 }}></th>
                        <th>Task</th>
                        <th>Assignee</th>
                        <th>Frequency</th>
                        <th>Due Date</th>
                        <th style={{ textAlign: 'right' }}>Value</th>
                        <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {chores.length === 0 && (
                        <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                                <Typography color="neutral">No pending chores. Good job!</Typography>
                            </td>
                        </tr>
                    )}
                    {chores.filter(c => c.next_due_date).map(chore => {
                        const assignee = members.find(m => m.id === chore.assigned_member_id);
                        return (
                            <tr key={chore.id}>
                                <td>
                                    <IconButton 
                                        variant="plain" 
                                        color="neutral" 
                                        onClick={() => handleComplete(chore)}
                                        sx={{ '&:hover': { color: 'success.500' } }}
                                    >
                                        <RadioButtonUnchecked />
                                    </IconButton>
                                </td>
                                <td>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar size="sm" variant="soft">{chore.emoji}</Avatar>
                                        <Box>
                                            <Typography level="title-sm">{chore.name}</Typography>
                                            {chore.description && <Typography level="body-xs">{chore.description}</Typography>}
                                        </Box>
                                    </Box>
                                </td>
                                <td>
                                    {assignee ? (
                                        <Chip size="sm" variant="soft" color="neutral" startDecorator={assignee.emoji}>
                                            {assignee.name}
                                        </Chip>
                                    ) : (
                                        <Chip size="sm" variant="plain" color="neutral">Unassigned</Chip>
                                    )}
                                </td>
                                <td>
                                    <Typography level="body-sm" startDecorator={<EventRepeat sx={{ fontSize: '1rem', color: 'neutral.400' }} />}>
                                        {getFrequencyLabel(chore.frequency)}
                                    </Typography>
                                </td>
                                <td>
                                    {chore.next_due_date ? (
                                        <Chip size="sm" variant="soft" color={getDueDateColor(chore.next_due_date)}>
                                            {format(parseISO(chore.next_due_date), 'do MMM')}
                                        </Chip>
                                    ) : '-'}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    {chore.value > 0 ? (
                                        <Typography level="body-sm" fontWeight="bold" color="success">
                                            {formatCurrency(chore.value)}
                                        </Typography>
                                    ) : '-'}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                        <IconButton size="sm" variant="plain" onClick={() => handleOpenEdit(chore)}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(chore.id)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </Sheet>

        {/* Add/Edit Modal */}
        <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
                <DialogTitle>{isEditMode ? 'Edit Chore' : 'Add New Chore'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <IconButton variant="outlined" onClick={() => setEmojiPickerOpen(true)} sx={{ width: 48, height: 48, fontSize: '1.5rem', flexShrink: 0 }}>
                                    {formData.emoji}
                                </IconButton>
                                <FormControl required sx={{ flexGrow: 1 }}>
                                    <FormLabel>Task Name</FormLabel>
                                    <Input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus />
                                </FormControl>
                            </Box>

                            <FormControl>
                                <FormLabel>Description (Optional)</FormLabel>
                                <Input name="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </FormControl>

                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl>
                                        <FormLabel>Assign To</FormLabel>
                                        <Select value={formData.assigned_member_id} onChange={(_e, v) => setFormData({...formData, assigned_member_id: v})}>
                                            <Option value={null}>Unassigned</Option>
                                            {members.map(m => (
                                                <Option key={m.id} value={m.id}>{m.emoji} {m.name}</Option>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl>
                                        <FormLabel>Frequency</FormLabel>
                                        <Select value={formData.frequency} onChange={(_e, v) => setFormData({...formData, frequency: v})}>
                                            <Option value="one_off">One-off</Option>
                                            <Option value="daily">Daily</Option>
                                            <Option value="weekly">Weekly</Option>
                                            <Option value="monthly">Monthly</Option>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>

                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl>
                                        <FormLabel>Value (£)</FormLabel>
                                        <Input 
                                            type="number" 
                                            startDecorator="£" 
                                            value={formData.value} 
                                            onChange={e => setFormData({...formData, value: e.target.value})} 
                                            slotProps={{ input: { step: '0.01' } }}
                                        />
                                    </FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl>
                                        <FormLabel>Next Due Date</FormLabel>
                                        <Input 
                                            type="date" 
                                            value={formData.next_due_date} 
                                            onChange={e => setFormData({...formData, next_due_date: e.target.value})} 
                                        />
                                    </FormControl>
                                </Grid>
                            </Grid>

                            <DialogActions>
                                <Button variant="plain" color="neutral" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Task'}</Button>
                            </DialogActions>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <EmojiPicker 
            open={emojiPickerOpen} 
            onClose={() => setEmojiPickerOpen(false)} 
            onEmojiSelect={(e) => { setFormData({...formData, emoji: e}); setEmojiPickerOpen(false); }} 
            isDark={isDark} 
        />
    </Box>
  );
}
