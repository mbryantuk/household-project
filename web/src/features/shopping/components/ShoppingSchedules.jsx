import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, Typography, Sheet, Button, Input, IconButton, 
  Stack, Divider, Modal, ModalDialog, DialogTitle, DialogContent, 
  FormControl, FormLabel, Select, Option, Card, Chip, List, ListItem,
  Checkbox, LinearProgress, Table, Avatar
} from '@mui/joy';
import { 
  Add, Delete, Edit, Schedule, Save, Close,
  CheckCircle, RadioButtonUnchecked, ShoppingCart, 
  Calculate, CalendarMonth, KeyboardArrowRight, KeyboardArrowDown
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
};

export default function ShoppingSchedules({ api, householdId, showNotification, confirmAction }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    frequency: 'weekly',
    day_of_week: 1, 
    day_of_month: 1,
    items: []
  });

  const [newItem, setNewItem] = useState({ name: '', quantity: '1', category: 'general', estimated_cost: '' });

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/shopping-list/schedules`);
      setSchedules(res.data || []);
    } catch (err) {
      console.error("Failed to fetch schedules", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleToggleComplete = async (schedule) => {
      const newStatus = !schedule.is_completed;
      const totalCost = schedule.items.reduce((sum, i) => sum + (parseFloat(i.estimated_cost) || 0), 0);
      
      try {
          await api.post(`/households/${householdId}/shopping-list/schedules/${schedule.id}/toggle-complete`, {
              cycle_date: schedule.next_run_date,
              is_completed: newStatus,
              actual_cost: totalCost
          });
          showNotification(newStatus ? "Shopping trip completed!" : "Status reverted", "success");
          fetchSchedules();
      } catch {
          showNotification("Failed to update status", "danger");
      }
  };

  const handleEdit = (schedule) => {
      setEditingId(schedule.id);
      setFormData({
          name: schedule.name,
          frequency: schedule.frequency,
          day_of_week: schedule.day_of_week,
          day_of_month: schedule.day_of_month,
          items: schedule.items || []
      });
      setOpen(true);
  };

  const handleSave = async () => {
      try {
          if (editingId) {
              await api.put(`/households/${householdId}/shopping-list/schedules/${editingId}`, formData);
              showNotification("Schedule updated", "success");
          } else {
              await api.post(`/households/${householdId}/shopping-list/schedules`, formData);
              showNotification("Schedule created", "success");
          }
          fetchSchedules();
          setOpen(false);
          setEditingId(null);
      } catch {
          showNotification("Failed to save schedule", "danger");
      }
  };

  const handleDelete = (id) => {
      confirmAction("Delete Schedule", "Are you sure you want to delete this recurring shopping list?", async () => {
          try {
              await api.delete(`/households/${householdId}/shopping-list/schedules/${id}`);
              fetchSchedules();
              showNotification("Schedule deleted", "success");
          } catch {
              showNotification("Failed to delete", "danger");
          }
      });
  };

  const addItemToSchedule = () => {
      if (!newItem.name.trim()) return;
      setFormData(prev => ({
          ...prev,
          items: [...prev.items, { ...newItem, estimated_cost: parseFloat(newItem.estimated_cost) || 0 }]
      }));
      setNewItem({ name: '', quantity: '1', category: 'general', estimated_cost: '' });
  };

  const removeItemFromSchedule = (idx) => {
      setFormData(prev => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== idx)
      }));
  };

  const totals = useMemo(() => {
      const all = schedules.reduce((acc, s) => {
          const cost = s.items.reduce((sum, it) => sum + (parseFloat(it.estimated_cost) || 0), 0);
          acc.total += cost;
          if (s.is_completed) acc.completed += cost;
          return acc;
      }, { total: 0, completed: 0 });
      return { ...all, pending: all.total - all.completed, progress: all.total > 0 ? (all.completed / all.total) * 100 : 0 };
  }, [schedules]);

  return (
    <Box>
      {/* Budget-style Header */}
      <Sheet 
        variant="soft" 
        color="primary" 
        sx={{ 
            p: 2, 
            borderRadius: 'md', 
            mb: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography level="title-md" startDecorator={<ShoppingCart />}>Monthly Cycles</Typography>
            <Typography level="h4" color="primary">{formatCurrency(totals.pending)} left</Typography>
        </Box>
        <LinearProgress 
            determinate 
            value={totals.progress} 
            color="success" 
            thickness={8}
            sx={{ borderRadius: 'sm' }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography level="body-xs">Progress: {Math.round(totals.progress)}%</Typography>
            <Typography level="body-xs">Total: {formatCurrency(totals.total)}</Typography>
        </Box>
      </Sheet>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography level="title-lg">Schedules</Typography>
        <Button size="sm" startDecorator={<Add />} onClick={() => { setEditingId(null); setFormData({ name: '', frequency: 'weekly', day_of_week: 1, day_of_month: 1, items: [] }); setOpen(true); }}>
            Add
        </Button>
      </Box>

      <Stack spacing={1.5}>
        {schedules.map(s => {
            const cost = s.items.reduce((sum, it) => sum + (parseFloat(it.estimated_cost) || 0), 0);
            return (
                <Card 
                    key={s.id} 
                    variant={s.is_completed ? 'soft' : 'outlined'} 
                    color={s.is_completed ? 'success' : 'neutral'}
                    sx={{ 
                        p: 1.5,
                        opacity: s.is_completed ? 0.7 : 1,
                        transition: 'all 0.2s',
                        borderLeft: '4px solid',
                        borderLeftColor: s.is_completed ? 'success.solidBg' : 'neutral.300'
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <Checkbox 
                            size="lg"
                            variant="soft"
                            color="success"
                            checked={!!s.is_completed}
                            onChange={() => handleToggleComplete(s)}
                            uncheckedIcon={<RadioButtonUnchecked />}
                            checkedIcon={<CheckCircle />}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography level="title-sm">{s.name}</Typography>
                            <Typography level="body-xs">
                                {formatCurrency(cost)} • {s.frequency}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="sm" variant="plain" onClick={() => handleEdit(s)}><Edit /></IconButton>
                            <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(s.id)}><Delete /></IconButton>
                        </Box>
                    </Box>
                    {s.next_run_date && (
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarMonth sx={{ fontSize: '0.9rem', opacity: 0.6 }} />
                            <Typography level="body-xs" color="neutral">
                                Due {format(parseISO(s.next_run_date), 'do MMM')}
                            </Typography>
                        </Box>
                    )}
                </Card>
            );
        })}
        {schedules.length === 0 && !loading && (
            <Typography level="body-sm" textAlign="center" color="neutral" sx={{ py: 4, fontStyle: 'italic' }}>
                No shopping cycles configured.
            </Typography>
        )}
      </Stack>

      {/* Editor Modal */}
      <Modal open={open} onClose={() => setOpen(false)}>
          <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
              <DialogTitle>{editingId ? 'Edit Schedule' : 'New Schedule'}</DialogTitle>
              <DialogContent>
                  <Stack spacing={2} sx={{ mt: 1 }}>
                      <FormControl required>
                          <FormLabel>Name</FormLabel>
                          <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                      </FormControl>
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                          <FormControl sx={{ flex: 1 }}>
                              <FormLabel>Frequency</FormLabel>
                              <Select value={formData.frequency} onChange={(_, v) => setFormData({ ...formData, frequency: v })}>
                                  <Option value="weekly">Weekly</Option>
                                  <Option value="bi-weekly">Bi-Weekly</Option>
                                  <Option value="monthly">Monthly</Option>
                              </Select>
                          </FormControl>
                          {formData.frequency !== 'monthly' ? (
                              <FormControl sx={{ flex: 1 }}>
                                  <FormLabel>Day</FormLabel>
                                  <Select value={formData.day_of_week} onChange={(_, v) => setFormData({ ...formData, day_of_week: v })}>
                                      <Option value={1}>Mon</Option><Option value={2}>Tue</Option><Option value={3}>Wed</Option>
                                      <Option value={4}>Thu</Option><Option value={5}>Fri</Option><Option value={6}>Sat</Option>
                                      <Option value={0}>Sun</Option>
                                  </Select>
                              </FormControl>
                          ) : (
                              <FormControl sx={{ flex: 1 }}>
                                  <FormLabel>Day of Month</FormLabel>
                                  <Input type="number" min={1} max={31} value={formData.day_of_month} onChange={e => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })} />
                              </FormControl>
                          )}
                      </Box>

                      <Divider>Items</Divider>
                      <Stack spacing={1}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                              <Input size="sm" placeholder="Item" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} sx={{ flex: 1 }} />
                              <Input size="sm" placeholder="£" type="number" value={newItem.estimated_cost} onChange={e => setNewItem({ ...newItem, estimated_cost: e.target.value })} sx={{ width: 70 }} />
                              <IconButton size="sm" variant="solid" onClick={addItemToSchedule}><Add /></IconButton>
                          </Box>
                          <Box sx={{ maxHeight: 150, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}>
                              {formData.items.map((it, idx) => (
                                  <Box key={idx} sx={{ p: 0.5, px: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                                      <Typography level="body-xs"><b>{it.quantity}x</b> {it.name}</Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Typography level="body-xs" fontWeight="bold">{formatCurrency(it.estimated_cost)}</Typography>
                                          <IconButton size="sm" color="danger" onClick={() => removeItemFromSchedule(idx)}><Delete /></IconButton>
                                      </Box>
                                  </Box>
                              ))}
                          </Box>
                      </Stack>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                          <Button variant="plain" color="neutral" onClick={() => setOpen(false)}>Cancel</Button>
                          <Button startDecorator={<Save />} onClick={handleSave}>Save</Button>
                      </Box>
                  </Stack>
              </DialogContent>
          </ModalDialog>
      </Modal>
    </Box>
  );
}