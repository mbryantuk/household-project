import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Input, Button, IconButton, Checkbox, 
  List, ListItem, ListItemContent, ListItemDecorator, Chip, Stack,
  Select, Option, FormControl, FormLabel
} from '@mui/joy';
import { 
  Add, Delete, ShoppingCart, CheckCircle, RadioButtonUnchecked, 
  LocalOffer, Close
} from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';

const CATEGORIES = [
  { id: 'general', name: 'General', emoji: '🛒' },
  { id: 'produce', name: 'Produce', emoji: '🥦' },
  { id: 'dairy', name: 'Dairy & Eggs', emoji: '🧀' },
  { id: 'meat', name: 'Meat & Fish', emoji: '🥩' },
  { id: 'bakery', name: 'Bakery', emoji: '🍞' },
  { id: 'frozen', name: 'Frozen', emoji: '🧊' },
  { id: 'pantry', name: 'Pantry', emoji: '🥫' },
  { id: 'household', name: 'Household', emoji: '🧻' },
];

export default function ShoppingListView() {
  const { api, id: householdId, showNotification } = useOutletContext();
  
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('general');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get(`/households/${householdId}/shopping`);
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to fetch shopping items", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    // Auto-detect category if general? (Maybe later)
    // For now, use selected category.
    const categoryObj = CATEGORIES.find(c => c.id === newItemCategory);

    try {
        const res = await api.post(`/households/${householdId}/shopping`, {
            name: newItemName,
            category: newItemCategory,
            quantity: newItemQuantity,
            emoji: categoryObj ? categoryObj.emoji : '🛒'
        });
        setItems(prev => [res.data, ...prev]);
        setNewItemName('');
        setNewItemQuantity('');
        showNotification("Item added", "success");
    } catch (err) {
        showNotification("Failed to add item", "danger");
    }
  };

  const handleToggle = async (item) => {
      // Optimistic Update
      const newStatus = !item.is_checked;
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: newStatus ? 1 : 0 } : i));

      try {
          await api.put(`/households/${householdId}/shopping/${item.id}/toggle`, { is_checked: newStatus });
      } catch (err) {
          // Revert
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: item.is_checked } : i));
          showNotification("Failed to update status", "danger");
      }
  };

  const handleDelete = async (id) => {
      if (!window.confirm("Delete this item?")) return;
      try {
          await api.delete(`/households/${householdId}/shopping/${id}`);
          setItems(prev => prev.filter(i => i.id !== id));
      } catch (err) {
          showNotification("Delete failed", "danger");
      }
  };

  const handleClearCompleted = async () => {
      if (!window.confirm("Remove all completed items?")) return;
      try {
          await api.delete(`/households/${householdId}/shopping/clear-completed`);
          setItems(prev => prev.filter(i => !i.is_checked));
          showNotification("Completed items cleared", "success");
      } catch (err) {
          showNotification("Failed to clear items", "danger");
      }
  };

  // Grouping
  const groupedItems = useMemo(() => {
      const groups = {};
      CATEGORIES.forEach(c => groups[c.id] = []);
      
      // Also catch unknown categories
      const otherKey = 'other';
      groups[otherKey] = [];

      items.forEach(item => {
          if (groups[item.category]) {
              groups[item.category].push(item);
          } else {
              groups[otherKey].push(item);
          }
      });
      return groups;
  }, [items]);

  const activeCount = items.filter(i => !i.is_checked).length;

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', maxWidth: 800, mx: 'auto', width: '100%' }}>
      
      {/* HEADER */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingCart color="primary" /> Shopping List
            </Typography>
            <Typography level="body-md" color="neutral">
                {activeCount} items remaining
            </Typography>
          </Box>
          {items.some(i => i.is_checked) && (
              <Button variant="outlined" color="neutral" size="sm" onClick={handleClearCompleted}>
                  Clear Completed
              </Button>
          )}
      </Box>

      {/* INPUT FORM */}
      <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', mb: 3 }}>
        <form onSubmit={handleAddItem}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Input 
                    placeholder="Add item (e.g. Milk)" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    required
                    sx={{ flexGrow: 1 }}
                />
                <Input 
                    placeholder="Qty" 
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    sx={{ width: { xs: '100%', sm: 100 } }}
                />
                <Select 
                    value={newItemCategory} 
                    onChange={(_, v) => setNewItemCategory(v)}
                    sx={{ width: { xs: '100%', sm: 160 } }}
                >
                    {CATEGORIES.map(c => (
                        <Option key={c.id} value={c.id}>
                            <ListItemDecorator>{c.emoji}</ListItemDecorator> {c.name}
                        </Option>
                    ))}
                </Select>
                <Button type="submit" startDecorator={<Add />}>Add</Button>
            </Stack>
        </form>
      </Sheet>

      {/* LIST */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {CATEGORIES.concat([{id: 'other', name: 'Other', emoji: '📦'}]).map(cat => {
              const catItems = groupedItems[cat.id];
              if (!catItems || catItems.length === 0) return null;

              return (
                  <Box key={cat.id} sx={{ mb: 3 }}>
                      <Typography level="title-sm" sx={{ mb: 1, textTransform: 'uppercase', fontSize: 'xs', color: 'text.tertiary', letterSpacing: '1px' }}>
                          {cat.emoji} {cat.name}
                      </Typography>
                      <List variant="outlined" sx={{ borderRadius: 'md', bgcolor: 'background.surface' }}>
                          {catItems.map((item, idx) => (
                              <React.Fragment key={item.id}>
                                  {idx > 0 && <Box sx={{ height: 1, bgcolor: 'divider', mx: 2 }} />}
                                  <ListItem 
                                    endAction={
                                        <IconButton size="sm" color="danger" variant="plain" onClick={() => handleDelete(item.id)}>
                                            <Delete />
                                        </IconButton>
                                    }
                                  >
                                      <Checkbox 
                                        checked={!!item.is_checked}
                                        onChange={() => handleToggle(item)}
                                        sx={{ mr: 2 }}
                                        color={item.is_checked ? 'neutral' : 'primary'}
                                      />
                                      <ListItemContent sx={{ 
                                          textDecoration: item.is_checked ? 'line-through' : 'none',
                                          color: item.is_checked ? 'text.tertiary' : 'text.primary',
                                          opacity: item.is_checked ? 0.6 : 1
                                      }}>
                                          <Typography level="title-sm">{item.name}</Typography>
                                          {item.quantity && <Typography level="body-xs" color="neutral">Qty: {item.quantity}</Typography>}
                                      </ListItemContent>
                                  </ListItem>
                              </React.Fragment>
                          ))}
                      </List>
                  </Box>
              );
          })}
          
          {items.length === 0 && !loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, opacity: 0.5 }}>
                  <ShoppingCart sx={{ fontSize: 48, mb: 2 }} />
                  <Typography>Your list is empty.</Typography>
              </Box>
          )}
      </Box>
    </Box>
  );
}
