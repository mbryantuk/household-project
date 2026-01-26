import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, Typography, IconButton, Button, Modal, ModalDialog, DialogTitle, 
  DialogContent, DialogActions, Input, FormControl, FormLabel, 
  Select, Option, Stack, Table, Sheet, Chip, CircularProgress, Switch, Textarea, Divider, Checkbox
} from '@mui/joy';
import { Add, Edit, Delete, ReceiptLong } from '@mui/icons-material';
import { format, addMonths, setDate, isWeekend, startOfDay, isBefore, addDays } from 'date-fns';

const SEGMENTS = [
  { value: 'household_bill', label: 'Household Bill' },
  { value: 'utility', label: 'Utility' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'vehicle_tax', label: 'Vehicle Tax' },
  { value: 'vehicle_mot', label: 'Vehicle MOT' },
  { value: 'vehicle_service', label: 'Vehicle Service' },
  { value: 'vehicle_fuel', label: 'Vehicle Fuel' },
  { value: 'other', label: 'Other' }
];

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_off', label: 'One-off' }
];

export default function RecurringCostsWidget({ api, householdId, parentType, parentId, showNotification, isAdmin }) {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [isNearestWorkingDay, setIsNearestWorkingDay] = useState(false);
  const [holidays, setHolidays] = useState([]);
  
  // Map 'house' -> 'general' for backend compatibility
  const apiEntityType = parentType === 'house' ? 'general' : parentType;

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

  const groupedCosts = useMemo(() => {
      const groups = {};
      costs.forEach(c => {
          const seg = c.segment ? c.segment.replace('_', ' ') : 'Other';
          const cat = seg.charAt(0).toUpperCase() + seg.slice(1);
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(c);
      });
      return groups;
  }, [costs]);

  const getNextPaymentDate = (day, useNwd) => {
      if (!day) return null;
      const today = startOfDay(new Date());
      // Simple logic for monthly. Weekly/Yearly needs more complex logic, 
      // but this covers the 80% case for the widget display.
      let date = setDate(today, parseInt(day));

      if (isBefore(date, today)) {
          date = addMonths(date, 1);
      }

      if (useNwd) {
          const isNonWorking = (d) => isWeekend(d) || holidays.includes(format(d, 'yyyy-MM-dd'));
          if (isNonWorking(date)) {
              let safeCounter = 0;
              while (isNonWorking(date) && safeCounter < 10) {
                  date = addDays(date, 1);
                  safeCounter++;
              }
          }
      }
      return date;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    data.linked_entity_type = apiEntityType;
    data.linked_entity_id = parentId;
    data.adjust_for_working_day = isNearestWorkingDay ? 1 : 0;
    
    // Frequency Handling
    if (data.frequency === 'monthly') {
        data.day_of_month = parseInt(data.payment_day);
    } else if (data.frequency === 'weekly') {
        data.day_of_week = parseInt(data.payment_day); 
    } else if (data.frequency === 'yearly') {
        data.day_of_month = parseInt(data.payment_day);
        data.month_of_year = 1; 
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
    if (!window.confirm("Delete this charge?")) return;
    try {
      await api.delete(`/households/${householdId}/finance/charges/${id}`);
      showNotification("Charge deleted.", "neutral");
      fetchCosts();
    } catch {
      showNotification("Failed to delete charge.", "danger");
    }
  };

  if (loading && costs.length === 0) return <CircularProgress size="sm" />;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography level="title-md" startDecorator={<ReceiptLong color="primary" />}>
            Recurring Charges
        </Typography>
        {isAdmin && (
            <Button size="sm" variant="outlined" startDecorator={<Add />} onClick={() => setEditItem({})}>Add Charge</Button>
        )}
      </Box>

      {costs.length === 0 ? (
        <Typography level="body-sm" color="neutral" sx={{ fontStyle: 'italic' }}>No recurring charges recorded.</Typography>
      ) : (
        <Stack spacing={3}>
            {Object.entries(groupedCosts).sort().map(([category, items]) => (
                <Box key={category}>
                    <Typography level="title-sm" color="primary" sx={{ mb: 1, ml: 0.5 }}>{category}</Typography>
                    <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
                        <Table hoverRow size="sm">
                            <thead>
                                <tr>
                                    <th style={{ width: '40%' }}>Name</th>
                                    <th>Amount</th>
                                    <th>Frequency</th>
                                    {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row) => {
                                    // Calculate Next Date for display
                                    // Use day_of_month if available, else try logic for others
                                    let nextDate = null;
                                    let dayDisplay = '-';
                                    
                                    if (row.frequency === 'monthly' && row.day_of_month) {
                                        nextDate = getNextPaymentDate(row.day_of_month, row.adjust_for_working_day);
                                        dayDisplay = `Day ${row.day_of_month}`;
                                    } else if (row.frequency === 'weekly' && row.day_of_week) {
                                        dayDisplay = `Day ${row.day_of_week}`; // Could map to Mon/Tue etc
                                    } else if (row.frequency === 'one_off') {
                                        dayDisplay = row.exact_date;
                                    }

                                    return (
                                        <tr key={row.id}>
                                            <td>
                                                <Typography level="body-sm" fontWeight="bold">{row.name}</Typography>
                                                {row.notes && <Typography level="body-xs" color="neutral">{row.notes}</Typography>}
                                            </td>
                                            <td>£{parseFloat(row.amount).toFixed(2)}</td>
                                            <td>
                                                <Chip size="sm" variant="outlined">{row.frequency}</Chip>
                                                <Box>
                                                    <Typography level="body-xs" color="neutral">{dayDisplay}</Typography>
                                                    {nextDate && (
                                                        <Typography level="body-xs" color="primary">Next: {format(nextDate, 'EEE do MMM')}</Typography>
                                                    )}
                                                </Box>
                                            </td>
                                            {isAdmin && (
                                                <td style={{ textAlign: 'right' }}>
                                                    <IconButton size="sm" variant="plain" onClick={() => setEditItem(row)}><Edit fontSize="inherit" /></IconButton>
                                                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(row.id)}><Delete fontSize="inherit" /></IconButton>
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
        <ModalDialog sx={{ maxWidth: 400, width: '100%' }}>
            <DialogTitle>{editItem?.id ? 'Edit Charge' : 'Add Recurring Charge'}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl required>
                            <FormLabel>Name</FormLabel>
                            <Input name="name" defaultValue={editItem?.name} />
                        </FormControl>
                        <FormControl required>
                            <FormLabel>Amount (£)</FormLabel>
                            <Input name="amount" type="number" step="0.01" defaultValue={editItem?.amount} />
                        </FormControl>
                        
                        <FormControl>
                            <FormLabel>Segment</FormLabel>
                            <Select name="segment" defaultValue={editItem?.segment || 'other'}>
                                {SEGMENTS.map(s => <Option key={s.value} value={s.value}>{s.label}</Option>)}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Frequency</FormLabel>
                            <Select name="frequency" defaultValue={editItem?.frequency || 'monthly'}>
                                {FREQUENCIES.map(f => <Option key={f.value} value={f.value}>{f.label}</Option>)}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Day (Month/Week) or Date</FormLabel>
                            <Input 
                                name="payment_day" 
                                type="number" 
                                defaultValue={editItem?.day_of_month || editItem?.day_of_week} 
                                placeholder="Day number (1-31) or (0-6)"
                            />
                        </FormControl>
                        
                        <Checkbox 
                            label="Adjust for next working day" 
                            checked={isNearestWorkingDay} 
                            onChange={e => setIsNearestWorkingDay(e.target.checked)}
                        />

                        <FormControl>
                            <FormLabel>Notes</FormLabel>
                            <Textarea name="notes" defaultValue={editItem?.notes} minRows={2} />
                        </FormControl>

                        <DialogActions>
                            <Button variant="plain" color="neutral" onClick={() => setEditItem(null)}>Cancel</Button>
                            <Button type="submit" variant="solid">Save Charge</Button>
                        </DialogActions>
                    </Stack>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}