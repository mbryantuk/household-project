import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Sheet, Typography, Button, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Select, Option, Checkbox, Tabs, TabList, Tab, Stack, Chip, Divider
} from '@mui/joy';
import { Add, Edit, Delete } from '@mui/icons-material';
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
    } catch {
        return `£${num.toFixed(2)}`;
    }
};

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

export default function ChargesView({ initialTab }) {
  const { household, api } = useOutletContext();
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

  const [members, setMembers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assets, setAssets] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    segment: 'household_bill',
    frequency: 'monthly',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    adjust_for_working_day: true,
    notes: '',
    linked_entity_type: 'general',
    linked_entity_id: householdId
  });

  const fetchCharges = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await api.get(`/households/${householdId}/finance/charges`);
      setCharges(res.data || []);
    } catch (err) { console.error(err); }
  }, [householdId, api]);

  const fetchEntities = useCallback(async () => {
      if (!householdId) return;
      try {
          const [mRes, vRes, aRes] = await Promise.all([
              api.get(`/households/${householdId}/members`),
              api.get(`/households/${householdId}/vehicles`),
              api.get(`/households/${householdId}/assets`)
          ]);
          setMembers(mRes.data || []);
          setVehicles(vRes.data || []);
          setAssets(aRes.data || []);
      } catch (err) { console.error(err); }
  }, [householdId, api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCharges();
    fetchEntities();
  }, [fetchCharges, fetchEntities]);

  const handleSave = async () => {
    const url = editingId 
      ? `/households/${householdId}/finance/charges/${editingId}`
      : `/households/${householdId}/finance/charges`;
    
    const method = editingId ? 'put' : 'post';
    const payload = { ...formData };

    try {
      await api[method](url, payload);
      setOpen(false);
      fetchCharges();
      setEditingId(null);
      resetForm();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/households/${householdId}/finance/charges/${id}`);
      fetchCharges();
    } catch (err) { console.error(err); }
  };

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      amount: '',
      segment: SEGMENTS[activeTab].id,
      frequency: 'monthly',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      adjust_for_working_day: true,
      notes: '',
      linked_entity_type: 'general',
      linked_entity_id: householdId
    });
  }, [activeTab, householdId]);

  const handleEdit = (charge) => {
    setEditingId(charge.id);
    setFormData({
      name: charge.name,
      amount: charge.amount,
      segment: charge.segment,
      frequency: charge.frequency,
      start_date: charge.start_date || charge.exact_date || format(new Date(), 'yyyy-MM-dd'),
      adjust_for_working_day: !!charge.adjust_for_working_day,
      notes: charge.notes || '',
      linked_entity_type: charge.linked_entity_type || 'general',
      linked_entity_id: charge.linked_entity_id || householdId
    });
    setOpen(true);
  };

  const filteredCharges = useMemo(() => {
    const currentSegment = SEGMENTS[activeTab].id;
    return charges.filter(c => c.segment === currentSegment);
  }, [charges, activeTab]);

  const calculateTotal = (items) => items.reduce((sum, item) => sum + (item.amount || 0), 0);

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
          <Typography level="body-md" color="neutral">Manage bills and regular expenses.</Typography>
        </Box>
        <Button startDecorator={<Add />} onClick={() => { resetForm(); setOpen(true); }}>Add Charge</Button>
      </Box>

      <Tabs value={activeTab} onChange={(e, val) => { setActiveTab(val); resetForm(); }} sx={{ bgcolor: 'transparent' }}>
        <TabList sx={{ mb: 2, flexWrap: 'wrap' }}>
          {SEGMENTS.map((seg, idx) => <Tab key={seg.id} value={idx}>{seg.label}</Tab>)}
        </TabList>
      </Tabs>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', p: 0, overflow: 'hidden' }}>
        <Table hoverRow stickyHeader>
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Name</th>
              <th>Assigned To</th>
              <th>Frequency</th>
              <th>Next/Start Date</th>
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
                <td><Chip size="sm" variant="soft">{resolveEntityName(charge.linked_entity_type, charge.linked_entity_id)}</Chip></td>
                <td><Chip size="sm" variant="plain" color="neutral" sx={{ textTransform: 'capitalize' }}>{charge.frequency}</Chip></td>
                <td>
                  <Typography level="body-sm">
                    {charge.start_date ? format(parseISO(charge.start_date), 'do MMM yyyy') : 'Not set'}
                    {charge.adjust_for_working_day && <Chip size="sm" variant="plain" color="primary" sx={{ ml: 1, fontSize: '0.7em' }}>NWD</Chip>}
                  </Typography>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(charge.amount, household?.currency)}</td>
                <td style={{ textAlign: 'right' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <IconButton size="sm" variant="plain" onClick={() => handleEdit(charge)}><Edit /></IconButton>
                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(charge.id)}><Delete /></IconButton>
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>{formatCurrency(calculateTotal(filteredCharges), household?.currency)}</td>
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
            <FormControl required><FormLabel>Name</FormLabel><Input autoFocus value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required><FormLabel>Amount</FormLabel><Input type="number" startDecorator={household?.currency === 'USD' ? '$' : '£'} value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })} /></FormControl>
                <FormControl required><FormLabel>Category</FormLabel>
                    <Select value={formData.segment} onChange={(e, val) => setFormData({ ...formData, segment: val })}>{SEGMENTS.map(s => <Option key={s.id} value={s.id}>{s.label}</Option>)}</Select>
                </FormControl>
            </Box>
            <FormControl required><FormLabel>Frequency</FormLabel>
              <Select value={formData.frequency} onChange={(e, val) => setFormData({ ...formData, frequency: val })}>{FREQUENCIES.map(f => <Option key={f.id} value={f.id}>{f.label}</Option>)}</Select>
            </FormControl>
            <FormControl required><FormLabel>Start Date / Anchor Date</FormLabel><Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} /></FormControl>
            <Checkbox label="Adjust for next working day" checked={formData.adjust_for_working_day} onChange={e => setFormData({ ...formData, adjust_for_working_day: e.target.checked })} />
            <FormControl><FormLabel>Assign To</FormLabel>
                <Select value={`${formData.linked_entity_type}_${formData.linked_entity_id}`} onChange={(e, val) => { const [type, id] = val.split('_'); setFormData({ ...formData, linked_entity_type: type, linked_entity_id: parseInt(id) }); }}>
                    <Option value={`general_${householdId}`}>🏠 Household</Option>
                    <Divider>Members</Divider>{members.map(m => <Option key={m.id} value={`member_${m.id}`}>{m.emoji} {m.name}</Option>)}
                    <Divider>Vehicles</Divider>{vehicles.map(v => <Option key={v.id} value={`vehicle_${v.id}`}>{v.emoji || '🚗'} {v.make} {v.model}</Option>)}
                    <Divider>Assets</Divider>{assets.map(a => <Option key={a.id} value={`asset_${a.id}`}>{a.emoji || '📦'} {a.name}</Option>)}
                </Select>
            </FormControl>
            <Button size="lg" onClick={handleSave} color="primary">{editingId ? 'Save Changes' : 'Create Charge'}</Button>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
}