import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Sheet, Button, Input, IconButton, 
  Stack, Divider, Modal, ModalDialog, DialogTitle, DialogContent, 
  FormControl, FormLabel, Select, Option, Card, Chip, List, ListItem,
  Checkbox
} from '@mui/joy';
import { 
  Add, Delete, Edit, Schedule, Save, Close,
  CheckCircle, RadioButtonUnchecked
} from '@mui/icons-material';

export default function ShoppingSchedules({ api, householdId, showNotification, confirmAction }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    frequency: 'weekly',
    day_of_week: 1, // Monday
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

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography level="h3" startDecorator={<Schedule />}>Recurring Schedules</Typography>
        <Button size="sm" startDecorator={<Add />} onClick={() => { setEditingId(null); setFormData({ name: '', frequency: 'weekly', day_of_week: 1, day_of_month: 1, items: [] }); setOpen(true); }}>
            New Schedule
        </Button>
      </Box>

      <Stack spacing={2}>
        {schedules.map(s => (
            <Card key={s.id} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography level="title-md">{s.name}</Typography>
                        <Typography level="body-xs" color="neutral">
                            {s.frequency.toUpperCase()} • Next run: {s.next_run_date || 'TBD'}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                            {s.items.slice(0, 3).map((it, i) => (
                                <Chip key={i} size="sm" variant="soft">{it.name}</Chip>
                            ))}
                            {s.items.length > 3 && <Chip size="sm" variant="plain">+{s.items.length - 3} more</Chip>}
                        </Stack>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton size="sm" variant="plain" onClick={() => handleEdit(s)}><Edit /></IconButton>
                        <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(s.id)}><Delete /></IconButton>
                    </Box>
                </Box>
            </Card>
        ))}
        {schedules.length === 0 && !loading && (
            <Typography level="body-sm" textAlign="center" color="neutral" sx={{ py: 2 }}>
                No recurring schedules yet.
            </Typography>
        )}
      </Stack>

      <Modal open={open} onClose={() => setOpen(false)}>
          <ModalDialog sx={{ maxWidth: 600, width: '100%' }}>
              <DialogTitle>{editingId ? 'Edit Schedule' : 'New Recurring List'}</DialogTitle>
              <DialogContent>
                  <Stack spacing={2} sx={{ mt: 1 }}>
                      <FormControl required>
                          <FormLabel>Schedule Name</FormLabel>
                          <Input 
                            placeholder="e.g. Weekly Basics" 
                            value={formData.name} 
                            onChange={e => setFormData({ ...formData, name: e.target.value })} 
                          />
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
                                  <FormLabel>Day of Week</FormLabel>
                                  <Select value={formData.day_of_week} onChange={(_, v) => setFormData({ ...formData, day_of_week: v })}>
                                      <Option value={1}>Monday</Option>
                                      <Option value={2}>Tuesday</Option>
                                      <Option value={3}>Wednesday</Option>
                                      <Option value={4}>Thursday</Option>
                                      <Option value={5}>Friday</Option>
                                      <Option value={6}>Saturday</Option>
                                      <Option value={0}>Sunday</Option>
                                  </Select>
                              </FormControl>
                          ) : (
                              <FormControl sx={{ flex: 1 }}>
                                  <FormLabel>Day of Month</FormLabel>
                                  <Input type="number" min={1} max={31} value={formData.day_of_month} onChange={e => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })} />
                              </FormControl>
                          )}
                      </Box>

                      <Divider>Items to Add</Divider>
                      
                      <Box sx={{ bgcolor: 'background.level1', p: 1, borderRadius: 'sm' }}>
                          <Stack direction="row" spacing={1} mb={1}>
                              <Input size="sm" placeholder="Item" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} sx={{ flex: 1 }} />
                              <Input size="sm" placeholder="Qty" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} sx={{ width: 60 }} />
                              <IconButton size="sm" variant="solid" color="primary" onClick={addItemToSchedule}><Add /></IconButton>
                          </Stack>
                          <List size="sm" sx={{ maxHeight: 200, overflow: 'auto' }}>
                              {formData.items.map((it, idx) => (
                                  <ListItem 
                                    key={idx}
                                    endAction={
                                        <IconButton size="sm" color="danger" onClick={() => removeItemFromSchedule(idx)}><Delete /></IconButton>
                                    }
                                  >
                                      <Typography level="body-sm">
                                          <b>{it.quantity}x</b> {it.name}
                                      </Typography>
                                  </ListItem>
                              ))}
                          </List>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                          <Button variant="plain" color="neutral" onClick={() => setOpen(false)}>Cancel</Button>
                          <Button startDecorator={<Save />} onClick={handleSave}>Save Schedule</Button>
                      </Box>
                  </Stack>
              </DialogContent>
          </ModalDialog>
      </Modal>
    </Box>
  );
}
