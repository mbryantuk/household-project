import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Table, IconButton, Button, Modal, ModalDialog, DialogTitle, 
  DialogContent, DialogActions, Input, FormControl, FormLabel, Avatar, Select, Option,
  Stack, Divider, Tooltip, Chip, Drawer, Checkbox, List, ListItem
} from '@mui/joy';
import { 
  ArrowBack, ArrowForward, Add, Edit, Delete, Restaurant, RestaurantMenu, Kitchen,
  Person, Close
} from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

// Helpers
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  return new Date(d.setDate(diff));
};

const formatDate = (date) => date.toISOString().split('T')[0];

export default function MealPlannerView() {
  const { api, id: householdId, members, showNotification } = useOutletContext();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [meals, setMeals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Library Drawer
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [editMeal, setEditMeal] = useState(null);
  const [mealEmojiPickerOpen, setMealEmojiPickerOpen] = useState(false);
  const [tempMealEmoji, setTempMealEmoji] = useState('🍝');

  // Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignDate, setAssignDate] = useState(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]); // Array of IDs
  const [selectedMealId, setSelectedMealId] = useState('');

  const fetchMeals = useCallback(async () => {
    try {
      const res = await api.get(`/households/${householdId}/meals`);
      setMeals(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId]);

  const fetchPlans = useCallback(async () => {
    const start = formatDate(currentWeekStart);
    const end = formatDate(new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6)));
    try {
      const res = await api.get(`/households/${householdId}/meal-plans?start=${start}&end=${end}`);
      setPlans(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [api, householdId, currentWeekStart]);

  useEffect(() => {
    fetchMeals();
    fetchPlans();
  }, [fetchMeals, fetchPlans]);

  const handleCreateMeal = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    data.emoji = tempMealEmoji;
    
    try {
        if (editMeal?.id) {
            await api.put(`/households/${householdId}/meals/${editMeal.id}`, data);
            showNotification("Meal updated.", "success");
        } else {
            await api.post(`/households/${householdId}/meals`, data);
            showNotification("Meal created.", "success");
        }
        fetchMeals();
        setEditMeal(null);
    } catch (err) { showNotification("Failed to save meal.", "danger"); }
  };

  const handleDeleteMeal = async (id) => {
      if(!window.confirm("Delete this meal?")) return;
      try {
          await api.delete(`/households/${householdId}/meals/${id}`);
          fetchMeals();
          fetchPlans(); // Plans might be affected
      } catch (err) { showNotification("Delete failed.", "danger"); }
  };

  const handleAssign = async () => {
      if (!selectedMealId) return;
      if (selectedMemberIds.length === 0) {
          showNotification("Please select at least one person.", "danger");
          return;
      }
      
      try {
          // Assign for each selected member
          const promises = selectedMemberIds.map(mid => 
              api.post(`/households/${householdId}/meal-plans`, {
                  date: assignDate,
                  member_id: mid,
                  meal_id: selectedMealId
              })
          );
          
          await Promise.all(promises);
          
          showNotification("Meal assigned.", "success");
          fetchPlans();
          setAssignModalOpen(false);
          setSelectedMemberIds([]);
      } catch (err) { showNotification("Assignment failed.", "danger"); }
  };

  const handleRemovePlan = async (planId) => {
      try {
          await api.delete(`/households/${householdId}/meal-plans/${planId}`);
          fetchPlans();
      } catch (err) { showNotification("Removal failed.", "danger"); }
  };

  // Week Navigation
  const changeWeek = (days) => {
      const newStart = new Date(currentWeekStart);
      newStart.setDate(newStart.getDate() + days);
      setCurrentWeekStart(newStart);
  };

  // Grid Construction
  const weekDays = useMemo(() => {
      const days = [];
      for (let i = 0; i < 7; i++) {
          const d = new Date(currentWeekStart);
          d.setDate(d.getDate() + i);
          days.push(d);
      }
      return days;
  }, [currentWeekStart]);

  const activeMembers = useMemo(() => members.filter(m => m.type !== 'pet'), [members]);

  const getCellContent = (dateStr, memberId) => {
      return plans.filter(p => p.date === dateStr && p.member_id === memberId);
  };

  const toggleMemberSelection = (id) => {
      setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography level="h2" startDecorator={<RestaurantMenu />}>Meal Planner</Typography>
        <Stack direction="row" spacing={2}>
            <Button variant="soft" startDecorator={<Restaurant />} onClick={() => { setEditMeal(null); setTempMealEmoji('🍝'); setIsLibraryOpen(true); }}>
                Meal Library
            </Button>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ bgcolor: 'background.level1', borderRadius: 'md', px: 1 }}>
                <IconButton onClick={() => changeWeek(-7)}><ArrowBack /></IconButton>
                <Typography fontWeight="bold">Week of {currentWeekStart.toLocaleDateString()}</Typography>
                <IconButton onClick={() => changeWeek(7)}><ArrowForward /></IconButton>
            </Stack>
        </Stack>
      </Box>

      {/* PLANNER GRID */}
      <Sheet variant="outlined" sx={{ flexGrow: 1, overflow: 'auto', borderRadius: 'md' }}>
        <Table stickyHeader borderAxis="both" stripe="odd">
            <thead>
                <tr>
                    <th style={{ width: 120, textAlign: 'center' }}>Day</th>
                    {activeMembers.map(m => (
                        <th key={m.id} style={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                <Avatar size="sm" src={null}>{m.emoji}</Avatar>
                                {m.name}
                            </Box>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {weekDays.map(day => {
                    const dateStr = formatDate(day);
                    const isToday = dateStr === formatDate(new Date());
                    return (
                        <tr key={dateStr} style={isToday ? { backgroundColor: 'var(--joy-palette-primary-50)' } : {}}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                <Typography level="body-xs">{day.getDate()}</Typography>
                            </td>
                            {activeMembers.map(m => {
                                const dayPlans = getCellContent(dateStr, m.id);
                                return (
                                    <td key={`${dateStr}-${m.id}`} style={{ verticalAlign: 'top', height: 100 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                                            {dayPlans.map(p => (
                                                <Sheet 
                                                    key={p.id} 
                                                    variant="soft" 
                                                    color="primary"
                                                    sx={{ p: 1, borderRadius: 'sm', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                                                        <span>{p.meal_emoji}</span>
                                                        <Typography level="body-sm" noWrap>{p.meal_name}</Typography>
                                                    </Box>
                                                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleRemovePlan(p.id)} sx={{ minWidth: 0, p: 0 }}>
                                                        <Close fontSize="small" />
                                                    </IconButton>
                                                </Sheet>
                                            ))}
                                            <Button 
                                                variant="plain" 
                                                color="neutral" 
                                                size="sm" 
                                                fullWidth 
                                                sx={{ mt: 'auto', borderStyle: 'dashed', borderWidth: 1, opacity: 0.5, '&:hover': { opacity: 1 } }}
                                                onClick={() => { setAssignDate(dateStr); setSelectedMemberIds([m.id]); setAssignModalOpen(true); }}
                                            >
                                                <Add />
                                            </Button>
                                        </Box>
                                    </td>
                                );
                            })}
                        </tr>
                    );
                })}
            </tbody>
        </Table>
      </Sheet>

      {/* LIBRARY DRAWER */}
      <Drawer 
        anchor="right" 
        open={isLibraryOpen} 
        onClose={() => setIsLibraryOpen(false)}
        slotProps={{ content: { sx: { width: '100%', maxWidth: 400, p: 2 } } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography level="h3">Meal Library</Typography>
            <IconButton onClick={() => setIsLibraryOpen(false)}><Close /></IconButton>
        </Box>
        
        {/* ADD/EDIT FORM */}
        <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', mb: 3 }}>
            <form onSubmit={handleCreateMeal}>
                <Stack spacing={2}>
                    <Typography level="title-sm">{editMeal ? 'Edit Meal' : 'Add New Meal'}</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <IconButton variant="outlined" onClick={() => setMealEmojiPickerOpen(true)} sx={{ width: 40, height: 40, fontSize: '1.5rem' }}>
                            {tempMealEmoji}
                        </IconButton>
                        <Input name="name" placeholder="Meal Name" defaultValue={editMeal?.name} required sx={{ flexGrow: 1 }} />
                    </Box>
                    <Input name="description" placeholder="Description / Ingredients" defaultValue={editMeal?.description} />
                    <Stack direction="row" spacing={1}>
                        <Button type="submit" fullWidth>{editMeal ? 'Update' : 'Create'}</Button>
                        {editMeal && <Button color="neutral" onClick={() => { setEditMeal(null); setTempMealEmoji('🍝'); }}>Cancel</Button>}
                    </Stack>
                </Stack>
            </form>
        </Sheet>

        {/* LIST */}
        <Stack spacing={1} sx={{ overflow: 'auto', flexGrow: 1 }}>
            {meals.map(meal => (
                <Sheet key={meal.id} variant="soft" sx={{ p: 1.5, borderRadius: 'sm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography fontSize="xl">{meal.emoji}</Typography>
                        <Box>
                            <Typography level="title-sm">{meal.name}</Typography>
                            <Typography level="body-xs">{meal.description}</Typography>
                        </Box>
                    </Box>
                    <Box>
                        <IconButton size="sm" onClick={() => { setEditMeal(meal); setTempMealEmoji(meal.emoji); }}><Edit /></IconButton>
                        <IconButton size="sm" color="danger" onClick={() => handleDeleteMeal(meal.id)}><Delete /></IconButton>
                    </Box>
                </Sheet>
            ))}
        </Stack>
      </Drawer>

      {/* ASSIGN MODAL */}
      <Modal open={assignModalOpen} onClose={() => setAssignModalOpen(false)}>
        <ModalDialog>
            <DialogTitle>Assign Meal</DialogTitle>
            <DialogContent>
                <Stack spacing={2}>
                    <Typography level="body-sm">
                        Select a meal for <b>{new Date(assignDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</b>.
                    </Typography>
                    
                    <FormControl>
                        <FormLabel>Meal</FormLabel>
                        <Select placeholder="Select a meal..." onChange={(e, v) => setSelectedMealId(v)}>
                            {meals.map(m => (
                                <Option key={m.id} value={m.id}>{m.emoji} {m.name}</Option>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl>
                        <FormLabel>Assign To (Multiple)</FormLabel>
                        <Sheet variant="outlined" sx={{ maxHeight: 150, overflow: 'auto', borderRadius: 'sm', p: 1 }}>
                            <List size="sm">
                                {activeMembers.map(m => (
                                    <ListItem key={m.id}>
                                        <Checkbox 
                                            label={m.name} 
                                            checked={selectedMemberIds.includes(m.id)}
                                            onChange={() => toggleMemberSelection(m.id)}
                                            slotProps={{ action: { className: '' } }} // Fix for Joy UI checkbox list interaction
                                            sx={{ width: '100%' }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Sheet>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleAssign}>Assign</Button>
                <Button variant="plain" color="neutral" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            </DialogActions>
        </ModalDialog>
      </Modal>

      <EmojiPicker 
        open={mealEmojiPickerOpen} 
        onClose={() => setMealEmojiPickerOpen(false)} 
        onEmojiSelect={(e) => { setTempMealEmoji(e); setMealEmojiPickerOpen(false); }} 
      />
    </Box>
  );
}