import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Card, IconButton, Stack, LinearProgress, Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, FormControl, FormLabel, Input
} from '@mui/joy';
import { Edit, Add, Remove, Savings } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';

export default function SavingsContent({ api, householdId, isDark, onClose }) {
  const [accounts, setAccounts] = useState([]);
  const [pots, setPots] = useState({});
  const [loading, setLoading] = useState(true);
  const [adjustPot, setAdjustPot] = useState(null); // { savingsId, pot, type: 'add' | 'remove' }

  const fetchData = useCallback(async () => {
    if (!api || !householdId) return;
    setLoading(true);
    try {
      const accRes = await api.get(`/households/${householdId}/finance/savings`);
      const accs = accRes.data || [];
      setAccounts(accs);

      const potsMap = {};
      await Promise.all(accs.map(async (acc) => {
          try {
              const potRes = await api.get(`/households/${householdId}/finance/savings/${acc.id}/pots`);
              potsMap[acc.id] = potRes.data || [];
          } catch (e) {
              console.error(e);
          }
      }));
      setPots(potsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdjustSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const amount = parseFloat(formData.get('amount'));
      if (!amount || amount <= 0) return;

      const { savingsId, pot, type } = adjustPot;
      const newAmount = type === 'add' 
          ? (pot.current_amount || 0) + amount 
          : (pot.current_amount || 0) - amount;

      try {
          await api.put(`/households/${householdId}/finance/savings/${savingsId}/pots/${pot.id}`, {
              ...pot,
              current_amount: newAmount
          });
          
          // Refresh
          const potRes = await api.get(`/households/${householdId}/finance/savings/${savingsId}/pots`);
          setPots(prev => ({ ...prev, [savingsId]: potRes.data }));
          setAdjustPot(null);
      } catch (err) { alert("Failed to update balance"); }
  };

  if (loading) return <Box sx={{ p: 2, textAlign: 'center' }}><Typography>Loading...</Typography></Box>;

  return (
    <Box sx={{ overflowY: 'auto', flexGrow: 1, p: 2 }}>
      <Stack spacing={2}>
        {accounts.map(acc => {
            const accPots = pots[acc.id] || [];
            return (
                <Box key={acc.id}>
                    <Typography level="title-sm" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {acc.emoji || '💰'} {acc.account_name} 
                        <Typography level="body-xs" color="neutral">({acc.institution})</Typography>
                    </Typography>
                    
                    {accPots.length === 0 ? (
                        <Typography level="body-xs" color="neutral" sx={{ fontStyle: 'italic', pl: 2 }}>No pots</Typography>
                    ) : (
                        <Stack spacing={1}>
                            {accPots.map(pot => {
                                const progress = pot.target_amount ? (pot.current_amount / pot.target_amount) * 100 : 0;
                                return (
                                    <Card key={pot.id} variant="soft" size="sm" sx={{ p: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                            <Typography level="body-sm" fontWeight="bold">{pot.emoji} {pot.name}</Typography>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <IconButton size="sm" variant="outlined" color="danger" onClick={() => setAdjustPot({ savingsId: acc.id, pot, type: 'remove' })}>
                                                    <Remove fontSize="small" />
                                                </IconButton>
                                                <IconButton size="sm" variant="outlined" color="success" onClick={() => setAdjustPot({ savingsId: acc.id, pot, type: 'add' })}>
                                                    <Add fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography level="body-sm">£{pot.current_amount?.toLocaleString()}</Typography>
                                            {pot.target_amount && <Typography level="body-xs" color="neutral">of £{pot.target_amount?.toLocaleString()}</Typography>}
                                        </Box>
                                        {pot.target_amount && <LinearProgress determinate value={Math.min(progress, 100)} size="sm" color={progress >= 100 ? 'success' : 'primary'} sx={{ mt: 0.5 }} />}
                                    </Card>
                                );
                            })}
                        </Stack>
                    )}
                </Box>
            );
        })}
        {accounts.length === 0 && <Typography level="body-sm" color="neutral" textAlign="center">No savings accounts found.</Typography>}
      </Stack>

      {/* ADJUST MODAL */}
      <Modal open={Boolean(adjustPot)} onClose={() => setAdjustPot(null)}>
        <ModalDialog size="sm">
            <DialogTitle>{adjustPot?.type === 'add' ? 'Add Funds' : 'Remove Funds'}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleAdjustSubmit}>
                    <FormControl required>
                        <FormLabel>Amount (£)</FormLabel>
                        <Input name="amount" type="number" step="0.01" autoFocus />
                    </FormControl>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button variant="plain" color="neutral" onClick={() => setAdjustPot(null)}>Cancel</Button>
                        <Button type="submit" color={adjustPot?.type === 'add' ? 'success' : 'danger'}>
                            {adjustPot?.type === 'add' ? 'Add' : 'Remove'}
                        </Button>
                    </Box>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}