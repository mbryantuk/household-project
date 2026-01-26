import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, Typography, IconButton, Button, Modal, ModalDialog, DialogTitle, 
  DialogContent, DialogActions, Input, FormControl, FormLabel, 
  Select, Option, Stack, Table, Sheet, Chip, CircularProgress, Checkbox, Textarea, Divider, Grid
} from '@mui/joy';
import { Add, Edit, Delete, ReceiptLong, CalendarMonth } from '@mui/icons-material';
import { format, addMonths, setDate, isWeekend, startOfDay, isBefore, addDays, setDay, parseISO } from 'date-fns';

const HOUSEHOLD_SEGMENTS = [
  { value: 'household_bill', label: 'Household Bill' },
  { value: 'utility', label: 'Utility (Water/Gas/Elec)' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'insurance', label: 'Insurance Bill' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'other', label: 'Other Charge' }
];

const VEHICLE_SEGMENTS = [
  { value: 'vehicle_tax', label: 'Vehicle Tax' },
  { value: 'vehicle_mot', label: 'Vehicle MOT' },
  { value: 'vehicle_service', label: 'Vehicle Service' },
  { value: 'vehicle_fuel', label: 'Fuel' },
  { value: 'insurance', label: 'Vehicle Insurance' },
  { value: 'warranty', label: 'Vehicle Warranty' },
  { value: 'other', label: 'Other Vehicle Charge' }
];

const MEMBER_SEGMENTS = [
  { value: 'subscription', label: 'Personal Subscription' },
  { value: 'insurance', label: 'Life/Health Insurance' },
  { value: 'other', label: 'Personal Charge' }
];

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_off', label: 'One-off' }
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

