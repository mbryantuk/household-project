import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Avatar, Divider, DialogActions
} from '@mui/joy';
import { Add, Edit, Delete, Category } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BudgetCategoryView() {
  const { api, id: householdId, isDark, showNotification, confirmAction } = useOutletContext();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    monthly_limit: 0,
    emoji: '📂'
  });

  const fetchCategories = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/finance/categories`);
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleEdit = (cat) => {
    setSelectedId(cat.id);
    setFormData({
      name: cat.name || '',
      monthly_limit: cat.monthly_limit || 0,
      emoji: cat.emoji || '📂'
    });
  };

  const handleAddNew = () => {
    setSelectedId('new');
    setFormData({
      name: '',
      monthly_limit: 0,
      emoji: '📂'
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        monthly_limit: parseFloat(formData.monthly_limit) || 0
      };

      if (selectedId === 'new') {
        await api.post(`/households/${householdId}/finance/categories`, payload);
        showNotification("Category created.", "success");
      } else {
        await api.put(`/households/${householdId}/finance/categories/${selectedId}`, payload);
        showNotification("Category updated.", "success");
      }
      fetchCategories();
      setSelectedId(null);
    } catch (err) {
      showNotification("Failed to save category.", "danger");
    }
  };

  const handleDelete = (id) => {
    confirmAction("Delete Category?", "Are you sure? This won't delete items in this category but will remove the limit tracking.", async () => {
      try {
        await api.delete(`/households/${householdId}/finance/categories/${id}`);
        showNotification("Category deleted.", "success");
        fetchCategories();
      } catch (err) {
        showNotification("Failed to delete category.", "danger");
      }
    });
  };

  if (loading && categories.length === 0) return <Box sx={{ p: 4, textAlign: 'center' }}>Loading Categories...</Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography level="h2" startDecorator={<Category />}>Budget Categories</Typography>
          <Typography level="body-md" color="neutral">Define spending limits and icons for your budget groups.</Typography>
        </Box>
        <Button startDecorator={<Add />} onClick={handleAddNew}>Add Category</Button>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: 60 }}></th>
              <th>Category Name</th>
              <th style={{ textAlign: 'right' }}>Monthly Limit</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td>
                  <Avatar size="sm" sx={{ bgcolor: getEmojiColor(cat.emoji, isDark) }}>{cat.emoji}</Avatar>
                </td>
                <td>
                  <Typography fontWeight="lg">{cat.name}</Typography>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {cat.monthly_limit > 0 ? formatCurrency(cat.monthly_limit) : <Typography color="neutral" level="body-xs">No Limit</Typography>}
                </td>
                <td>
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <IconButton size="sm" variant="plain" onClick={() => handleEdit(cat)}><Edit /></IconButton>
                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(cat.id)}><Delete /></IconButton>
                  </Box>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                  <Typography color="neutral">No custom categories defined.</Typography>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Sheet>

      <Modal open={Boolean(selectedId)} onClose={() => setSelectedId(null)}>
        <ModalDialog sx={{ maxWidth: 400, width: '100%' }}>
          <ModalClose />
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <Avatar 
              size="lg" 
              sx={{ 
                '--Avatar-size': '64px', 
                bgcolor: getEmojiColor(formData.emoji, isDark), 
                fontSize: '2rem', 
                cursor: 'pointer' 
              }} 
              onClick={() => setEmojiPickerOpen(true)}
            >
              {formData.emoji}
            </Avatar>
            <Box>
              <Typography level="h4">{selectedId === 'new' ? 'New Category' : 'Edit Category'}</Typography>
              <Typography level="body-sm" color="neutral">Set a name and monthly limit.</Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <form onSubmit={handleSave}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Name</FormLabel>
                <Input 
                  autoFocus 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g. Groceries"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Monthly Limit (£)</FormLabel>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.monthly_limit} 
                  onChange={e => setFormData({ ...formData, monthly_limit: e.target.value })} 
                  placeholder="0.00 (No limit)"
                />
              </FormControl>
              <DialogActions sx={{ mt: 2 }}>
                <Button type="submit">Save Category</Button>
                <Button variant="plain" color="neutral" onClick={() => setSelectedId(null)}>Cancel</Button>
              </DialogActions>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} 
        isDark={isDark}
      />
    </Box>
  );
}
