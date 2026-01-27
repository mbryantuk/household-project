import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Divider, Avatar
} from '@mui/joy';
import { Add, Edit, Delete, TrendingUp } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch (e) { return `£${num.toFixed(2)}`; }
};

export default function InvestmentsView() {
  const { api, id: householdId, household, showNotification, confirmAction } = useOutletContext();
  const [investments, setInvestments] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '', platform: '', current_value: 0, total_invested: 0, emoji: '📈'
  });

  const fetchInvestments = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await api.get(`/households/${householdId}/finance/investments`);
      setInvestments(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId]);

  useEffect(() => { fetchInvestments(); }, [fetchInvestments]);

  const handleEdit = (inv) => {
    setEditingId(inv.id);
    setFormData({
      name: inv.name, platform: inv.platform,
      current_value: inv.current_value, total_invested: inv.total_invested,
      emoji: inv.emoji || '📈'
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingId ? `/households/${householdId}/finance/investments/${editingId}` : `/households/${householdId}/finance/finance/investments`;
      // Check if standard path or sub-path
      const realUrl = editingId ? `/households/${householdId}/finance/investments/${editingId}` : `/households/${householdId}/finance/investments`;
      await api[editingId ? 'put' : 'post'](realUrl, formData);
      setOpen(false); setEditingId(null); fetchInvestments();
      showNotification("Saved.", "success");
    } catch { showNotification("Error.", "danger"); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography level="h2" startDecorator={<TrendingUp />}>Investments</Typography>
        <Button startDecorator={<Add />} onClick={() => { setEditingId(null); setOpen(true); }}>Add Investment</Button>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Name</th>
              <th>Platform</th>
              <th style={{ textAlign: 'right' }}>Current Value</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {investments.map(inv => (
              <tr key={inv.id}>
                <td><Avatar size="sm" sx={{ bgcolor: getEmojiColor(inv.emoji) }}>{inv.emoji}</Avatar></td>
                <td><Typography fontWeight="lg">{inv.name}</Typography></td>
                <td>{inv.platform}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(inv.current_value, household?.currency)}</td>
                <td>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="sm" onClick={() => handleEdit(inv)}><Edit /></IconButton>
                    <IconButton size="sm" color="danger" onClick={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/investments/${inv.id}`).then(fetchInvestments))}><Delete /></IconButton>
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
          <ModalClose />
          <Typography level="h4">{editingId ? 'Edit Investment' : 'New Investment'}</Typography>
          <Divider />
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton variant="outlined" sx={{ width: 56, height: 56 }} onClick={() => setEmojiPickerOpen(true)}>
                    <Typography level="h2">{formData.emoji}</Typography>
                </IconButton>
                <FormControl required sx={{ flex: 1 }}><FormLabel>Investment Name</FormLabel><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></FormControl>
            </Box>
            <FormControl required><FormLabel>Platform</FormLabel><Input value={formData.platform} onChange={e => setFormData({ ...formData, platform: e.target.value })} /></FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required><FormLabel>Current Value</FormLabel><Input type="number" startDecorator="£" value={formData.current_value} onChange={e => setFormData({ ...formData, current_value: e.target.value })} /></FormControl>
                <FormControl><FormLabel>Total Invested</FormLabel><Input type="number" startDecorator="£" value={formData.total_invested} onChange={e => setFormData({ ...formData, total_invested: e.target.value })} /></FormControl>
            </Box>
            <Button size="lg" onClick={handleSave}>Save</Button>
          </Stack>
        </ModalDialog>
      </Modal>
      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} />
    </Box>
  );
}
