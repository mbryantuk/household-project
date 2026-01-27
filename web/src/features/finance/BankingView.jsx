import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Divider, Avatar
} from '@mui/joy';
import { Add, Edit, Delete, AccountBalance } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch (e) { return `£${num.toFixed(2)}`; }
};

export default function BankingView() {
  const { api, id: householdId, household, showNotification, confirmAction } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    bank_name: '', account_name: '', current_balance: 0, emoji: '🏦'
  });

  const fetchAccounts = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await api.get(`/households/${householdId}/finance/current-accounts`);
      setAccounts(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleEdit = (acc) => {
    setEditingId(acc.id);
    setFormData({
      bank_name: acc.bank_name, account_name: acc.account_name,
      current_balance: acc.current_balance, emoji: acc.emoji || '🏦'
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingId ? `/households/${householdId}/finance/current-accounts/${editingId}` : `/households/${householdId}/finance/current-accounts`;
      await api[editingId ? 'put' : 'post'](url, formData);
      setOpen(false); setEditingId(null); fetchAccounts();
      showNotification("Saved.", "success");
    } catch { showNotification("Error.", "danger"); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography level="h2" startDecorator={<AccountBalance />}>Banking</Typography>
        <Button startDecorator={<Add />} onClick={() => { setEditingId(null); setOpen(true); }}>Add Account</Button>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Bank</th>
              <th>Account</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => (
              <tr key={acc.id}>
                <td><Avatar size="sm" sx={{ bgcolor: getEmojiColor(acc.emoji) }}>{acc.emoji}</Avatar></td>
                <td><Typography fontWeight="lg">{acc.bank_name}</Typography></td>
                <td>{acc.account_name}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(acc.current_balance, household?.currency)}</td>
                <td>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="sm" onClick={() => handleEdit(acc)}><Edit /></IconButton>
                    <IconButton size="sm" color="danger" onClick={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/current-accounts/${acc.id}`).then(fetchAccounts))}><Delete /></IconButton>
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
          <Typography level="h4">{editingId ? 'Edit Account' : 'New Account'}</Typography>
          <Divider />
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton variant="outlined" sx={{ width: 56, height: 56 }} onClick={() => setEmojiPickerOpen(true)}>
                    <Typography level="h2">{formData.emoji}</Typography>
                </IconButton>
                <FormControl required sx={{ flex: 1 }}><FormLabel>Bank Name</FormLabel><Input value={formData.bank_name} onChange={e => setFormData({ ...formData, bank_name: e.target.value })} /></FormControl>
            </Box>
            <FormControl required><FormLabel>Account Name</FormLabel><Input value={formData.account_name} onChange={e => setFormData({ ...formData, account_name: e.target.value })} /></FormControl>
            <FormControl required><FormLabel>Current Balance</FormLabel><Input type="number" startDecorator="£" value={formData.current_balance} onChange={e => setFormData({ ...formData, current_balance: e.target.value })} /></FormControl>
            <Button size="lg" onClick={handleSave}>Save</Button>
          </Stack>
        </ModalDialog>
      </Modal>
      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} />
    </Box>
  );
}
