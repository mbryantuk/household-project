import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Select, Option, Checkbox, Stack, Chip, Divider, Avatar, Tooltip, Card
} from '@mui/joy';
import { Add, Edit, Delete, Payments, Calculate, Info } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch { return `£${num.toFixed(2)}`; }
};

export default function IncomeView() {
  const { api, id: householdId, household, showNotification, confirmAction, members = [] } = useOutletContext();
  const [incomes, setIncomes] = useState([]);
  const [accounts, setAccounts] = useState([]); // For linking to bank account
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    member_id: '', 
    employer: '', 
    role: '', 
    amount: '',
    frequency: 'monthly', 
    payment_day: 1, 
    is_primary: false, 
    emoji: '💰',
    // New Fields
    gross_annual_salary: '',
    employment_type: 'employed', // employed, self_employed, contractor, retired, unemployed
    work_type: 'full_time', // full_time, part_time
    bank_account_id: ''
  });

  const fetchIncomes = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await api.get(`/households/${householdId}/finance/income`);
      setIncomes(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get(`/households/${householdId}/finance/current-accounts`);
      setAccounts(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId]);

  useEffect(() => { 
      fetchIncomes(); 
      fetchAccounts();
  }, [fetchIncomes, fetchAccounts]);

  const handleEdit = (inc) => {
    setEditingId(inc.id);
    setFormData({
      member_id: inc.member_id || '', 
      employer: inc.employer || '',
      role: inc.role || '', 
      amount: inc.amount || '',
      frequency: inc.frequency || 'monthly', 
      payment_day: inc.payment_day || 1,
      is_primary: !!inc.is_primary, 
      emoji: inc.emoji || '💰',
      gross_annual_salary: inc.gross_annual_salary || '',
      employment_type: inc.employment_type || 'employed',
      work_type: inc.work_type || 'full_time',
      bank_account_id: inc.bank_account_id || ''
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

  // Simple Estimator (UK Tax approx)
  const estimateNet = () => {
      const gross = parseFloat(formData.gross_annual_salary) || 0;
      if (gross <= 0) return;
      
      // Very rough UK 2024/25 approx
      // Personal Allowance: 12570
      // Basic 20% to 50270
      // Higher 40% to 125140
      // NI approx 8% above 12570 (simplified)
      
      let taxable = Math.max(0, gross - 12570);
      let tax = 0;
      if (taxable > 0) {
          if (gross <= 50270) {
              tax = taxable * 0.20;
          } else {
              tax = (37700 * 0.20) + ((gross - 50270) * 0.40);
          }
      }
      
      // NI (Roughly 8% on earnings between PT and UEL for employees)
      let ni = 0;
      if (gross > 12570) {
          ni = (Math.min(gross, 50270) - 12570) * 0.08;
          if (gross > 50270) ni += (gross - 50270) * 0.02;
      }
      
      const annualNet = gross - tax - ni;
      const monthly = annualNet / 12;
      
      setFormData({ ...formData, amount: monthly.toFixed(2) });
      showNotification(`Estimated Monthly Net: £${monthly.toFixed(2)}`, 'neutral');
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
              <th>Employer / Source</th>
              <th>Details</th>
              <th>Frequency</th>
              <th style={{ textAlign: 'right' }}>Gross (Yr)</th>
              <th style={{ textAlign: 'right' }}>Net (Mo)</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {incomes.map(inc => (
              <tr key={inc.id}>
                <td><Avatar size="sm" sx={{ bgcolor: getEmojiColor(inc.emoji) }}>{inc.emoji}</Avatar></td>
                <td>{members.find(m => m.id === inc.member_id)?.name || 'Unassigned'}</td>
                <td>
                    <Typography fontWeight="lg">{inc.employer}</Typography>
                    <Typography level="body-xs">{inc.role}</Typography>
                </td>
                <td>
                    <Chip size="sm" variant="soft" sx={{ mr: 1 }}>{inc.employment_type?.replace('_', ' ')}</Chip>
                    {inc.is_primary === 1 && <Chip size="sm" color="success">Primary</Chip>}
                </td>
                <td><Chip size="sm" variant="outlined">{inc.frequency}</Chip></td>
                <td style={{ textAlign: 'right', color: 'neutral.500' }}>{inc.gross_annual_salary ? formatCurrency(inc.gross_annual_salary, household?.currency) : '-'}</td>
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
        <ModalDialog sx={{ maxWidth: 600, width: '100%', overflow: 'auto' }}>
          <ModalClose />
          <Typography level="h4">{editingId ? 'Edit Income' : 'New Income'}</Typography>
          <Divider />
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton variant="outlined" sx={{ width: 56, height: 56 }} onClick={() => setEmojiPickerOpen(true)}>
                    <Typography level="h2">{formData.emoji}</Typography>
                </IconButton>
                <FormControl required sx={{ flex: 1 }}><FormLabel>Employer / Source</FormLabel><Input value={formData.employer} onChange={e => setFormData({ ...formData, employer: e.target.value })} /></FormControl>
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required><FormLabel>Role / Title</FormLabel><Input value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} /></FormControl>
                <FormControl required><FormLabel>Assigned To</FormLabel>
                    <Select value={formData.member_id} onChange={(e, v) => setFormData({ ...formData, member_id: v })}>
                        {members.map(m => <Option key={m.id} value={m.id}>{m.emoji} {m.name}</Option>)}
                    </Select>
                </FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl><FormLabel>Employment Type</FormLabel>
                    <Select value={formData.employment_type} onChange={(e, v) => setFormData({ ...formData, employment_type: v })}>
                        <Option value="employed">Employed</Option>
                        <Option value="self_employed">Self Employed</Option>
                        <Option value="contractor">Contractor</Option>
                        <Option value="retired">Retired</Option>
                        <Option value="unemployed">Unemployed</Option>
                    </Select>
                </FormControl>
                <FormControl><FormLabel>Work Type</FormLabel>
                    <Select value={formData.work_type} onChange={(e, v) => setFormData({ ...formData, work_type: v })}>
                        <Option value="full_time">Full Time</Option>
                        <Option value="part_time">Part Time</Option>
                    </Select>
                </FormControl>
            </Box>

            <Card variant="soft">
                <Typography level="title-sm" startDecorator={<Calculate />}>Salary Calculator</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                    <FormControl sx={{ flex: 1 }}><FormLabel>Gross Annual Salary</FormLabel><Input type="number" startDecorator="£" value={formData.gross_annual_salary} onChange={e => setFormData({ ...formData, gross_annual_salary: e.target.value })} /></FormControl>
                    <Button variant="outlined" onClick={estimateNet}>Estimate Net</Button>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <FormControl required>
                        <FormLabel>Net Monthly Pay</FormLabel>
                        <Input type="number" startDecorator="£" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                    </FormControl>
                    <FormControl><FormLabel>Pay Day</FormLabel><Input type="number" value={formData.payment_day} slotProps={{ input: { min: 1, max: 31 } }} onChange={e => setFormData({ ...formData, payment_day: e.target.value })} /></FormControl>
                </Box>
            </Card>

            <FormControl><FormLabel>Deposit Into Account</FormLabel>
                <Select value={formData.bank_account_id} onChange={(e, v) => setFormData({ ...formData, bank_account_id: v })}>
                    <Option value="">None / External</Option>
                    {accounts.map(a => <Option key={a.id} value={a.id}>{a.bank_name} - {a.account_name}</Option>)}
                </Select>
            </FormControl>

            <Checkbox label="Set as Primary Income (for budget cycle calculation)" checked={formData.is_primary} onChange={e => setFormData({ ...formData, is_primary: e.target.checked })} />
            
            <Button size="lg" onClick={handleSave}>Save Income</Button>
          </Stack>
        </ModalDialog>
      </Modal>
      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} />
    </Box>
  );
}