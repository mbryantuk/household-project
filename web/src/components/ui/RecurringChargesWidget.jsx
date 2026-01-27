import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, Sheet, Typography, Button, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Select, Option, Checkbox, Stack, Chip, Divider, DialogTitle, DialogContent, DialogActions
} from '@mui/joy';
import { Add, Edit, Delete, Receipt, Shield, ShoppingBag, ElectricBolt, DirectionsCar, Payments } from '@mui/icons-material';
import { format } from 'date-fns';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    // Map symbols back to ISO codes if necessary
    let code = currencyCode;
    if (code === '£') code = 'GBP';
    if (code === '$') code = 'USD';
    if (!code || code.length !== 3) code = 'GBP'; // Fallback

    try {
        return num.toLocaleString('en-GB', { 
            style: 'currency', 
            currency: code, 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    } catch (e) {
        return `£${num.toFixed(2)}`; // Last resort fallback
    }
};

const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'one_off', label: 'One-off' }
];

const DAYS_OF_WEEK = [
  { id: 1, label: 'Monday' }, { id: 2, label: 'Tuesday' }, { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' }, { id: 5, label: 'Friday' }, { id: 6, label: 'Saturday' },
  { id: 0, label: 'Sunday' }
];

const MONTHS = [
  { id: 1, label: 'January' }, { id: 2, label: 'February' }, { id: 3, label: 'March' },
  { id: 4, label: 'April' }, { id: 5, label: 'May' }, { id: 6, label: 'June' },
  { id: 7, label: 'July' }, { id: 8, label: 'August' }, { id: 9, label: 'September' },
  { id: 10, label: 'October' }, { id: 11, label: 'November' }, { id: 12, label: 'December' }
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
    day_of_month: 1,
    day_of_week: 1,
    month_of_year: 1,
    exact_date: '',
    adjust_for_working_day: true,
    notes: ''
  });

  const fetchCharges = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/finance/charges`);
      // Filter locally for this entity
      const filtered = res.data.filter(c => c.linked_entity_type === entityType && String(c.linked_entity_id) === String(entityId));
      setCharges(filtered);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [api, householdId, entityType, entityId]);

  useEffect(() => { fetchCharges(); }, [fetchCharges]);

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      segment: segments[0]?.id || 'other',
      frequency: 'monthly',
      day_of_month: 1,
      day_of_week: 1,
      month_of_year: 1,
      exact_date: '',
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
      day_of_month: charge.day_of_month || 1,
      day_of_week: charge.day_of_week || 1,
      month_of_year: charge.month_of_year || 1,
      exact_date: charge.exact_date || '',
      adjust_for_working_day: !!charge.adjust_for_working_day,
      notes: charge.notes || ''
    });
    setOpen(true);
  };

  const prepareSave = () => {
      const payload = { 
          ...formData, 
          linked_entity_type: entityType, 
          linked_entity_id: entityId 
      };
      
      // Clean data based on frequency
      if (payload.frequency !== 'monthly' && payload.frequency !== 'quarterly') payload.day_of_month = null;
      if (payload.frequency !== 'weekly') payload.day_of_week = null;
      if (payload.frequency !== 'yearly') payload.month_of_year = null;
      if (payload.frequency !== 'one_off') payload.exact_date = null;

      if (editingId) {
          setPendingSaveData(payload);
          setBudgetImpactOpen(true);
      } else {
          executeSave(payload);
      }
  };

  const executeSave = async (payload, affectCurrentBudget = false) => {
      try {
          const url = editingId 
            ? `/households/${householdId}/finance/charges/${editingId}`
            : `/households/${householdId}/finance/charges`;
          
          const method = editingId ? 'put' : 'post';
          const res = await api[method](url, payload);

          if (affectCurrentBudget && editingId) {
              showNotification("Charge updated. Budget will reflect changes in the next refresh.", "success");
          } else {
              showNotification(editingId ? "Charge updated." : "Charge created.", "success");
          }

          setOpen(false);
          setBudgetImpactOpen(false);
          setEditingId(null);
          setPendingSaveData(null);
          fetchCharges();
          resetForm();
      } catch (err) {
          showNotification("Failed to save charge.", "danger");
      }
  };

  const handleDelete = async (id) => {
    confirmAction("Delete Charge?", "Are you sure? This will remove it from all future budgets.", async () => {
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
        <Button size="sm" variant="soft" startDecorator={<Add />} onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}>
          Add
        </Button>
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
                        {c.frequency === 'monthly' && `Day ${c.day_of_month}`}
                        {c.frequency === 'weekly' && DAYS_OF_WEEK.find(d => d.id === c.day_of_week)?.label}
                        {c.frequency === 'yearly' && `${MONTHS.find(m => m.id === c.month_of_year)?.label} ${c.day_of_month}`}
                        {c.frequency === 'one_off' && c.exact_date}
                    </Typography>
                </td>
                <td>
                    <Chip size="sm" variant="soft" startDecorator={getSegmentIcon(c.segment)}>
                        {c.segment.replace('vehicle_', '').replace('household_', '')}
                    </Chip>
                </td>
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
            {charges.length === 0 && !loading && (
                <tr><td colSpan={5} style={{ textAlign: 'center', py: 4 }}><Typography level="body-xs" color="neutral">No recurring charges linked.</Typography></td></tr>
            )}
          </tbody>
        </Table>
      </Sheet>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ maxWidth: 450, width: '100%' }}>
          <ModalClose />
          <Typography level="h4">{editingId ? 'Edit Charge' : 'New Charge'}</Typography>
          <Divider sx={{ my: 2 }} />
          
          <Stack spacing={2}>
            <FormControl required>
              <FormLabel>Name</FormLabel>
              <Input autoFocus value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </FormControl>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required>
                    <FormLabel>Amount</FormLabel>
                    <Input type="number" startDecorator={household?.currency === 'USD' ? '$' : '£'} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                </FormControl>
                <FormControl required>
                    <FormLabel>Category</FormLabel>
                    <Select value={formData.segment} onChange={(e, val) => setFormData({ ...formData, segment: val })}>
                        {segments.map(s => <Option key={s.id} value={s.id}>{s.label}</Option>)}
                    </Select>
                </FormControl>
            </Box>

            <FormControl required>
              <FormLabel>Frequency</FormLabel>
              <Select value={formData.frequency} onChange={(e, val) => setFormData({ ...formData, frequency: val })}>
                {FREQUENCIES.map(f => <Option key={f.id} value={f.id}>{f.label}</Option>)}
              </Select>
            </FormControl>

            <Box sx={{ p: 2, bgcolor: 'background.level1', borderRadius: 'sm' }}>
                {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
                    <FormControl>
                        <FormLabel>Day of Month</FormLabel>
                        <Select value={formData.day_of_month} onChange={(e, val) => setFormData({ ...formData, day_of_month: val })}>
                            {[...Array(31)].map((_, i) => <Option key={i+1} value={i+1}>{i+1}</Option>)}
                        </Select>
                    </FormControl>
                )}
                {formData.frequency === 'weekly' && (
                    <FormControl>
                        <FormLabel>Day of Week</FormLabel>
                        <Select value={formData.day_of_week} onChange={(e, val) => setFormData({ ...formData, day_of_week: val })}>
                            {DAYS_OF_WEEK.map(d => <Option key={d.id} value={d.id}>{d.label}</Option>)}
                        </Select>
                    </FormControl>
                )}
                {formData.frequency === 'yearly' && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControl sx={{ flex: 1 }}>
                            <FormLabel>Month</FormLabel>
                            <Select value={formData.month_of_year} onChange={(e, val) => setFormData({ ...formData, month_of_year: val })}>
                                {MONTHS.map(m => <Option key={m.id} value={m.id}>{m.label}</Option>)}
                            </Select>
                        </FormControl>
                        <FormControl sx={{ flex: 1 }}>
                            <FormLabel>Day</FormLabel>
                            <Select value={formData.day_of_month} onChange={(e, val) => setFormData({ ...formData, day_of_month: val })}>
                                {[...Array(31)].map((_, i) => <Option key={i+1} value={i+1}>{i+1}</Option>)}
                            </Select>
                        </FormControl>
                    </Box>
                )}
                {formData.frequency === 'one_off' && (
                    <FormControl>
                        <FormLabel>Date</FormLabel>
                        <Input type="date" value={formData.exact_date} onChange={e => setFormData({ ...formData, exact_date: e.target.value })} />
                    </FormControl>
                )}
                {formData.frequency !== 'one_off' && (
                    <Checkbox sx={{ mt: 2 }} label="Adjust for working day" checked={formData.adjust_for_working_day} onChange={e => setFormData({ ...formData, adjust_for_working_day: e.target.checked })} />
                )}
            </Box>

            <Button size="lg" onClick={prepareSave}>{editingId ? 'Update' : 'Create'}</Button>
          </Stack>
        </ModalDialog>
      </Modal>

      <Modal open={budgetImpactOpen} onClose={() => setBudgetImpactOpen(false)}>
          <ModalDialog variant="outlined" role="alertdialog">
              <DialogTitle>Budget Impact</DialogTitle>
              <DialogContent>Should this change affect the current budget cycle, or only future ones?</DialogContent>
              <DialogActions>
                  <Button variant="solid" color="primary" onClick={() => executeSave(pendingSaveData, true)}>Current & Future</Button>
                  <Button variant="soft" color="neutral" onClick={() => executeSave(pendingSaveData, false)}>Future Only</Button>
              </DialogActions>
          </ModalDialog>
      </Modal>
    </Box>
  );
}
