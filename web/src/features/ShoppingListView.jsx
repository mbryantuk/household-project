import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Button, Input, IconButton, Checkbox, 
  Stack, Divider, LinearProgress, Chip, Select, Option,
  FormControl, FormLabel
} from '@mui/joy';
import { 
  Add, Delete, Clear, ShoppingBag, AttachMoney, 
  Calculate, FileUpload
} from '@mui/icons-material';
import ReceiptImporter from './shopping/components/ReceiptImporter';
import ShoppingSchedules from './shopping/components/ShoppingSchedules';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
};

export default function ShoppingListView() {
  const { api, household, showNotification, confirmAction } = useOutletContext();
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemCat, setNewItemCat] = useState('general');
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  // Budget State
  const [budgetLimit, setBudgetLimit] = useState(() => {
      const saved = localStorage.getItem(`shopping_budget_${household?.id}`);
      return saved ? parseFloat(saved) : 150.00; // Default £150
  });

  const fetchList = useCallback(async () => {
    try {
      const res = await api.get(`/households/${household.id}/shopping-list`);
      setItems(res.data.items || []);
    } catch (err) {
      console.error("Failed to fetch shopping list", err);
    }
  }, [api, household]);

  useEffect(() => {
    Promise.resolve().then(() => fetchList());
  }, [fetchList]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
        await api.post(`/households/${household.id}/shopping-list`, {
            name: newItemName,
            estimated_cost: parseFloat(newItemCost) || 0,
            quantity: newItemQty,
            category: newItemCat
        });
        setNewItemName('');
        setNewItemCost('');
        setNewItemQty('1');
        fetchList();
        showNotification("Item added", "success");
    } catch {
        showNotification("Failed to add item", "danger");
    }
  };

  const handleToggle = async (item) => {
      // Optimistic update
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: !i.is_checked ? 1 : 0 } : i));
      try {
          await api.put(`/households/${household.id}/shopping-list/${item.id}`, {
              is_checked: !item.is_checked
          });
      } catch {
          fetchList(); // Revert on fail
      }
  };

  const handleDelete = async (id) => {
      confirmAction("Delete Item", "Are you sure you want to remove this item from your list?", async () => {
          try {
              await api.delete(`/households/${household.id}/shopping-list/${id}`);
              setItems(prev => prev.filter(i => i.id !== id));
          } catch {
              showNotification("Failed to delete", "danger");
          }
      });
  };

  const handleClearCompleted = async () => {
      confirmAction("Clear Completed", "Remove all checked items from your list?", async () => {
          try {
              await api.delete(`/households/${household.id}/shopping-list/clear`);
              fetchList();
              showNotification("Completed items cleared", "neutral");
          } catch {
              showNotification("Failed to clear", "danger");
          }
      });
  };

  const handleUpdateBudget = (val) => {
      const limit = parseFloat(val) || 0;
      setBudgetLimit(limit);
      localStorage.setItem(`shopping_budget_${household?.id}`, limit);
  };

  // Calculations
  const stats = useMemo(() => {
      const total = items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0);
      const pending = items.filter(i => !i.is_checked).reduce((sum, i) => sum + (i.estimated_cost || 0), 0);
      const checkedCount = items.filter(i => i.is_checked).length;
      const progress = Math.min(100, (total / (budgetLimit || 1)) * 100);
      return { total, pending, checkedCount, progress };
  }, [items, budgetLimit]);

  return (
    <Box sx={{ width: '100%', mx: 'auto', pb: 10 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
                <Typography level="h2" startDecorator={<ShoppingBag />}>Groceries</Typography>
                <Typography level="body-md" color="neutral">Manage your weekly grocery needs.</Typography>
                <Button 
                    variant="soft" 
                    size="sm" 
                    startDecorator={<FileUpload />} 
                    onClick={() => setImportModalOpen(true)}
                    sx={{ mt: 1 }}
                >
                    Import Receipt
                </Button>
            </Box>
            
            {/* Budget Estimator Widget */}
            <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', width: { xs: '100%', md: 400 }, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level="title-sm" startDecorator={<Calculate />}>Estimated Total</Typography>
                    <Typography level="title-lg" color={stats.total > budgetLimit ? 'danger' : 'success'}>
                        {formatCurrency(stats.total)}
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LinearProgress 
                        determinate 
                        value={stats.progress} 
                        color={stats.total > budgetLimit ? 'danger' : 'primary'}
                        sx={{ flexGrow: 1 }}
                    />
                    <Typography level="body-xs" whiteSpace="nowrap">
                        Target: {formatCurrency(budgetLimit)}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Input 
                        size="sm" 
                        placeholder="Set Limit" 
                        startDecorator="£"
                        type="number"
                        value={budgetLimit}
                        onChange={(e) => handleUpdateBudget(e.target.value)}
                        sx={{ width: 120 }}
                    />
                </Box>
            </Sheet>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            
            {/* Main List */}
            <Box sx={{ flexGrow: 1 }}>
                <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', mb: 3 }}>
                    <form onSubmit={handleAddItem}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Input 
                                placeholder="Item name (e.g. Milk)" 
                                required 
                                value={newItemName} 
                                onChange={e => setNewItemName(e.target.value)} 
                                sx={{ flexGrow: 1 }} 
                            />
                            <Input 
                                placeholder="Qty" 
                                sx={{ width: { xs: '100%', sm: 80 } }} 
                                value={newItemQty} 
                                onChange={e => setNewItemQty(e.target.value)} 
                            />
                            <Select 
                                value={newItemCat} 
                                onChange={(_e, v) => setNewItemCat(v)} 
                                sx={{ width: { xs: '100%', sm: 120 } }}
                            >
                                <Option value="general">General</Option>
                                <Option value="produce">Produce</Option>
                                <Option value="dairy">Dairy</Option>
                                <Option value="meat">Meat</Option>
                                <Option value="bakery">Bakery</Option>
                                <Option value="household">Household</Option>
                            </Select>
                            <Input 
                                placeholder="£ Est." 
                                type="number" 
                                step="0.01"
                                sx={{ width: { xs: '100%', sm: 100 } }} 
                                value={newItemCost} 
                                onChange={e => setNewItemCost(e.target.value)} 
                            />
                            <Button type="submit" startDecorator={<Add />}>Add</Button>
                        </Stack>
                    </form>
                </Sheet>

                <Stack spacing={1}>
                    {items.map(item => (
                        <Sheet 
                            key={item.id} 
                            variant={item.is_checked ? 'soft' : 'outlined'} 
                            color={item.is_checked ? 'neutral' : 'primary'}
                            sx={{ 
                                p: 1.5, 
                                borderRadius: 'sm', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                transition: 'all 0.2s',
                                opacity: item.is_checked ? 0.6 : 1
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Checkbox 
                                    checked={!!item.is_checked} 
                                    onChange={() => handleToggle(item)} 
                                    color="success"
                                />
                                <Box>
                                    <Typography 
                                        level="title-sm" 
                                        sx={{ textDecoration: item.is_checked ? 'line-through' : 'none' }}
                                    >
                                        {item.name}
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
                                <IconButton size="sm" color="danger" variant="plain" onClick={() => handleDelete(item.id)}>
                                    <Delete />
                                </IconButton>
                            </Box>
                        </Sheet>
                    ))}

                    {items.length === 0 && (
                        <Typography level="body-md" textAlign="center" color="neutral" sx={{ py: 4 }}>
                            Your list is empty. Add items to get started!
                        </Typography>
                    )}
                </Stack>

                {stats.checkedCount > 0 && (
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                        <Button 
                            variant="plain" 
                            color="danger" 
                            startDecorator={<Clear />} 
                            onClick={handleClearCompleted}
                        >
                            Clear Completed ({stats.checkedCount})
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Sidebar / Scheduling */}
            <Box sx={{ width: { xs: '100%', md: 350 }, flexShrink: 0 }}>
                <ShoppingSchedules 
                    api={api} 
                    householdId={household.id} 
                    showNotification={showNotification} 
                    confirmAction={confirmAction} 
                />
            </Box>
        </Stack>

        <ReceiptImporter 
            open={importModalOpen} 
            onClose={() => setImportModalOpen(false)}
            api={api}
            householdId={household.id}
            onImportComplete={fetchList}
            showNotification={showNotification}
        />
    </Box>
  );
}