export default function RecurringCostsWidget({ api, householdId, parentType, parentId, showNotification, isAdmin }) {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [isNearestWorkingDay, setIsNearestWorkingDay] = useState(false);
  const [holidays, setHolidays] = useState([]);
  
  const apiEntityType = parentType === 'house' ? 'general' : parentType;

  const segments = useMemo(() => {
      if (parentType === 'vehicle') return VEHICLE_SEGMENTS;
      if (parentType === 'member' || parentType === 'pet') return MEMBER_SEGMENTS;
      return HOUSEHOLD_SEGMENTS;
  }, [parentType]);

  const fetchCosts = useCallback(async () => {
    setLoading(true);
    try {
      const [res, holRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/charges`),
          api.get('/system/holidays')
      ]);
      
      const filtered = (res.data || []).filter(c => 
        c.linked_entity_type === apiEntityType && 
        String(c.linked_entity_id) === String(parentId)
      );
      setCosts(filtered);
      setHolidays(holRes.data || []);
    } catch (err) {
      console.error("Failed to fetch recurring charges", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, apiEntityType, parentId]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  useEffect(() => {
    if (editItem) {
      setIsNearestWorkingDay(Boolean(editItem.adjust_for_working_day));
    } else {
      setIsNearestWorkingDay(true); 
    }
  }, [editItem]);

  const calculateNextDate = (item) => {
      const today = startOfDay(new Date());
      let date;

      if (item.frequency === 'monthly') {
          if (!item.day_of_month) return null;
          date = setDate(today, parseInt(item.day_of_month));
          if (isBefore(date, today)) date = addMonths(date, 1);
      } else if (item.frequency === 'weekly') {
          if (item.day_of_week === undefined || item.day_of_week === null) return null;
          const targetDay = parseInt(item.day_of_week);
          date = setDay(today, targetDay, { weekStartsOn: 0 });
          if (isBefore(date, today)) date = addDays(date, 7);
      } else if (item.frequency === 'one_off' && item.exact_date) {
          date = parseISO(item.exact_date);
      } else {
          return null;
      }

      if (item.adjust_for_working_day) {
          const isNonWorking = (d) => isWeekend(d) || holidays.includes(format(d, 'yyyy-MM-dd'));
          while (isNonWorking(date)) {
              date = addDays(date, 1);
          }
      }
      return date;
  };

  const groupedCosts = useMemo(() => {
      const groups = {};
      costs.forEach(c => {
          const segLabel = segments?.find(s => s.value === c.segment)?.label || 'Other Charge';
          if (!groups[segLabel]) groups[segLabel] = [];
          groups[segLabel].push(c);
      });
      return groups;
  }, [costs, segments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    data.linked_entity_type = apiEntityType;
    data.linked_entity_id = parentId;
    data.adjust_for_working_day = isNearestWorkingDay ? 1 : 0;
    
    if (data.frequency === 'monthly') {
        data.day_of_month = parseInt(data.payment_day);
    } else if (data.frequency === 'weekly') {
        data.day_of_week = parseInt(data.payment_day); 
    } else if (data.frequency === 'one_off') {
        data.exact_date = data.payment_day; 
    }

    try {
      if (editItem.id) {
        await api.put(`/households/${householdId}/finance/charges/${editItem.id}`, data);
        showNotification("Charge updated.", "success");
      } else {
        await api.post(`/households/${householdId}/finance/charges`, data);
        showNotification("Charge added.", "success");
      }
      fetchCosts();
      setEditItem(null);
    } catch {
      showNotification("Failed to save charge.", "danger");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this charge from the repository?")) return;
    try {
      await api.delete(`/households/${householdId}/finance/charges/${id}`);
      showNotification("Charge removed.", "neutral");
      fetchCosts();
    } catch {
      showNotification("Failed to delete.", "danger");
    }
  };

  if (loading && costs.length === 0) return <CircularProgress size="sm" />;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography level="title-lg" startDecorator={<ReceiptLong color="primary" />}>
            Repository of Charges
        </Typography>
        {isAdmin && (
            <Button size="sm" variant="solid" startDecorator={<Add />} onClick={() => setEditItem({})}>Add New Charge</Button>
        )}
      </Box>

      {costs.length === 0 ? (
        <Sheet variant="soft" sx={{ p: 4, textAlign: 'center', borderRadius: 'md' }}>
            <Typography level="body-md" color="neutral">No recurring charges recorded for this asset.</Typography>
        </Sheet>
      ) : (
        <Stack spacing={4}>
            {Object.entries(groupedCosts).sort().map(([category, items]) => (
                <Box key={category}>
                    <Typography level="title-md" color="primary" sx={{ mb: 1.5, ml: 0.5, borderBottom: '2px solid', borderColor: 'primary.softBg', pb: 0.5, width: 'fit-content' }}>
                        {category}
                    </Typography>
                    <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
                        <Table hoverRow>
                            <thead>
                                <tr>
                                    <th style={{ width: '35%' }}>Description</th>
                                    <th>Frequency</th>
                                    <th>Next Payment Date</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    {isAdmin && <th style={{ width: 100 }}></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row) => {
                                    const nextDate = calculateNextDate(row);
                                    return (
                                        <tr key={row.id}>
                                            <td>
                                                <Typography level="body-sm" fontWeight="bold">{row.name}</Typography>
                                                {row.notes && <Typography level="body-xs" color="neutral">{row.notes}</Typography>}
                                            </td>
                                            <td>
                                                <Chip size="sm" variant="soft" color="neutral" sx={{ textTransform: 'capitalize' }}>{row.frequency}</Chip>
                                                <Typography level="body-xs" color="neutral" sx={{ mt: 0.5 }}>
                                                    {row.frequency === 'monthly' && `Every ${row.day_of_month}${row.day_of_month === 1 ? 'st' : row.day_of_month === 2 ? 'nd' : row.day_of_month === 3 ? 'rd' : 'th'}`}
                                                    {row.frequency === 'weekly' && `Every ${DAYS_OF_WEEK.find(d => d.id === row.day_of_week)?.label}`}
                                                </Typography>
                                            </td>
                                            <td>
                                                {nextDate ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <CalendarMonth sx={{ fontSize: '1rem', color: 'primary.plainColor' }} />
                                                        <Typography level="body-sm" fontWeight="lg">
                                                            {format(nextDate, 'EEEE do MMMM yyyy')}
                                                        </Typography>
                                                    </Box>
                                                ) : <Typography level="body-xs" color="neutral">-</Typography>}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <Typography level="title-md" sx={{ fontFamily: 'monospace' }}>£{parseFloat(row.amount).toFixed(2)}</Typography>
                                            </td>
                                            {isAdmin && (
                                                <td style={{ textAlign: 'right' }}>
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                        <IconButton size="sm" variant="plain" onClick={() => setEditItem(row)}><Edit /></IconButton>
                                                        <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(row.id)}><Delete /></IconButton>
                                                    </Box>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </Sheet>
                </Box>
            ))}
        </Stack>
      )}

      <Modal open={Boolean(editItem)} onClose={() => setEditItem(null)}>
        <ModalDialog sx={{ maxWidth: 450, width: '100%' }}>
            <DialogTitle>{editItem?.id ? 'Edit Charge' : 'Add Recurring Charge'}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl required>
                            <FormLabel>Name / Description</FormLabel>
                            <Input name="name" defaultValue={editItem?.name} placeholder="e.g. Council Tax, Netflix" />
                        </FormControl>
                        <FormControl required>
                            <FormLabel>Amount (£)</FormLabel>
                            <Input name="amount" type="number" step="0.01" defaultValue={editItem?.amount} startDecorator="£" />
                        </FormControl>
                        
                        <Grid container spacing={2}>
                            <Grid xs={6}>
                                <FormControl required>
                                    <FormLabel>Segment</FormLabel>
                                    <Select name="segment" defaultValue={editItem?.segment || 'other'}>
                                        {segments.map(s => <Option key={s.value} value={s.value}>{s.label}</Option>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid xs={6}>
                                <FormControl required>
                                    <FormLabel>Frequency</FormLabel>
                                    <Select name="frequency" defaultValue={editItem?.frequency || 'monthly'}>
                                        {FREQUENCIES.map(f => <Option key={f.value} value={f.value}>{f.label}</Option>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <FormControl required>
                            <FormLabel>Payment Day / Date</FormLabel>
                            <Input 
                                name="payment_day" 
                                defaultValue={editItem?.day_of_month || editItem?.day_of_week || editItem?.exact_date} 
                                placeholder="1-31 (Monthly) or 0-6 (Weekly) or YYYY-MM-DD"
                            />
                        </FormControl>
                        
                        <Checkbox 
                            label="Adjust for next working day" 
                            checked={isNearestWorkingDay} 
                            onChange={e => setIsNearestWorkingDay(e.target.checked)}
                            sx={{ mt: 1 }}
                        />

                        <FormControl>
                            <FormLabel>Notes</FormLabel>
                            <Textarea name="notes" defaultValue={editItem?.notes} minRows={2} placeholder="Optional notes..." />
                        </FormControl>

                        <Divider sx={{ my: 1 }} />

                        <DialogActions>
                            <Button variant="plain" color="neutral" onClick={() => setEditItem(null)}>Cancel</Button>
                            <Button type="submit" variant="solid" color="primary">Save Charge to Repository</Button>
                        </DialogActions>
                    </Stack>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
