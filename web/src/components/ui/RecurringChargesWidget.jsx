import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, Sheet, Typography, Button, Table, IconButton, 
  Modal, ModalDialog, FormControl, FormLabel, Input, 
  Select, Option, Stack, Chip, Divider, DialogTitle,
  Tabs, TabList, Tab, Avatar, DialogContent, Grid
} from '@mui/joy';
import { 
  Add, Edit, Delete, Receipt, Shield, ShoppingBag, ElectricBolt, 
  Build, LocalGasStation, HelpOutline,
  Assignment, Payments, Timer, AccountBalanceWallet, LocalActivity
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../EmojiPicker';
import MetadataFormFields from './MetadataFormFields';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch { return `£${num.toFixed(2)}`; }
};

const SEGMENT_CONFIG = {
    household_bill: { label: 'Bills', icon: <Assignment /> },
    insurance: { label: 'Insurance', icon: <Shield /> },
    utility: { label: 'Utilities', icon: <ElectricBolt /> },
    subscription: { label: 'Subscriptions', icon: <ShoppingBag /> },
    warranty: { label: 'Warranties', icon: <Assignment /> },
    service: { label: 'Service / Maintenance', icon: <Build /> },
    water: { label: 'Water', icon: <ElectricBolt /> },
    energy: { label: 'Energy', icon: <ElectricBolt /> },
    council: { label: 'Council Tax', icon: <Assignment /> },
    waste: { label: 'Waste Collection', icon: <Build /> },
    vehicle_finance: { label: 'Finance', icon: <Payments /> },
    vehicle_insurance: { label: 'Insurance', icon: <Shield /> },
    vehicle_service: { label: 'Service / Plan', icon: <Build /> },
    vehicle_tax: { label: 'Tax', icon: <Timer /> },
    vehicle_mot: { label: 'MOT', icon: <Build /> },
    vehicle_fuel: { label: 'Fuel', icon: <LocalGasStation /> },
    vehicle_breakdown: { label: 'Breakdown', icon: <HelpOutline /> },
    pocket_money: { label: 'Pocket Money', icon: <AccountBalanceWallet /> },
    fun_money: { label: 'Fun Money', icon: <LocalActivity /> },
    food: { label: 'Food & Supplies', icon: <ShoppingBag /> },
    vet: { label: 'Vet & Medical', icon: <Shield /> },
    education: { label: 'Education', icon: <Assignment /> },
    care: { label: 'Care & Support', icon: <HelpOutline /> },
    finance: { label: 'Finance / Loan', icon: <Payments /> },
    loan: { label: 'Loan', icon: <Payments /> },
    agreement: { label: 'Agreement', icon: <Payments /> },
    mortgage: { label: 'Mortgage', icon: <Payments /> },
    other: { label: 'Other', icon: <Receipt /> }
};

