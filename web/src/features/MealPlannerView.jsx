import React, { useState, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Sheet,
  Table,
  IconButton,
  Button,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  FormControl,
  FormLabel,
  Avatar,
  Select,
  Option,
  Stack,
  Chip,
  Drawer,
  Checkbox,
  List,
  ListItem,
  Grid,
  Card,
} from '@mui/joy';
import {
  ArrowBack,
  ArrowForward,
  Add,
  Edit,
  Delete,
  Restaurant,
  Close,
  CheckCircle,
  MenuBook,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import EmojiPicker from '../components/EmojiPicker';
import { useMeals, useMealPlans } from '../hooks/useHouseholdData';

// Helpers
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  return new Date(d.setDate(diff));
};

const formatDate = (date) => {
  if (!date || !(date instanceof Date)) return '';
  return date.toISOString().split('T')[0];
};

export default function MealPlannerView() {
  const { api, household, showNotification, members = [] } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'planner';
  const householdId = household?.id;
  const queryClient = useQueryClient();

  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));

  const startStr = formatDate(currentWeekStart);
  const endStr = formatDate(
    new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6))
  );

  const { data: meals = [] } = useMeals(api, householdId);
  const { data: plans = [] } = useMealPlans(api, householdId, startStr, endStr);

  // Library Drawer (for planner view)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [editMeal, setEditMeal] = useState(null);
  const [mealEmojiPickerOpen, setMealEmojiPickerOpen] = useState(false);
  const [tempMealEmoji, setTempMealEmoji] = useState('🍝');

  // Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignDate, setAssignDate] = useState(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]); // Array of IDs
  const [selectedMealId, setSelectedMealId] = useState('');

  const invalidateMeals = () =>
    queryClient.invalidateQueries({ queryKey: ['households', householdId, 'meals'] });
  const invalidatePlans = () =>
    queryClient.invalidateQueries({ queryKey: ['households', householdId, 'meal-plans'] });

  const handleCreateMeal = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    data.emoji = tempMealEmoji;

    try {
      if (editMeal?.id) {
        await api.put(`/households/${householdId}/meals/${editMeal.id}`, data);
        showNotification('Recipe updated.', 'success');
      } else {
        await api.post(`/households/${householdId}/meals`, data);
        showNotification('Recipe created.', 'success');
      }
      invalidateMeals();
      setEditMeal(null);
    } catch {
      showNotification('Failed to save recipe.', 'danger');
    }
  };

  const handleDeleteMeal = async (id) => {
    if (!window.confirm('Delete this recipe?')) return;
    try {
      await api.delete(`/households/${householdId}/meals/${id}`);
      invalidateMeals();
      invalidatePlans(); // Plans might be affected
    } catch {
      showNotification('Delete failed.', 'danger');
    }
  };

  const handleAssign = async () => {
    if (!selectedMealId) return;
    if (selectedMemberIds.length === 0) {
      showNotification('Please select at least one person.', 'danger');
      return;
    }

    try {
      // Assign for each selected member
      const promises = selectedMemberIds.map((mid) =>
        api.post(`/households/${householdId}/meal-plans`, {
          date: assignDate,
          member_id: mid,
          meal_id: selectedMealId,
        })
      );

      await Promise.all(promises);

      showNotification('Meal assigned.', 'success');
      invalidatePlans();
      setAssignModalOpen(false);
      setSelectedMemberIds([]);
    } catch {
      showNotification('Assignment failed.', 'danger');
    }
  };

  const handleRemovePlan = async (planId) => {
    try {
      await api.delete(`/households/${householdId}/meal-plans/${planId}`);
      invalidatePlans();
    } catch {
      showNotification('Removal failed.', 'danger');
    }
  };

  const handleCopyPreviousWeek = async () => {
    if (
      !window.confirm(
        'Copy meal plans from the previous week to this week? existing plans for this week will be preserved.'
      )
    )
      return;
    try {
      const res = await api.post(`/households/${householdId}/meal-plans/copy-previous`, {
        targetDate: startStr,
      });
      showNotification(`Copied ${res.data.copiedCount} plans from previous week.`, 'success');
      invalidatePlans();
    } catch (err) {
      console.error('Failed to copy week', err);
      showNotification('Failed to copy previous week.', 'danger');
    }
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

  const activeMembers = useMemo(() => (members || []).filter((m) => m.type !== 'pet'), [members]);

  const getCellContent = (dateStr, memberId) => {
    return plans.filter((p) => p.date === dateStr && p.member_id === memberId);
  };

  const toggleMemberSelection = (id) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // --- RECIPE BOOK VIEW ---
  if (activeTab === 'library') {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography level="h2" startDecorator={<MenuBook />}>
              Recipe book
            </Typography>
            <Typography level="body-md" color="neutral">
              Browse and manage your household recipes.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="neutral"
              onClick={() => setSearchParams({ tab: 'planner' })}
            >
              Back to Planner
            </Button>
            <Button
              startDecorator={<Add />}
              onClick={() => {
                setEditMeal(null);
                setTempMealEmoji('🍝');
                setAssignModalOpen(false);
                setIsLibraryOpen(true);
              }}
            >
              New Recipe
            </Button>
          </Stack>
        </Box>

        <Grid container spacing={2}>
          {meals.length === 0 && (
            <Grid xs={12}>
              <Typography level="body-lg" textAlign="center" sx={{ py: 10, opacity: 0.5 }}>
                Your recipe book is empty. Add some meals to get started!
              </Typography>
            </Grid>
          )}
          {meals.map((meal) => (
            <Grid key={meal.id} xs={12} sm={6} md={4} lg={3}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 'md' },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Avatar size="lg" sx={{ fontSize: '2rem', bgcolor: 'background.level1' }}>
                    {meal.emoji}
                  </Avatar>
                  <Stack direction="row">
                    <IconButton
                      size="sm"
                      variant="plain"
                      onClick={() => {
                        setEditMeal(meal);
                        setTempMealEmoji(meal.emoji);
                        setIsLibraryOpen(true);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="plain"
                      color="danger"
                      onClick={() => handleDeleteMeal(meal.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Stack>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography level="title-lg">{meal.name}</Typography>
                  <Typography level="body-sm" color="neutral" sx={{ mt: 1, minHeight: '3em' }}>
                    {meal.description || 'No ingredients or description recorded.'}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Library Form (Uses the same drawer for consistency but could be a modal here) */}
        <Drawer
          anchor="right"
          open={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          slotProps={{ content: { sx: { width: '100%', maxWidth: 400, p: 2 } } }}
        >
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography level="h3">{editMeal ? 'Edit Recipe' : 'New Recipe'}</Typography>
            <IconButton onClick={() => setIsLibraryOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          <form onSubmit={handleCreateMeal}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton
                  variant="outlined"
                  onClick={() => setMealEmojiPickerOpen(true)}
                  sx={{ width: 48, height: 48, fontSize: '1.5rem' }}
                >
                  {tempMealEmoji}
                </IconButton>
                <FormControl required sx={{ flexGrow: 1 }}>
                  <FormLabel>Name</FormLabel>
                  <Input name="name" defaultValue={editMeal?.name} autoFocus />
                </FormControl>
              </Box>
              <FormControl>
                <FormLabel>Ingredients / Description</FormLabel>
                <Input name="description" defaultValue={editMeal?.description} multiline rows={4} />
              </FormControl>
              <Button type="submit" size="lg">
                {editMeal ? 'Update' : 'Create'}
              </Button>
            </Stack>
          </form>
        </Drawer>
        <EmojiPicker
          open={mealEmojiPickerOpen}
          onClose={() => setMealEmojiPickerOpen(false)}
          onEmojiSelect={(e) => {
            setTempMealEmoji(e);
            setMealEmojiPickerOpen(false);
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
            Meal Planner
          </Typography>
          <Typography level="body-md" color="neutral">
            Plan weekly meals and assignments.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            gap: 2,
            alignItems: 'center',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant="outlined"
              color="neutral"
              onClick={handleCopyPreviousWeek}
              sx={{ flex: 1, whiteSpace: 'nowrap' }}
            >
              Copy Prev
            </Button>
            <Button
              variant="soft"
              startDecorator={<Restaurant />}
              onClick={() => setSearchParams({ tab: 'library' })}
              sx={{ flex: 1, whiteSpace: 'nowrap' }}
            >
              Recipe Book
            </Button>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{
              bgcolor: 'background.level1',
              borderRadius: 'md',
              px: 1,
              py: 0.5,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <IconButton size="sm" onClick={() => changeWeek(-7)}>
              <ArrowBack />
            </IconButton>
            <Typography fontWeight="bold" level="body-sm">
              {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
              {new Date(
                new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6)
              ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Typography>
            <IconButton size="sm" onClick={() => changeWeek(7)}>
              <ArrowForward />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      {/* DESKTOP PLANNER GRID */}
      <Sheet
        variant="outlined"
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          borderRadius: 'md',
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Table stickyHeader borderAxis="both" stripe="odd">
          <thead>
            <tr>
              <th style={{ width: 120, textAlign: 'center' }}>Day</th>
              {activeMembers.map((m) => (
                <th key={m.id} style={{ textAlign: 'center' }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                  >
                    <Avatar size="sm" src={null}>
                      {m.emoji}
                    </Avatar>
                    {m.name}
                  </Box>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekDays.map((day) => {
              const dateStr = formatDate(day);
              const isToday = dateStr === formatDate(new Date());
              // Check completion
              const allAssigned = activeMembers.every(
                (m) => getCellContent(dateStr, m.id).length > 0
              );

              return (
                <tr
                  key={dateStr}
                  style={isToday ? { backgroundColor: 'var(--joy-palette-primary-50)' } : {}}
                >
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                    <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <Typography level="body-xs">{day.getDate()}</Typography>
                    {allAssigned && (
                      <Chip
                        color="success"
                        size="sm"
                        variant="soft"
                        startDecorator={<CheckCircle />}
                      >
                        Done
                      </Chip>
                    )}
                  </td>
                  {activeMembers.map((m) => {
                    const dayPlans = getCellContent(dateStr, m.id);
                    return (
                      <td key={`${dateStr}-${m.id}`} style={{ verticalAlign: 'top', height: 100 }}>
                        <Box
                          sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}
                        >
                          {dayPlans.map((p) => (
                            <Sheet
                              key={p.id}
                              variant="soft"
                              color="primary"
                              sx={{
                                p: 1,
                                borderRadius: 'sm',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  overflow: 'hidden',
                                }}
                              >
                                <span>{p.mealemoji}</span>
                                <Typography level="body-sm" noWrap>
                                  {p.meal_name}
                                </Typography>
                              </Box>
                              <IconButton
                                size="sm"
                                variant="plain"
                                color="danger"
                                onClick={() => handleRemovePlan(p.id)}
                                sx={{ minWidth: 0, p: 0 }}
                              >
                                <Close fontSize="small" />
                              </IconButton>
                            </Sheet>
                          ))}
                          <Button
                            variant="plain"
                            color="neutral"
                            size="sm"
                            fullWidth
                            sx={{
                              mt: 'auto',
                              borderStyle: 'dashed',
                              borderWidth: 1,
                              opacity: 0.5,
                              '&:hover': { opacity: 1 },
                            }}
                            onClick={() => {
                              setAssignDate(dateStr);
                              setSelectedMemberIds([m.id]);
                              setAssignModalOpen(true);
                            }}
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

      {/* MOBILE PLANNER LIST */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, flexGrow: 1, overflow: 'auto' }}>
        <Stack spacing={2}>
          {weekDays.map((day) => {
            const dateStr = formatDate(day);
            const allAssigned = activeMembers.every(
              (m) => getCellContent(dateStr, m.id).length > 0
            );

            return (
              <Sheet key={dateStr} variant="outlined" sx={{ p: 2, borderRadius: 'md' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography level="title-lg">
                      {day.toLocaleDateString(undefined, { weekday: 'long' })}
                    </Typography>
                    <Typography level="body-sm">
                      {day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Typography>
                  </Box>
                  {allAssigned && (
                    <Chip color="success" variant="soft" startDecorator={<CheckCircle />}>
                      Complete
                    </Chip>
                  )}
                </Box>

                <Stack spacing={2}>
                  {activeMembers.map((m) => {
                    const dayPlans = getCellContent(dateStr, m.id);
                    return (
                      <Box key={m.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Avatar size="sm">{m.emoji}</Avatar>
                          <Typography level="title-sm">{m.name}</Typography>
                        </Box>
                        {dayPlans.length > 0 ? (
                          <Stack spacing={1}>
                            {dayPlans.map((p) => (
                              <Sheet
                                key={p.id}
                                variant="soft"
                                color="primary"
                                sx={{
                                  p: 1,
                                  borderRadius: 'sm',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <span>{p.mealemoji}</span>
                                  <Typography level="body-sm">{p.meal_name}</Typography>
                                </Box>
                                <IconButton
                                  size="sm"
                                  variant="plain"
                                  color="danger"
                                  onClick={() => handleRemovePlan(p.id)}
                                >
                                  <Close fontSize="small" />
                                </IconButton>
                              </Sheet>
                            ))}
                            <Button
                              size="sm"
                              variant="plain"
                              onClick={() => {
                                setAssignDate(dateStr);
                                setSelectedMemberIds([m.id]);
                                setAssignModalOpen(true);
                              }}
                            >
                              + Add Another
                            </Button>
                          </Stack>
                        ) : (
                          <Button
                            size="sm"
                            variant="outlined"
                            color="neutral"
                            fullWidth
                            sx={{ borderStyle: 'dashed' }}
                            onClick={() => {
                              setAssignDate(dateStr);
                              setSelectedMemberIds([m.id]);
                              setAssignModalOpen(true);
                            }}
                          >
                            + Assign Meal
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Sheet>
            );
          })}
        </Stack>
      </Box>

      {/* ASSIGN MODAL */}
      <Modal open={assignModalOpen} onClose={() => setAssignModalOpen(false)}>
        <ModalDialog>
          <DialogTitle>Assign Meal</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Typography level="body-sm">
                Select a meal for{' '}
                <b>
                  {assignDate
                    ? new Date(assignDate).toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''}
                </b>
                .
              </Typography>

              <FormControl>
                <FormLabel>Meal</FormLabel>
                <Select placeholder="Select a meal..." onChange={(_e, v) => setSelectedMealId(v)}>
                  {meals.map((m) => (
                    <Option key={m.id} value={m.id}>
                      {m.emoji} {m.name}
                    </Option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Assign To (Multiple)</FormLabel>
                <Sheet
                  variant="outlined"
                  sx={{ maxHeight: 150, overflow: 'auto', borderRadius: 'sm', p: 1 }}
                >
                  <List size="sm">
                    {activeMembers.map((m) => (
                      <ListItem key={m.id}>
                        <Checkbox
                          label={m.name}
                          checked={selectedMemberIds.includes(m.id)}
                          onChange={() => toggleMemberSelection(m.id)}
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
            <Button variant="plain" color="neutral" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      <EmojiPicker
        open={mealEmojiPickerOpen}
        onClose={() => setMealEmojiPickerOpen(false)}
        onEmojiSelect={(e) => {
          setTempMealEmoji(e);
          setMealEmojiPickerOpen(false);
        }}
      />
    </Box>
  );
}
