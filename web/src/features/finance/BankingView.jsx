import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Divider, Avatar, Card, Grid, Chip
} from '@mui/joy';
import { Add, Edit, Delete, AccountBalance, CreditCard } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch { return `£${num.toFixed(2)}`; }
};

export default function BankingView() {
  const { api, id: householdId, household, showNotification, confirmAction } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    bank_name: '', 
    account_name: '', 
    current_balance: 0, 
    overdraft_limit: 0,
    account_number: '',
    sort_code: '',
    emoji: '🏦'
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
      bank_name: acc.bank_name, 
      account_name: acc.account_name,
      current_balance: acc.current_balance, 
      overdraft_limit: acc.overdraft_limit || 0,
      account_number: acc.account_number || '',
      sort_code: acc.sort_code || '',
      emoji: acc.emoji || '🏦'
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

  const totals = useMemo(() => {
      return accounts.reduce((acc, a) => {
          acc.balance += (parseFloat(a.current_balance) || 0);
          acc.overdraft += (parseFloat(a.overdraft_limit) || 0);
          return acc;
      }, { balance: 0, overdraft: 0 });
  }, [accounts]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography level="h2" startDecorator={<AccountBalance />}>Current Accounts</Typography>
        <Button startDecorator={<Add />} onClick={() => { setEditingId(null); setOpen(true); }}>Add Account</Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} md={6}>
            <Card variant="soft" color="primary">
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar><AccountBalance /></Avatar>
                    <Box>
                        <Typography level="body-xs">Total Balance</Typography>
                        <Typography level="h3">{formatCurrency(totals.balance, household?.currency)}</Typography>
                    </Box>
                </Box>
            </Card>
        </Grid>
        <Grid xs={12} md={6}>
            <Card variant="soft" color="neutral">
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar><CreditCard /></Avatar>
                    <Box>
                        <Typography level="body-xs">Available Liquidity (inc. Overdrafts)</Typography>
                        <Typography level="h3">{formatCurrency(totals.balance + totals.overdraft, household?.currency)}</Typography>
                    </Box>
                </Box>
            </Card>
        </Grid>
      </Grid>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Bank</th>
              <th>Account</th>
              <th>Details</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => (
              <tr key={acc.id}>
                <td><Avatar size="sm" sx={{ bgcolor: getEmojiColor(acc.emoji) }}>{acc.emoji}</Avatar></td>
                <td><Typography fontWeight="lg">{acc.bank_name}</Typography></td>
                <td>
                    <Typography level="body-md">{acc.account_name}</Typography>
                    <Typography level="body-xs" sx={{ fontFamily: 'monospace' }}>
                        {acc.sort_code} {acc.account_number}
                    </Typography>
                </td>
                <td>
                    {acc.overdraft_limit > 0 && (
                        <Chip size="sm" variant="outlined" color="warning">OD: {formatCurrency(acc.overdraft_limit, household?.currency)}</Chip>
                    )}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: acc.current_balance < 0 ? 'var(--joy-palette-danger-500)' : 'inherit' }}>
                    {formatCurrency(acc.current_balance, household?.currency)}
                </td>
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
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl><FormLabel>Sort Code</FormLabel><Input placeholder="XX-XX-XX" value={formData.sort_code} onChange={e => setFormData({ ...formData, sort_code: e.target.value })} /></FormControl>
                <FormControl><FormLabel>Account Number</FormLabel><Input placeholder="12345678" value={formData.account_number} onChange={e => setFormData({ ...formData, account_number: e.target.value })} /></FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required><FormLabel>Current Balance</FormLabel><Input type="number" startDecorator="£" value={formData.current_balance} onChange={e => setFormData({ ...formData, current_balance: e.target.value })} /></FormControl>
                <FormControl><FormLabel>Overdraft Limit</FormLabel><Input type="number" startDecorator="£" value={formData.overdraft_limit} onChange={e => setFormData({ ...formData, overdraft_limit: e.target.value })} /></FormControl>
            </Box>
            
            <Button size="lg" onClick={handleSave}>Save</Button>
          </Stack>
        </ModalDialog>
      </Modal>
      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} />
    </Box>
  );
}