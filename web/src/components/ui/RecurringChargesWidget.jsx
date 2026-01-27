import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, Sheet, Typography, Button, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Select, Option, Checkbox, Stack, Chip, Divider, DialogTitle, DialogContent, DialogActions
} from '@mui/joy';
import { Add, Edit, Delete, Receipt, Shield, ShoppingBag, ElectricBolt, DirectionsCar, Payments } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode;
    if (code === '£') code = 'GBP';
    if (code === '$') code = 'USD';
    if (!code || code.length !== 3) code = 'GBP';

    try {
        return num.toLocaleString('en-GB', { 
            style: 'currency', 
            currency: code, 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    } catch (e) {
        return `£${num.toFixed(2)}`;
    }
};

const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'one_off', label: 'One-off' }
];

const getSegmentIcon = (segment) => {
    if (segment === 'insurance') return <Shield fontSize="small" />;
    if (segment === 'subscription') return <ShoppingBag fontSize="small" />;
    if (segment === 'utility') return <ElectricBolt fontSize="small" />;
    if (segment?.startsWith('vehicle')) return <DirectionsCar fontSize="small" />;
    return <Receipt fontSize="small" />;
};

export default function RecurringChargesWidget({ 
    api, 
    householdId, 
    household,
    entityType, 
    entityId, 
    segments = [],
    title = "Expenses & Subscriptions",
    showNotification,
    confirmAction
}) {
  const [charges, setCharges] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [budgetImpactOpen, setBudgetImpactOpen] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    segment: segments[0]?.id || 'other',
    frequency: 'monthly',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    adjust_for_working_day: true,
    notes: ''
  });

  const fetchCharges = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/finance/charges`);
      const filtered = res.data.filter(c => c.linked_entity_type === entityType && String(c.linked_entity_id) === String(entityId));
      setCharges(filtered);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api, householdId, entityType, entityId]);

  useEffect(() => { fetchCharges(); }, [fetchCharges]);

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      segment: segments[0]?.id || 'other',
      frequency: 'monthly',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      adjust_for_working_day: true,
      notes: ''
    });
  };

  const handleEdit = (charge) => {
    setEditingId(charge.id);
    setFormData({
      name: charge.name,
      amount: charge.amount,
      segment: charge.segment,
      frequency: charge.frequency,
      start_date: charge.start_date || charge.exact_date || format(new Date(), 'yyyy-MM-dd'),
      adjust_for_working_day: !!charge.adjust_for_working_day,
      notes: charge.notes || ''
    });
    setOpen(true);
  };

  const prepareSave = () => {
      const payload = { ...formData, linked_entity_type: entityType, linked_entity_id: entityId };
      if (editingId) {
          setPendingSaveData(payload);
          setBudgetImpactOpen(true);
      } else {
          executeSave(payload);
      }
  };

  const executeSave = async (payload, affectCurrentBudget = false) => {
      try {
          const url = editingId ? `/households/${householdId}/finance/charges/${editingId}` : `/households/${householdId}/finance/charges`;
          const method = editingId ? 'put' : 'post';
          await api[method](url, payload);
          showNotification(editingId ? "Charge updated." : "Charge created.", "success");
          setOpen(false);
          setBudgetImpactOpen(false);
          setEditingId(null);
          setPendingSaveData(null);
          fetchCharges();
          resetForm();
      } catch (err) { showNotification("Failed to save charge.", "danger"); }
  };

  const handleDelete = async (id) => {
    confirmAction("Delete Charge?", "Are you sure?", async () => {
        try {
            await api.delete(`/households/${householdId}/finance/charges/${id}`);
            fetchCharges();
            showNotification("Charge removed.", "neutral");
        } catch { showNotification("Delete failed.", "danger"); }
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography level="title-lg" startDecorator={<Payments />}>{title}</Typography>
        <Button size="sm" variant="soft" startDecorator={<Add />} onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}>Add</Button>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
        <Table size="sm" hoverRow sx={{ '--TableCell-paddingX': '12px' }}>
          <thead>
            <tr>
              <th>Expense</th>
              <th>Category</th>
              <th>Frequency</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {charges.map(c => (
              <tr key={c.id}>
                <td>
                    <Typography level="body-sm" fontWeight="bold">{c.name}</Typography>
                    <Typography level="body-xs" color="neutral">
                        {c.start_date ? format(parseISO(c.start_date), 'do MMM') : 'No date'}
                    </Typography>
                </td>
                <td><Chip size="sm" variant="soft" startDecorator={getSegmentIcon(c.segment)}>{c.segment.replace('vehicle_', '')}</Chip></td>
                <td><Typography level="body-xs" sx={{ textTransform: 'capitalize' }}>{c.frequency}</Typography></td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(c.amount, household?.currency)}</td>
                <td>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="sm" variant="plain" onClick={() => handleEdit(c)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(c.id)}><Delete fontSize="small" /></IconButton>
                    </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ maxWidth: 450, width: '100%' }}>
          <ModalClose />
          <Typography level="h4">{editingId ? 'Edit Charge' : 'New Charge'}</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={2}>
            <FormControl required><FormLabel>Name</FormLabel><Input autoFocus value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required><FormLabel>Amount</FormLabel><Input type="number" startDecorator={household?.currency === 'USD' ? '$' : '£'} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></FormControl>
                <FormControl required><FormLabel>Category</FormLabel>
                    <Select value={formData.segment} onChange={(e, val) => setFormData({ ...formData, segment: val })}>{segments.map(s => <Option key={s.id} value={s.id}>{s.label}</Option>)}</Select>
                </FormControl>
            </Box>
            <FormControl required><FormLabel>Frequency</FormLabel>
              <Select value={formData.frequency} onChange={(e, val) => setFormData({ ...formData, frequency: val })}>{FREQUENCIES.map(f => <Option key={f.id} value={f.id}>{f.label}</Option>)}</Select>
            </FormControl>
            <FormControl required><FormLabel>Start / Anchor Date</FormLabel><Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} /></FormControl>
            <Checkbox label="Adjust for working day" checked={formData.adjust_for_working_day} onChange={e => setFormData({ ...formData, adjust_for_working_day: e.target.checked })} />
            <Button size="lg" onClick={prepareSave}>{editingId ? 'Update' : 'Create'}</Button>
          </Stack>
        </ModalDialog>
      </Modal>

      <Modal open={budgetImpactOpen} onClose={() => setBudgetImpactOpen(false)}>
          <ModalDialog variant="outlined" role="alertdialog">
              <DialogTitle>Budget Impact</DialogTitle>
              <DialogContent>Update this cycle, or only future ones?</DialogContent>
              <DialogActions>
                  <Button variant="solid" color="primary" onClick={() => executeSave(pendingSaveData, true)}>Current & Future</Button>
                  <Button variant="soft" color="neutral" onClick={() => executeSave(pendingSaveData, false)}>Future Only</Button>
              </DialogActions>
          </ModalDialog>
      </Modal>
    </Box>
  );
}