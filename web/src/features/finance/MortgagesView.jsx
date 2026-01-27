import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Divider, Avatar
} from '@mui/joy';
import { Add, Edit, Delete, Home } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch (e) { return `£${num.toFixed(2)}`; }
};

export default function MortgagesView() {
  const { api, id: householdId, household, showNotification, confirmAction } = useOutletContext();
  const [mortgages, setMortgages] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    lender: '', remaining_balance: 0, monthly_payment: 0, emoji: '🏠'
  });

  const fetchMortgages = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await api.get(`/households/${householdId}/finance/mortgages`);
      setMortgages(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId]);

  useEffect(() => { fetchMortgages(); }, [fetchMortgages]);

  const handleEdit = (m) => {
    setEditingId(m.id);
    setFormData({
      lender: m.lender, remaining_balance: m.remaining_balance,
      monthly_payment: m.monthly_payment, emoji: m.emoji || '🏠'
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingId ? `/households/${householdId}/finance/mortgages/${editingId}` : `/households/${householdId}/finance/mortgages`;
      await api[editingId ? 'put' : 'post'](url, formData);
      setOpen(false); setEditingId(null); fetchMortgages();
      showNotification("Saved.", "success");
    } catch { showNotification("Error.", "danger"); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography level="h2" startDecorator={<Home />}>Mortgages</Typography>
        <Button startDecorator={<Add />} onClick={() => { setEditingId(null); setOpen(true); }}>Add Mortgage</Button>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Lender</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th style={{ textAlign: 'right' }}>Payment</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {mortgages.map(m => (
              <tr key={m.id}>
                <td><Avatar size="sm" sx={{ bgcolor: getEmojiColor(m.emoji) }}>{m.emoji}</Avatar></td>
                <td><Typography fontWeight="lg">{m.lender}</Typography></td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(m.remaining_balance, household?.currency)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(m.monthly_payment, household?.currency)}</td>
                <td>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="sm" onClick={() => handleEdit(m)}><Edit /></IconButton>
                    <IconButton size="sm" color="danger" onClick={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/mortgages/${m.id}`).then(fetchMortgages))}><Delete /></IconButton>
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
          <Typography level="h4">{editingId ? 'Edit Mortgage' : 'New Mortgage'}</Typography>
          <Divider />
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton variant="outlined" sx={{ width: 56, height: 56 }} onClick={() => setEmojiPickerOpen(true)}>
                    <Typography level="h2">{formData.emoji}</Typography>
                </IconButton>
                <FormControl required sx={{ flex: 1 }}><FormLabel>Lender</FormLabel><Input value={formData.lender} onChange={e => setFormData({ ...formData, lender: e.target.value })} /></FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required><FormLabel>Remaining Balance</FormLabel><Input type="number" startDecorator="£" value={formData.remaining_balance} onChange={e => setFormData({ ...formData, remaining_balance: e.target.value })} /></FormControl>
                <FormControl required><FormLabel>Monthly Payment</FormLabel><Input type="number" startDecorator="£" value={formData.monthly_payment} onChange={e => setFormData({ ...formData, monthly_payment: e.target.value })} /></FormControl>
            </Box>
            <Button size="lg" onClick={handleSave}>Save</Button>
          </Stack>
        </ModalDialog>
      </Modal>
      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} />
    </Box>
  );
}