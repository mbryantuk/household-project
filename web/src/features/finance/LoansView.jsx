import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Divider, Avatar
} from '@mui/joy';
import { Add, Edit, Delete, RequestQuote } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch { return `£${num.toFixed(2)}`; }
};

export default function LoansView() {
  const { api, id: householdId, household, showNotification, confirmAction } = useOutletContext();
  const [loans, setLoans] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    lender: '', loan_type: '', remaining_balance: 0, monthly_payment: 0, emoji: '📝'
  });

  const fetchLoans = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await api.get(`/households/${householdId}/finance/loans`);
      setLoans(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLoans();
  }, [fetchLoans]);

  const handleEdit = (loan) => {
    setEditingId(loan.id);
    setFormData({
      lender: loan.lender, loan_type: loan.loan_type,
      remaining_balance: loan.remaining_balance, monthly_payment: loan.monthly_payment,
      emoji: loan.emoji || '📝'
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingId ? `/households/${householdId}/finance/loans/${editingId}` : `/households/${householdId}/finance/loans`;
      await api[editingId ? 'put' : 'post'](url, formData);
      setOpen(false); setEditingId(null); fetchLoans();
      showNotification("Saved.", "success");
    } catch { showNotification("Error.", "danger"); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography level="h2" startDecorator={<RequestQuote />}>Loans</Typography>
        <Button startDecorator={<Add />} onClick={() => { setEditingId(null); setOpen(true); }}>Add Loan</Button>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Lender</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th style={{ textAlign: 'right' }}>Payment</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {loans.map(loan => (
              <tr key={loan.id}>
                <td><Avatar size="sm" sx={{ bgcolor: getEmojiColor(loan.emoji) }}>{loan.emoji}</Avatar></td>
                <td><Typography fontWeight="lg">{loan.lender}</Typography></td>
                <td>{loan.loan_type}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(loan.remaining_balance, household?.currency)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(loan.monthly_payment, household?.currency)}</td>
                <td>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="sm" onClick={() => handleEdit(loan)}><Edit /></IconButton>
                    <IconButton size="sm" color="danger" onClick={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/loans/${loan.id}`).then(fetchLoans))}><Delete /></IconButton>
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
          <Typography level="h4">{editingId ? 'Edit Loan' : 'New Loan'}</Typography>
          <Divider />
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton variant="outlined" sx={{ width: 56, height: 56 }} onClick={() => setEmojiPickerOpen(true)}>
                    <Typography level="h2">{formData.emoji}</Typography>
                </IconButton>
                <FormControl required sx={{ flex: 1 }}><FormLabel>Lender</FormLabel><Input value={formData.lender} onChange={e => setFormData({ ...formData, lender: e.target.value })} /></FormControl>
            </Box>
            <FormControl required><FormLabel>Loan Type</FormLabel><Input value={formData.loan_type} onChange={e => setFormData({ ...formData, loan_type: e.target.value })} /></FormControl>
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