import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Sheet, Typography, Button, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Select, Option, Checkbox, Tabs, TabList, Tab, Stack, Chip, Divider
} from '@mui/joy';
import { Add, Edit, Delete } from '@mui/icons-material';

const formatCurrency = (val, currency = 'GBP') => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { 
        style: 'currency', 
        currency: currency, 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
};

// Segments as per user request
const SEGMENTS = [
  { id: 'household_bill', label: 'Household Bills' },
  { id: 'utility', label: 'Utilities' },
  { id: 'subscription', label: 'Subscriptions' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'warranty', label: 'Warranties' },
  { id: 'vehicle_tax', label: 'Vehicle Tax' },
  { id: 'vehicle_mot', label: 'Vehicle MOT' },
  { id: 'vehicle_service', label: 'Vehicle Service' },
  { id: 'vehicle_fuel', label: 'Vehicle Fuel' },
  { id: 'other', label: 'Other' }
];

const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'one_off', label: 'One-off' }
];

const DAYS_OF_WEEK = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
  { id: 0, label: 'Sunday' }
];

const MONTHS = [
  { id: 1, label: 'January' }, { id: 2, label: 'February' }, { id: 3, label: 'March' },
  { id: 4, label: 'April' }, { id: 5, label: 'May' }, { id: 6, label: 'June' },
  { id: 7, label: 'July' }, { id: 8, label: 'August' }, { id: 9, label: 'September' },
  { id: 10, label: 'October' }, { id: 11, label: 'November' }, { id: 12, label: 'December' }
];

