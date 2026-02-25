import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Sheet,
  Button,
  Input,
  IconButton,
  Checkbox,
  Stack,
  LinearProgress,
  Chip,
  Select,
  Option,
  Grid,
  Card,
} from '@mui/joy';
import {
  Add,
  Delete,
  Calculate,
  FileUpload,
  ArrowBack,
  ArrowForward,
  ContentCopy,
} from '@mui/icons-material';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

import ReceiptImporter from './shopping/components/ReceiptImporter';
import ShoppingSchedules from './shopping/components/ShoppingSchedules';
import ShoppingTrends from './shopping/components/ShoppingTrends';
import ModuleHeader from '../components/ui/ModuleHeader';
import { useShoppingList } from '../hooks/useHouseholdData';
import { useShoppingMutations } from './shopping/hooks';
import haptics from '../utils/haptics';

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
};

const formatDate = (date) => format(date, 'yyyy-MM-dd');

export default function ShoppingListView() {
  const { api, household, showNotification, confirmAction } = useOutletContext();
  const householdId = household?.id;
  const queryClient = useQueryClient();

  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemCat, setNewItemCat] = useState('general');
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Budget State
  const budgetLimit = useMemo(() => {
    const saved = localStorage.getItem(`shopping_budget_${householdId}`);
    return saved ? parseFloat(saved) : 150.0;
  }, [householdId]);

  const weekStr = formatDate(currentWeekStart);
  const { data: items = [] } = useShoppingList(api, householdId, weekStr);

  // Item 118: Optimistic UI Mutations
  const mutations = useShoppingMutations(api, householdId, weekStr);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    mutations.addItem.mutate(
      {
        name: newItemName,
        estimated_cost: parseFloat(newItemCost) || 0,
        quantity: newItemQty,
        category: newItemCat,
      },
      {
        onSuccess: () => {
          setNewItemName('');
          setNewItemCost('');
          setNewItemQty('1');
          showNotification('Item added', 'success');
        },
        onError: () => {
          showNotification('Failed to add item', 'danger');
        },
      }
    );
  };

  const handleCopyPrev = async () => {
    const prevWeek = formatDate(subWeeks(currentWeekStart, 1));
    const targetWeek = weekStr;

    confirmAction('Copy Week', `Copy items from last week (${prevWeek})?`, async () => {
      try {
        const res = await api.post(`/households/${householdId}/shopping-list/copy-previous`, {
          target_week: targetWeek,
          previous_week: prevWeek,
        });
        showNotification(`Copied ${res.data.copiedCount} items`, 'success');
        queryClient.invalidateQueries({
          queryKey: ['households', householdId, 'shopping-list', targetWeek],
        });
      } catch {
        showNotification('Failed to copy items', 'danger');
      }
    });
  };

  const handleToggle = (item) => {
    haptics.selection();
    mutations.toggleItem.mutate(item);
  };

  const handleDelete = (id) => {
    confirmAction('Delete Item', 'Are you sure?', () => {
      mutations.deleteItem.mutate(id);
    });
  };

  const handleClearCompleted = () => {
    confirmAction('Clear Completed', 'Remove checked items?', () => {
      mutations.clearCompleted.mutate();
    });
  };

  const stats = useMemo(() => {
    const total = items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0);
    const checkedCount = items.filter((i) => i.is_checked).length;
    const progress = Math.min(100, (total / (budgetLimit || 1)) * 100);
    return { total, checkedCount, progress };
  }, [items, budgetLimit]);

  return (
    <Box data-testid="shopping-view" sx={{ width: '100%', mx: 'auto', pb: 10 }}>
      <ModuleHeader
        title="Groceries"
        description="Manage your weekly shopping list and track spending trends."
        emoji="🛒"
        chips={[
          { label: `w/c ${format(currentWeekStart, 'do MMM')}`, color: 'primary' },
          { label: `${items.length} Items`, color: 'neutral' },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="soft"
              color="neutral"
              startDecorator={<ContentCopy />}
              onClick={handleCopyPrev}
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            >
              Copy Last Week
            </Button>
            <Sheet
              variant="outlined"
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 'md',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <IconButton
                size="sm"
                onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
              >
                <ArrowBack />
              </IconButton>
              <IconButton
                size="sm"
                onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              >
                <ArrowForward />
              </IconButton>
            </Sheet>
          </Stack>
        }
      />

      <Grid container spacing={3}>
        {/* Main List */}
        <Grid xs={12} md={8}>
          <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', mb: 3 }}>
            <form onSubmit={handleAddItem}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Input
                  placeholder="Add item..."
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  sx={{ flexGrow: 1 }}
                />
                <Input
                  placeholder="Qty"
                  sx={{ width: 80 }}
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                />
                <Select
                  value={newItemCat}
                  onChange={(_e, v) => setNewItemCat(v)}
                  sx={{ width: 120 }}
                >
                  <Option value="general">General</Option>
                  <Option value="produce">Produce</Option>
                  <Option value="dairy">Dairy</Option>
                  <Option value="meat">Meat</Option>
                  <Option value="household">Household</Option>
                </Select>
                <Input
                  placeholder="£"
                  type="number"
                  step="0.01"
                  sx={{ width: 80 }}
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(e.target.value)}
                />
                <Button type="submit" loading={mutations.addItem.isPending}>
                  <Add />
                </Button>
              </Stack>
            </form>
          </Sheet>

          <Stack spacing={1}>
            {items.map((item) => (
              <Sheet
                key={item.id}
                variant={item.is_checked ? 'soft' : 'outlined'}
                sx={{
                  p: 1.5,
                  borderRadius: 'sm',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: item.is_checked ? 0.6 : 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Checkbox
                    checked={!!item.is_checked}
                    onChange={() => handleToggle(item)}
                    color="success"
                    disabled={
                      mutations.toggleItem.isPending &&
                      mutations.toggleItem.variables?.id === item.id
                    }
                  />
                  <Box>
                    <Typography
                      level="title-sm"
                      sx={{ textDecoration: item.is_checked ? 'line-through' : 'none' }}
                    >
                      {item.name}
                      {item.id.toString().startsWith('temp-') && (
                        <Chip
                          size="sm"
                          variant="soft"
                          color="warning"
                          sx={{ ml: 1, fontSize: '10px' }}
                        >
                          Saving...
                        </Chip>
                      )}
                    </Typography>
                    <Typography level="body-xs">
                      {item.quantity} • {item.category}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {item.estimated_cost > 0 && (
                    <Typography level="body-sm" fontWeight="bold">
                      {formatCurrency(item.estimated_cost)}
                    </Typography>
                  )}
                  <IconButton
                    size="sm"
                    color="danger"
                    variant="plain"
                    onClick={() => handleDelete(item.id)}
                    loading={
                      mutations.deleteItem.isPending && mutations.deleteItem.variables === item.id
                    }
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </Sheet>
            ))}
            {items.length === 0 && (
              <Typography level="body-md" textAlign="center" color="neutral" sx={{ py: 6 }}>
                No items for this week.
              </Typography>
            )}
          </Stack>

          {stats.checkedCount > 0 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="plain"
                color="danger"
                onClick={handleClearCompleted}
                loading={mutations.clearCompleted.isPending}
              >
                Clear Completed ({stats.checkedCount})
              </Button>
            </Box>
          )}
        </Grid>

        {/* Sidebar Stats & Schedules */}
        <Grid xs={12} md={4}>
          <Stack spacing={3}>
            <Card variant="soft" color="primary" sx={{ p: 2 }}>
              <Typography level="title-md" startDecorator={<Calculate />}>
                Weekly Total
              </Typography>
              <Typography level="h3" sx={{ my: 1 }}>
                {formatCurrency(stats.total)}
              </Typography>
              <LinearProgress
                determinate
                value={stats.progress}
                color={stats.total > budgetLimit ? 'danger' : 'success'}
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography level="body-xs">Limit: {formatCurrency(budgetLimit)}</Typography>
                <Typography level="body-xs">{Math.round(stats.progress)}%</Typography>
              </Box>
            </Card>

            <Button
              fullWidth
              variant="outlined"
              startDecorator={<FileUpload />}
              onClick={() => setImportModalOpen(true)}
            >
              Import Historical Receipt
            </Button>

            <ShoppingSchedules
              api={api}
              householdId={householdId}
              showNotification={showNotification}
              confirmAction={confirmAction}
            />

            <ShoppingTrends api={api} householdId={householdId} />
          </Stack>
        </Grid>
      </Grid>

      <ReceiptImporter
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        api={api}
        householdId={householdId}
        onImportComplete={() =>
          queryClient.invalidateQueries({
            queryKey: ['households', householdId, 'shopping-list', weekStr],
          })
        }
        showNotification={showNotification}
      />
    </Box>
  );
}