export default function RecurringChargesWidget({ 
    api, householdId, household, entityType, entityId, 
    segments = [{ id: 'other', label: 'Other' }],
    title = "Costs & Expenses", showNotification, confirmAction
}) {
  const [charges, setCharges] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '', amount: '', category_id: segments[0]?.id || 'other',
    frequency: 'monthly', start_date: format(new Date(), 'yyyy-MM-dd'),
    adjust_for_working_day: true, bank_account_id: null, notes: '', emoji: '💸', metadata: {}
  });

  const fetchData = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const [chargeRes, accRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/recurring-costs`, {
            params: { object_type: entityType, object_id: entityId }
          }),
          api.get(`/households/${householdId}/finance/current-accounts`)
      ]);
      setCharges(chargeRes.data);
      setAccounts(accRes.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api, householdId, entityType, entityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentSegmentId = segments[activeTab]?.id || 'other';
  const filteredCharges = useMemo(() => charges.filter(c => {
    if (currentSegmentId === 'other') {
        return !c.category_id || c.category_id === 'other';
    }
    return c.category_id === currentSegmentId;
  }), [charges, currentSegmentId]);

  const resetForm = () => {
    setFormData({
      name: '', amount: '', category_id: currentSegmentId,
      frequency: 'monthly', start_date: format(new Date(), 'yyyy-MM-dd'),
      adjust_for_working_day: true, 
      bank_account_id: accounts.length > 0 ? accounts[0].id : null, 
      notes: '', emoji: '💸', metadata: {}
    });
  };

  const handleEdit = (charge) => {
    setEditingId(charge.id);
    setFormData({
      name: charge.name, amount: charge.amount, category_id: charge.category_id || 'other',
      frequency: charge.frequency, start_date: charge.start_date || format(new Date(), 'yyyy-MM-dd'),
      adjust_for_working_day: !!charge.adjust_for_working_day, 
      bank_account_id: charge.bank_account_id || (accounts.length > 0 ? accounts[0].id : null),
      notes: charge.notes || '',
      emoji: charge.emoji || '💸', metadata: charge.metadata || {}
    });
    setOpen(true);
  };

  const handleSave = async () => {
      if (!formData.bank_account_id && accounts.length > 0) {
          showNotification("Please select a bank account.", "warning");
          return;
      }
      try {
          const url = editingId 
            ? `/households/${householdId}/finance/recurring-costs/${editingId}` 
            : `/households/${householdId}/finance/recurring-costs`;
          
          const payload = { 
            ...formData, 
            object_type: entityType, 
            object_id: entityId 
          };

          await api[editingId ? 'put' : 'post'](url, payload);
          showNotification(editingId ? "Updated." : "Created.", "success");
          setOpen(false); setEditingId(null); fetchData();
      } catch { showNotification("Error saving.", "danger"); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography level="title-lg" startDecorator={<Payments />}>{title}</Typography>
        <Button size="sm" variant="solid" startDecorator={<Add />} onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}>Add</Button>
      </Box>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
        <TabList variant="soft" sx={{ p: 0.5, gap: 0.5, borderRadius: 'md', mb: 2 }}>
          {segments.map((seg, idx) => (
            <Tab key={seg.id} variant={activeTab === idx ? 'solid' : 'plain'} color={activeTab === idx ? 'primary' : 'neutral'}>
              {SEGMENT_CONFIG[seg.id]?.icon || <Receipt />}
              <Box component="span" sx={{ ml: 1, display: { xs: 'none', sm: 'inline' } }}>{seg.label}</Box>
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table size="sm" hoverRow>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Expense</th>
              <th>Frequency</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredCharges.map(c => (
              <tr key={c.id}>
                <td>
                    <Avatar size="sm" sx={{ bgcolor: getEmojiColor(c.emoji) }}>{c.emoji || '💸'}</Avatar></td>
                <td>
                    <Typography level="body-sm" fontWeight="bold">{c.name}</Typography>
                    <Typography level="body-xs" color="neutral">{(c.start_date && typeof c.start_date === 'string') ? format(parseISO(c.start_date), 'do MMM') : 'No date'}</Typography>
                </td>
                <td><Typography level="body-xs" sx={{ textTransform: 'capitalize' }}>{c.frequency}</Typography></td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(c.amount, household?.currency)}</td>
                <td>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="sm" variant="plain" onClick={() => handleEdit(c)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="sm" variant="plain" color="danger" onClick={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/recurring-costs/${c.id}`).then(fetchCharges))}><Delete fontSize="small" /></IconButton>
                    </Box>
                </td>
              </tr>
            ))}
            {filteredCharges.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', py: 4 }}><Typography level="body-xs" color="neutral">No items in this category.</Typography></td></tr>
            )}
          </tbody>
        </Table>
      </Sheet>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
            <Box sx={{ position: 'relative' }}>
                <Avatar 
                    size="lg" 
                    sx={{ '--Avatar-size': '64px', bgcolor: getEmojiColor(formData.emoji), fontSize: '2rem', cursor: 'pointer' }} 
                    onClick={() => setEmojiPickerOpen(true)}
                >
                    {formData.emoji}
                </Avatar>
                <IconButton 
                    size="sm" 
                    variant="solid" 
                    color="primary" 
                    sx={{ position: 'absolute', bottom: -4, right: -4, borderRadius: '50%', border: '2px solid', borderColor: 'background.surface' }} 
                    onClick={() => setEmojiPickerOpen(true)}
                >
                    <Edit sx={{ fontSize: '0.8rem' }} />
                </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1, pt: 0.5 }}>
                <Typography level="title-lg">{editingId ? 'Edit Recurring Cost' : 'Add Recurring Cost'}</Typography>
                <Typography level="body-sm" color="neutral">Manage this recurring financial obligation.</Typography>
            </Box>
          </Box>
          <Divider />
          <DialogContent sx={{ overflowX: 'hidden' }}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <FormControl required>
                    <FormLabel>Name</FormLabel>
                    <Input autoFocus value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </FormControl>
                
                <Grid container spacing={2}>
                    <Grid xs={12} sm={4}>
                        <FormControl required>
                            <FormLabel>Category</FormLabel>
                            <Select value={formData.category_id} onChange={(e, v) => setFormData({ ...formData, category_id: v })}>
                                {segments.map(seg => (
                                    <Option key={seg.id} value={seg.id}>{seg.label}</Option>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid xs={12} sm={4}>
                        <FormControl required>
                            <FormLabel>Amount</FormLabel>
                            <Input type="number" startDecorator={household?.currency === '$' ? '$' : '£'} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                        </FormControl>
                    </Grid>
                    <Grid xs={12} sm={4}>
                        <FormControl required={accounts.length > 0}>
                            <FormLabel>Bank Account</FormLabel>
                            <Select 
                                value={formData.bank_account_id} 
                                onChange={(e, v) => setFormData({ ...formData, bank_account_id: v })}
                                placeholder={accounts.length === 0 ? "No accounts available" : "Select Account"}
                                disabled={accounts.length === 0}
                            >
                                {accounts.map(acc => (
                                    <Option key={acc.id} value={acc.id}>
                                        {acc.emoji} {acc.account_name}
                                    </Option>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <Grid container spacing={2}>
                    <Grid xs={12} sm={6}>
                        <FormControl required>
                            <FormLabel>Frequency</FormLabel>
                            <Select value={formData.frequency} onChange={(e, v) => setFormData({ ...formData, frequency: v })}>
                                <Option value="monthly">Monthly</Option><Option value="weekly">Weekly</Option>
                                <Option value="quarterly">Quarterly</Option><Option value="yearly">Yearly</Option><Option value="one_off">One-off</Option>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid xs={12} sm={6}>
                        <FormControl required>
                            <FormLabel>Start Date</FormLabel>
                            <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                        </FormControl>
                    </Grid>
                </Grid>

                <MetadataFormFields 
                    categoryId={formData.category_id} 
                    metadata={formData.metadata} 
                    onChange={(newMeta) => setFormData(prev => ({ ...prev, metadata: newMeta }))}
                    customSchema={household?.metadata_schema ? JSON.parse(household.metadata_schema) : null}
                />

                <Button size="lg" onClick={handleSave} variant="solid" sx={{ mt: 2 }}>{editingId ? 'Update Cost' : 'Create Cost'}</Button>
              </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>
      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} title="Select Icon" />
    </Box>
  );
}