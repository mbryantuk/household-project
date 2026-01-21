import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Card, Stack, Button, Modal, ModalDialog, DialogTitle, DialogContent, FormControl, FormLabel, Input, List, ListItem, ListItemContent, ListItemDecorator, LinearProgress
} from '@mui/joy';
import { Add, Remove } from '@mui/icons-material';
import AppSelect from '../ui/AppSelect';

export default function SavingsContent({ api, householdId }) {
  const [savings, setSavings] = useState([]);
  const [pots, setPots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustItem, setAdjustItem] = useState(null); // { item, type: 'add' | 'remove' }
  const [selectedId, setSelectedId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!api || !householdId) return;
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/finance/savings`);
      const items = res.data || [];
      setSavings(items);
      
      if (!selectedId && items.length > 0) {
          setSelectedId(String(items[0].id));
      }
    } catch (err) {
      console.error("Failed to fetch savings", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
      if (!selectedId || !api || !householdId) {
          setPots([]);
          return;
      }
      api.get(`/households/${householdId}/finance/savings/${selectedId}/pots`)
         .then(res => setPots(res.data || []))
         .catch(err => console.error("Failed to fetch pots", err));
  }, [selectedId, api, householdId]);

  const handleAdjustSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const amount = parseFloat(formData.get('amount'));
      if (!amount || amount <= 0) return;

      const { item, type } = adjustItem;
      const currentVal = parseFloat(item.current_balance) || 0;
      const newVal = type === 'add' ? currentVal + amount : currentVal - amount;

      try {
          await api.put(`/households/${householdId}/finance/savings/${item.id}`, {
              ...item,
              current_balance: newVal
          });
          
          fetchData();
          setAdjustItem(null);
      } catch { alert("Failed to update balance"); }
  };

  if (loading && savings.length === 0) return <Box sx={{ p: 2, textAlign: 'center' }}><Typography>Loading...</Typography></Box>;

  const selectedItem = savings.find(a => String(a.id) === selectedId);
  const currentValue = selectedItem ? (parseFloat(selectedItem.current_balance) || 0) : 0;

  return (
    <Box sx={{ overflowY: 'auto', flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <Box sx={{ mb: 2 }}>
        <AppSelect
            placeholder="Select Account"
            value={selectedId}
            onChange={(val) => setSelectedId(val)}
            options={savings.map(s => ({ 
                value: String(s.id), 
                label: `${s.emoji || '💰'} ${s.institution} (${s.account_name})` 
            }))}
        />
      </Box>

      {selectedItem ? (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
             <Typography level="body-xs" textTransform="uppercase" letterSpacing="1px" color="neutral">Current Balance</Typography>
             <Typography level="h1" color="success">
                £{currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </Typography>
             <Typography level="body-sm" color="neutral">
                {selectedItem.institution} • {selectedItem.account_name}
             </Typography>
        </Box>
      ) : (
         <Typography level="body-sm" color="neutral" textAlign="center" sx={{ mt: 4 }}>
             No account selected.
         </Typography>
      )}

      {selectedItem && (
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <Card variant="soft" size="sm" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography level="title-sm">Quick Adjust Balance</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="sm" variant="outlined" color="danger" onClick={() => setAdjustItem({ item: selectedItem, type: 'remove' })}>
                            <Remove />
                        </Button>
                        <Button size="sm" variant="outlined" color="success" onClick={() => setAdjustItem({ item: selectedItem, type: 'add' })}>
                            <Add />
                        </Button>
                    </Box>
                </Box>
                <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography level="body-sm" color="neutral">Interest Rate</Typography>
                        <Typography level="body-sm">{selectedItem.interest_rate}%</Typography>
                    </Box>
                </Stack>
            </Card>

            {pots.length > 0 && (
                <Box>
                    <Typography level="title-sm" sx={{ mb: 1, px: 0.5 }}>Savings Pots</Typography>
                    <List size="sm" variant="outlined" sx={{ borderRadius: 'sm', bgcolor: 'background.surface' }}>
                        {pots.map(pot => {
                             const potVal = parseFloat(pot.current_amount) || 0;
                             const potTarget = parseFloat(pot.target_amount) || 0;
                             const progress = potTarget > 0 ? (potVal / potTarget) * 100 : 0;
                             
                             return (
                                <ListItem key={pot.id} sx={{ display: 'block', py: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 0.5 }}>
                                        <ListItemDecorator sx={{ fontSize: '1.2rem', mr: 1.5 }}>
                                            {pot.emoji || '🍯'}
                                        </ListItemDecorator>
                                        <ListItemContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography level="title-sm">{pot.pot_name}</Typography>
                                                <Typography level="title-sm" color="success">£{potVal.toLocaleString()}</Typography>
                                            </Box>
                                        </ListItemContent>
                                    </Box>
                                    {potTarget > 0 && (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <LinearProgress determinate value={Math.min(progress, 100)} size="sm" color={progress >= 100 ? "success" : "primary"} sx={{ flexGrow: 1 }} />
                                            <Typography level="body-xs" color="neutral">
                                                {Math.round(progress)}% of £{potTarget.toLocaleString()}
                                            </Typography>
                                        </Stack>
                                    )}
                                </ListItem>
                             );
                        })}
                    </List>
                </Box>
            )}
          </Box>
      )}

      <Modal open={Boolean(adjustItem)} onClose={() => setAdjustItem(null)}>
        <ModalDialog size="sm">
            <DialogTitle>{adjustItem?.type === 'add' ? 'Increase Balance' : 'Decrease Balance'}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleAdjustSubmit}>
                    <FormControl required>
                        <FormLabel>Amount (£)</FormLabel>
                        <Input name="amount" type="number" step="0.01" autoFocus />
                    </FormControl>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button variant="plain" color="neutral" onClick={() => setAdjustItem(null)}>Cancel</Button>
                        <Button type="submit" color={adjustItem?.type === 'add' ? 'success' : 'danger'}>
                            {adjustItem?.type === 'add' ? 'Increase' : 'Decrease'}
                        </Button>
                    </Box>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
