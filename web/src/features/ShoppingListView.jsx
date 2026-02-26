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
  Remove,
} from '@mui/icons-material';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import ReceiptImporter from './shopping/components/ReceiptImporter';
import ShoppingSchedules from './shopping/components/ShoppingSchedules';
import ShoppingTrends from './shopping/components/ShoppingTrends';
import BarcodeScanner from './shopping/components/BarcodeScanner';
import ModuleHeader from '../components/ui/ModuleHeader';
import PullToRefresh from '../components/ui/PullToRefresh';
import SwipeableListItem from '../components/ui/SwipeableListItem';
import { useShoppingList } from '../hooks/useHouseholdData';
import { useShoppingMutations } from './shopping/hooks';
import haptics from '../utils/haptics';
import { triggerConfetti } from '../utils/fx';

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
};

const formatDate = (date) => format(date, 'yyyy-MM-dd');

export default function ShoppingListView() {
  const { t } = useTranslation();
  const { api, household, showNotification, confirmAction, showUndoableNotification } =
    useOutletContext();
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
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  // Budget State
  const budgetLimit = useMemo(() => {
    const saved = localStorage.getItem(`shopping_budget_${householdId}`);
    return saved ? parseFloat(saved) : 150.0;
  }, [householdId]);

  const weekStr = formatDate(currentWeekStart);
  const { data: items = [], refetch } = useShoppingList(api, householdId, weekStr);

  // Item 118: Optimistic UI Mutations
  const mutations = useShoppingMutations(api, householdId, weekStr);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const exists = items.find(
      (i) => i.name.toLowerCase() === newItemName.trim().toLowerCase() && !i.is_checked
    );
    if (exists) {
      showNotification(`"${newItemName}" is already on your list.`, 'warning');
      return;
    }

    mutations.addItem.mutate(
      {
        name: newItemName,
        estimated_cost: parseFloat(newItemCost) || 0,
        quantity: newItemQty,
        category: newItemCat,
      },
      {
        onSuccess: (data) => {
          setNewItemName('');
          setNewItemCost('');
          setNewItemQty('1');
          const newItemId = data.data?.id || data.id;
          if (newItemId) {
            setLastAddedId(newItemId);
            setTimeout(() => setLastAddedId(null), 2000);
          }
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
    const itemsToClear = items.filter((i) => i.is_checked);
    if (itemsToClear.length === 0) return;

    // 1. Snapshot for rollback
    const previousItems = queryClient.getQueryData([
      'households',
      householdId,
      'shopping-list',
      weekStr,
    ]);

    // 2. Optimistic hide
    queryClient.setQueryData(['households', householdId, 'shopping-list', weekStr], (old) =>
      old.filter((i) => !i.is_checked)
    );

    let undone = false;
    const timer = setTimeout(() => {
      if (!undone) {
        mutations.clearCompleted.mutate(null, {
          onSuccess: () => {
            triggerConfetti();
            showNotification('Cleared completed items', 'success');
          },
        });
      }
    }, 5000);

    showUndoableNotification(`Cleared ${itemsToClear.length} items`, () => {
      undone = true;
      clearTimeout(timer);
      queryClient.setQueryData(
        ['households', householdId, 'shopping-list', weekStr],
        previousItems
      );
      showNotification('Action undone', 'neutral');
    });
  };

  const handleSelectAll = (checked) => {
    const actions = items.map((item) => ({
      type: 'update',
      id: item.id,
      data: { is_checked: checked ? 1 : 0 },
    }));
    // Item 108: Use bulk endpoint
    api.post(`/households/${householdId}/shopping-list/bulk`, { actions }).then(() => {
      queryClient.invalidateQueries({
        queryKey: ['households', householdId, 'shopping-list', weekStr],
      });
    });
  };

  const stats = useMemo(() => {
    const total = items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0);
    const checkedCount = items.filter((i) => i.is_checked).length;
    const progress = Math.min(100, (total / (budgetLimit || 1)) * 100);
    return { total, checkedCount, progress };
  }, [items, budgetLimit]);

  const handleBarcodeScan = (code) => {
    setBarcodeScannerOpen(false);
    setNewItemName(`Barcode: ${code}`);
    showNotification(`Scanned ${code}. Fetching product info...`, 'info');
    // Future: Call a UPC API to get the real name
  };

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <Box data-testid="shopping-view" sx={{ width: '100%', mx: 'auto', pb: 10 }}>
        {barcodeScannerOpen && (
          <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setBarcodeScannerOpen(false)} />
        )}
        <ModuleHeader
          title={t('nav.groceries')}
          titleTestId="shopping-heading"
          description="Manage your weekly shopping list and track spending trends."
          emoji="🛒"
          chips={[
            { label: `w/c ${format(currentWeekStart, 'do MMM')}`, color: 'primary' },
            { label: `${items.length} ${t('nav.groceries')}`, color: 'neutral' },
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                      size="sm"
                      variant="outlined"
                      onClick={() =>
                        setNewItemQty((q) => Math.max(1, (parseInt(q) || 1) - 1).toString())
                      }
                    >
                      <Remove />
                    </IconButton>
                    <Input
                      placeholder="Qty"
                      sx={{ width: 50, '& input': { textAlign: 'center' } }}
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      slotProps={{ input: { inputMode: 'decimal', min: '1' } }}
                    />
                    <IconButton
                      size="sm"
                      variant="outlined"
                      onClick={() => setNewItemQty((q) => ((parseInt(q) || 1) + 1).toString())}
                    >
                      <Add />
                    </IconButton>
                  </Box>
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
                    min="0"
                    sx={{ width: 80 }}
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(e.target.value)}
                    slotProps={{ input: { inputMode: 'decimal' } }}
                  />
                  <Button type="submit" loading={mutations.addItem.isPending}>
                    <Add />
                  </Button>
                  <IconButton
                    variant="soft"
                    color="primary"
                    onClick={() => setBarcodeScannerOpen(true)}
                    sx={{ display: { xs: 'flex', md: 'none' } }}
                  >
                    <Box component="span" sx={{ fontSize: '1.2rem' }}>
                      📷
                    </Box>
                  </IconButton>
                </Stack>
              </form>
            </Sheet>

            <Stack spacing={1}>
              {items.length > 0 && (
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Checkbox
                    size="sm"
                    checked={items.length > 0 && items.every((i) => i.is_checked)}
                    indeterminate={
                      items.some((i) => i.is_checked) && !items.every((i) => i.is_checked)
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <Typography level="body-xs" fontWeight="bold">
                    {items.every((i) => i.is_checked) ? 'DESELECT ALL' : 'SELECT ALL'}
                  </Typography>
                </Box>
              )}
              {items.map((item) => (
                <SwipeableListItem
                  key={item.id}
                  onSwipeRight={() => handleToggle(item)}
                  onSwipeLeft={() => handleDelete(item.id)}
                >
                  <Sheet
                    variant={item.is_checked ? 'soft' : 'outlined'}
                    sx={{
                      p: 1.5,
                      minHeight: 64, // Item 178: Better touch targets (min 44px)
                      borderRadius: 'md',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: item.is_checked ? 0.6 : 1,
                      transition: 'all 0.2s',
                      ...(lastAddedId === item.id && {
                        animation: 'flash 2s ease-out',
                        '@keyframes flash': {
                          '0%': { bgcolor: 'primary.softBg' },
                          '100%': { bgcolor: 'transparent' },
                        },
                      }),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                      <Checkbox
                        checked={!!item.is_checked}
                        onChange={() => handleToggle(item)}
                        color="success"
                        sx={{ '--Checkbox-size': '24px' }} // Enhanced touch target
                        disabled={
                          mutations.toggleItem.isPending &&
                          mutations.toggleItem.variables?.id === item.id
                        }
                      />
                      <Box
                        sx={{ flexGrow: 1, cursor: 'pointer' }}
                        onClick={() => handleToggle(item)}
                      >
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
                              sx={{
                                ml: 1,
                                fontSize: '10px',
                                animation: 'pulse 1.5s infinite ease-in-out',
                                '@keyframes pulse': {
                                  '0%': { opacity: 0.6 },
                                  '50%': { opacity: 1 },
                                  '100%': { opacity: 0.6 },
                                },
                              }}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {item.estimated_cost > 0 && (
                        <Typography level="body-sm" fontWeight="bold">
                          {formatCurrency(item.estimated_cost)}
                        </Typography>
                      )}
                      <IconButton
                        size="md" // Item 178: Larger icon button for mobile
                        color="danger"
                        variant="plain"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        loading={
                          mutations.deleteItem.isPending &&
                          mutations.deleteItem.variables === item.id
                        }
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Sheet>
                </SwipeableListItem>
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
    </PullToRefresh>
  );
}