export default function ChargesView({ initialTab }) {
  const { household } = useOutletContext();
  const householdId = household?.id;
  const [charges, setCharges] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab === 'subscriptions') {
      const subIdx = SEGMENTS.findIndex(s => s.id === 'subscription');
      return subIdx !== -1 ? subIdx : 0;
    }
    return 0;
  });
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Entity Lists for Selector
  const [members, setMembers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assets, setAssets] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    segment: 'household_bill',
    frequency: 'monthly',
    day_of_month: 1,
    day_of_week: 1,
    month_of_year: 1,
    exact_date: '',
    adjust_for_working_day: true,
    notes: '',
    linked_entity_type: 'general',
    linked_entity_id: 1 // Default to Household ID
  });

  const fetchCharges = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await fetch(`/api/households/${householdId}/finance/charges`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCharges(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [householdId]);

  const fetchEntities = useCallback(async () => {
      if (!householdId) return;
      try {
          const [mRes, vRes, aRes] = await Promise.all([
              fetch(`/api/households/${householdId}/members`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
              fetch(`/api/households/${householdId}/vehicles`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
              fetch(`/api/households/${householdId}/assets`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
          ]);
          if (mRes.ok) setMembers(await mRes.json());
          if (vRes.ok) setVehicles(await vRes.json());
          if (aRes.ok) setAssets(await aRes.json());
      } catch (err) { console.error(err); }
  }, [householdId]);

  useEffect(() => {
    Promise.resolve().then(() => {
        fetchCharges();
        fetchEntities();
    });
  }, [fetchCharges, fetchEntities]);

  const handleSave = async () => {
    const url = editingId 
      ? `/api/households/${householdId}/finance/charges/${editingId}`
      : `/api/households/${householdId}/finance/charges`;
    
    const method = editingId ? 'PUT' : 'POST';
    
    // Clean data based on frequency
    const payload = { ...formData };
    if (payload.frequency !== 'monthly' && payload.frequency !== 'quarterly') payload.day_of_month = null;
    if (payload.frequency !== 'weekly') payload.day_of_week = null;
    if (payload.frequency !== 'yearly') payload.month_of_year = null;
    if (payload.frequency !== 'one_off') payload.exact_date = null;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setOpen(false);
        fetchCharges();
        setEditingId(null);
        resetForm();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this charge?')) return;
    try {
      await fetch(`/api/households/${householdId}/finance/charges/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      fetchCharges();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      segment: SEGMENTS[activeTab].id,
      frequency: 'monthly',
      day_of_month: 1,
      day_of_week: 1,
      month_of_year: 1,
      exact_date: '',
      adjust_for_working_day: true,
      notes: '',
      linked_entity_type: 'general',
      linked_entity_id: 1
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
      notes: charge.notes || '',
      linked_entity_type: charge.linked_entity_type || 'general',
      linked_entity_id: charge.linked_entity_id || 1
    });
    setOpen(true);
  };

  const filteredCharges = useMemo(() => {
    const currentSegment = SEGMENTS[activeTab].id;
    return charges.filter(c => c.segment === currentSegment);
  }, [charges, activeTab]);

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const resolveEntityName = (type, id) => {
      if (type === 'general' || !type) return 'Household';
      if (type === 'member') return members.find(m => m.id === id)?.name || 'Member';
      if (type === 'vehicle') {
          const v = vehicles.find(i => i.id === id);
          return v ? `${v.make} ${v.model}` : 'Vehicle';
      }
      if (type === 'asset') return assets.find(a => a.id === id)?.name || 'Asset';
      return type;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography level="h2">Recurring Charges</Typography>
          <Typography level="body-md" color="neutral">
            Manage bills, subscriptions, and regular expenses.
          </Typography>
        </Box>
        <Button startDecorator={<Add />} onClick={() => { resetForm(); setOpen(true); }}>
          Add Charge
        </Button>
      </Box>

      <Tabs 
        value={activeTab} 
        onChange={(e, val) => { setActiveTab(val); resetForm(); }}
        sx={{ bgcolor: 'transparent' }}
      >
        <TabList sx={{ mb: 2, flexWrap: 'wrap' }}>
          {SEGMENTS.map((seg, idx) => (
            <Tab key={seg.id} value={idx}>{seg.label}</Tab>
          ))}
        </TabList>
      </Tabs>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', p: 0, overflow: 'hidden' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Name</th>
              <th>Assigned To</th>
              <th>Frequency</th>
              <th>Schedule</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ width: '100px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredCharges.map(charge => (
              <tr key={charge.id}>
                <td>
                  <Typography fontWeight="lg">{charge.name}</Typography>
                  {charge.notes && <Typography level="body-xs" color="neutral">{charge.notes}</Typography>}
                </td>
                <td>
                    <Chip size="sm" variant="soft">
                        {resolveEntityName(charge.linked_entity_type, charge.linked_entity_id)}
                    </Chip>
                </td>
                <td>
                  <Chip size="sm" variant="plain" color="neutral">
                    {charge.frequency.replace('_', '-')}
                  </Chip>
                </td>
                <td>
                  <Typography level="body-sm">
                    {charge.frequency === 'monthly' && `Day ${charge.day_of_month}`}
                    {charge.frequency === 'weekly' && DAYS_OF_WEEK.find(d => d.id === charge.day_of_week)?.label}
                    {charge.frequency === 'yearly' && `${MONTHS.find(m => m.id === charge.month_of_year)?.label} ${charge.day_of_month}`}
                    {charge.frequency === 'one_off' && charge.exact_date}
                    {charge.adjust_for_working_day && (
                      <Chip size="sm" variant="plain" color="primary" sx={{ ml: 1, fontSize: '0.7em' }}>
                        Work Day
                      </Chip>
                    )}
                  </Typography>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatCurrency(charge.amount, household?.currency)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <IconButton size="sm" variant="plain" onClick={() => handleEdit(charge)}>
                      <Edit />
                    </IconButton>
                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(charge.id)}>
                      <Delete />
                    </IconButton>
                  </Box>
                </td>
              </tr>
            ))}
            {filteredCharges.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  <Typography color="neutral">No charges in this category.</Typography>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>
                {formatCurrency(calculateTotal(filteredCharges), household?.currency)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </Table>
      </Sheet>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
          <ModalClose />
          <Typography level="h4">{editingId ? 'Edit Charge' : 'New Charge'}</Typography>
          <Divider sx={{ my: 2 }} />
          
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input 
                autoFocus 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="e.g. Netflix, Council Tax"
              />
            </FormControl>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl>
                    <FormLabel>Amount</FormLabel>
                    <Input 
                        type="number" 
                        startDecorator={household?.currency === 'USD' ? '$' : '£'}
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    />
                </FormControl>
                <FormControl>
                    <FormLabel>Category</FormLabel>
                    <Select value={formData.segment} onChange={(e, val) => setFormData({ ...formData, segment: val })}>
                        {SEGMENTS.map(s => <Option key={s.id} value={s.id}>{s.label}</Option>)}
                    </Select>
                </FormControl>
            </Box>

            <FormControl>
                <FormLabel>Assign To</FormLabel>
                <Select 
                    value={`${formData.linked_entity_type}_${formData.linked_entity_id}`} 
                    onChange={(e, val) => {
                        const [type, id] = val.split('_');
                        setFormData({ ...formData, linked_entity_type: type, linked_entity_id: parseInt(id) });
                    }}
                >
                    <Option value="general_1">🏠 Household (General)</Option>
                    <Divider>Members</Divider>
                    {members.map(m => <Option key={m.id} value={`member_${m.id}`}>{m.emoji} {m.name}</Option>)}
                    <Divider>Vehicles</Divider>
                    {vehicles.map(v => <Option key={v.id} value={`vehicle_${v.id}`}>{v.emoji || '🚗'} {v.make} {v.model}</Option>)}
                    <Divider>Assets</Divider>
                    {assets.map(a => <Option key={a.id} value={`asset_${a.id}`}>{a.emoji || '📦'} {a.name}</Option>)}
                </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Frequency</FormLabel>
              <Select value={formData.frequency} onChange={(e, val) => setFormData({ ...formData, frequency: val })}>
                {FREQUENCIES.map(f => <Option key={f.id} value={f.id}>{f.label}</Option>)}
              </Select>
            </FormControl>

            {/* DYNAMIC SCHEDULING INPUTS */}
            <Box sx={{ p: 2, bgcolor: 'background.level1', borderRadius: 'sm' }}>
                <Typography level="title-sm" mb={1}>Schedule</Typography>
                
                {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
                    <FormControl>
                        <FormLabel>Day of Month</FormLabel>
                        <Select 
                            value={formData.day_of_month} 
                            onChange={(e, val) => setFormData({ ...formData, day_of_month: val })}
                            sx={{ maxHeight: 200 }}
                        >
                            {[...Array(31)].map((_, i) => (
                                <Option key={i+1} value={i+1}>{i+1}</Option>
                            ))}
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
                            <Select 
                                value={formData.day_of_month} 
                                onChange={(e, val) => setFormData({ ...formData, day_of_month: val })}
                            >
                                {[...Array(31)].map((_, i) => (
                                    <Option key={i+1} value={i+1}>{i+1}</Option>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                )}

                {formData.frequency === 'one_off' && (
                    <FormControl>
                        <FormLabel>Date</FormLabel>
                        <Input 
                            type="date" 
                            value={formData.exact_date} 
                            onChange={e => setFormData({ ...formData, exact_date: e.target.value })} 
                        />
                    </FormControl>
                )}

                {formData.frequency !== 'one_off' && (
                    <Checkbox 
                        sx={{ mt: 2 }} 
                        label="Adjust for next working day" 
                        checked={formData.adjust_for_working_day}
                        onChange={e => setFormData({ ...formData, adjust_for_working_day: e.target.checked })}
                    />
                )}
            </Box>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Input 
                value={formData.notes} 
                onChange={e => setFormData({ ...formData, notes: e.target.value })} 
              />
            </FormControl>

            <Button size="lg" onClick={handleSave} color="primary">
              {editingId ? 'Save Changes' : 'Create Charge'}
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
}