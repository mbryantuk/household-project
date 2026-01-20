import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Card, IconButton, Stack, LinearProgress, Button, Modal, ModalDialog, DialogTitle, DialogContent, FormControl, FormLabel, Input
} from '@mui/joy';
import { Edit, Add, Remove } from '@mui/icons-material';
import AppSelect from '../ui/AppSelect';

export default function InvestmentsContent({ api, householdId, isDark }) {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustItem, setAdjustItem] = useState(null); // { item, type: 'add' | 'remove' }
  const [selectedId, setSelectedId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!api || !householdId) return;
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/finance/investments`);
      const items = res.data || [];
      setInvestments(items);
      
      // Default to first account if none selected
      if (!selectedId && items.length > 0) {
          setSelectedId(String(items[0].id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdjustSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const amount = parseFloat(formData.get('amount'));
      if (!amount || amount <= 0) return;

      const { item, type } = adjustItem;
      const currentVal = parseFloat(item.current_value) || 0;
      const newVal = type === 'add' ? currentVal + amount : currentVal - amount;

      try {
          await api.put(`/households/${householdId}/finance/investments/${item.id}`, {
              ...item,
              current_value: newVal
          });
          
          fetchData();
          setAdjustItem(null);
      } catch (err) { alert("Failed to update value"); }
  };

  if (loading && investments.length === 0) return <Box sx={{ p: 2, textAlign: 'center' }}><Typography>Loading...</Typography></Box>;

  const selectedItem = investments.find(a => String(a.id) === selectedId);
  const totalInvested = selectedItem ? (parseFloat(selectedItem.total_invested) || 0) : 0;
  const currentValue = selectedItem ? (parseFloat(selectedItem.current_value) || 0) : 0;
  const gain = currentValue - totalInvested;
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

  return (
    <Box sx={{ overflowY: 'auto', flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* 1. Account Selector */}
      <Box sx={{ mb: 2 }}>
        <AppSelect
            placeholder="Select Investment"
            value={selectedId}
            onChange={(val) => setSelectedId(val)}
            options={investments.map(inv => ({ 
                value: String(inv.id), 
                label: `${inv.emoji || '📈'} ${inv.name} (${inv.symbol || inv.platform})` 
            }))}
        />
      </Box>

      {/* 2. Big Balance */}
      {selectedItem ? (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
             <Typography level="body-xs" textTransform="uppercase" letterSpacing="1px" color="neutral">Current Value</Typography>
             <Typography level="h1" color={gain >= 0 ? 'success' : 'danger'}>
                £{currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </Typography>
             <Typography level="body-sm" color={gain >= 0 ? 'success.500' : 'danger.500'} fontWeight="bold">
                {gain >= 0 ? '+' : ''}£{gain.toLocaleString()} ({gainPct.toFixed(2)}%)
             </Typography>
        </Box>
      ) : (
         <Typography level="body-sm" color="neutral" textAlign="center" sx={{ mt: 4 }}>
             No investment selected.
         </Typography>
      )}

      {/* 3. Quick Actions / Details */}
      {selectedItem && (
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <Card variant="soft" size="sm" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography level="title-sm">Quick Adjust Value</Typography>
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
                        <Typography level="body-sm" color="neutral">Units</Typography>
                        <Typography level="body-sm">{selectedItem.units || '-'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography level="body-sm" color="neutral">Total Invested</Typography>
                        <Typography level="body-sm">£{totalInvested.toLocaleString()}</Typography>
                    </Box>
                </Stack>
            </Card>
          </Box>
      )}

      {/* ADJUST MODAL */}
      <Modal open={Boolean(adjustItem)} onClose={() => setAdjustItem(null)}>
        <ModalDialog size="sm">
            <DialogTitle>{adjustItem?.type === 'add' ? 'Increase Value' : 'Decrease Value'}</DialogTitle>
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