import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Select, Option, Checkbox, Stack, Chip, Divider, Avatar
} from '@mui/joy';
import { Add, Edit, Delete, Payments } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch (e) { return `£${num.toFixed(2)}`; }
};

export default function IncomeView() {
  const { api, id: householdId, household, showNotification, confirmAction, members = [] } = useOutletContext();
  const [incomes, setIncomes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    member_id: '', employer: '', role: '', amount: '',
    frequency: 'monthly', payment_day: 1, is_primary: false, emoji: '💰'
  });

  const fetchIncomes = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await api.get(`/households/${householdId}/finance/income`);
      setIncomes(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId]);

  useEffect(() => { fetchIncomes(); }, [fetchIncomes]);

  const handleEdit = (inc) => {
    setEditingId(inc.id);
    setFormData({
      member_id: inc.member_id || '', employer: inc.employer || '',
      role: inc.role || '', amount: inc.amount || '',
      frequency: inc.frequency || 'monthly', payment_day: inc.payment_day || 1,
      is_primary: !!inc.is_primary, emoji: inc.emoji || '💰'
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingId ? `/households/${householdId}/finance/income/${editingId}` : `/households/${householdId}/finance/income`;
      await api[editingId ? 'put' : 'post'](url, { ...formData, is_primary: formData.is_primary ? 1 : 0 });
      setOpen(false); setEditingId(null); fetchIncomes();
      showNotification("Saved.", "success");
    } catch { showNotification("Error.", "danger"); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography level="h2" startDecorator={<Payments />}>Income Streams</Typography>
        <Button startDecorator={<Add />} onClick={() => { setEditingId(null); setOpen(true); }}>Add Income</Button>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Person</th>
              <th>Employer</th>
              <th>Role</th>
              <th>Frequency</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {incomes.map(inc => (
              <tr key={inc.id}>
                <td><Avatar size="sm" sx={{ bgcolor: getEmojiColor(inc.emoji) }}>{inc.emoji}</Avatar></td>
                <td>{members.find(m => m.id === inc.member_id)?.name || 'Unassigned'}</td>
                <td><Typography fontWeight="lg">{inc.employer}</Typography></td>
                <td>{inc.role}</td>
                <td><Chip size="sm" variant="soft">{inc.frequency}</Chip></td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(inc.amount, household?.currency)}</td>
                <td>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="sm" onClick={() => handleEdit(inc)}><Edit /></IconButton>
                    <IconButton size="sm" color="danger" onClick={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/income/${inc.id}`).then(fetchIncomes))}><Delete /></IconButton>
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
          <Typography level="h4">{editingId ? 'Edit Income' : 'New Income'}</Typography>
          <Divider />
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton variant="outlined" sx={{ width: 56, height: 56 }} onClick={() => setEmojiPickerOpen(true)}>
                    <Typography level="h2">{formData.emoji}</Typography>
                </IconButton>
                <FormControl required sx={{ flex: 1 }}><FormLabel>Employer</FormLabel><Input value={formData.employer} onChange={e => setFormData({ ...formData, employer: e.target.value })} /></FormControl>
            </Box>
            <FormControl required><FormLabel>Role</FormLabel><Input value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} /></FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required><FormLabel>Amount (Takehome)</FormLabel><Input type="number" startDecorator="£" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></FormControl>
                <FormControl required><FormLabel>Assigned Member</FormLabel>
                    <Select value={formData.member_id} onChange={(e, v) => setFormData({ ...formData, member_id: v })}>
                        {members.map(m => <Option key={m.id} value={m.id}>{m.emoji} {m.name}</Option>)}
                    </Select>
                </FormControl>
            </Box>
            <Checkbox label="Set as Primary Income (for budget cycle calculation)" checked={formData.is_primary} onChange={e => setFormData({ ...formData, is_primary: e.target.checked })} />
            <Button size="lg" onClick={handleSave}>Save</Button>
          </Stack>
        </ModalDialog>
      </Modal>
      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} />
    </Box>
  );
}
