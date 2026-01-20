import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Card, IconButton, Stack, LinearProgress, Button, Modal, ModalDialog, DialogTitle, DialogContent, FormControl, FormLabel, Input
} from '@mui/joy';
import { Edit, Add, Remove } from '@mui/icons-material';
import AppSelect from '../ui/AppSelect';

export default function SavingsContent({ api, householdId, isDark }) {
  const [accounts, setAccounts] = useState([]);
  const [pots, setPots] = useState({});
  const [loading, setLoading] = useState(true);
  const [adjustPot, setAdjustPot] = useState(null); // { savingsId, pot, type: 'add' | 'remove' }
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!api || !householdId) return;
    setLoading(true);
    try {
      const accRes = await api.get(`/households/${householdId}/finance/savings`);
      const accs = accRes.data || [];
      setAccounts(accs);
      
      // Default to first account if none selected
      if (!selectedAccountId && accs.length > 0) {
          setSelectedAccountId(String(accs[0].id));
      }

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
  }, [api, householdId, selectedAccountId]);

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
          
          const potRes = await api.get(`/households/${householdId}/finance/savings/${savingsId}/pots`);
          setPots(prev => ({ ...prev, [savingsId]: potRes.data }));
          setAdjustPot(null);
      } catch (err) { alert("Failed to update balance"); }
  };

  if (loading && accounts.length === 0) return <Box sx={{ p: 2, textAlign: 'center' }}><Typography>Loading...</Typography></Box>;

  const selectedAccount = accounts.find(a => String(a.id) === selectedAccountId);
  const selectedPots = selectedAccount ? (pots[selectedAccount.id] || []) : [];

  return (
    <Box sx={{ overflowY: 'auto', flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* 1. Account Selector */}
      <Box sx={{ mb: 2 }}>
        <AppSelect
            placeholder="Select Account"
            value={selectedAccountId}
            onChange={(e, val) => setSelectedAccountId(val)}
            options={accounts.map(acc => ({ 
                value: String(acc.id), 
                label: `${acc.emoji || '💰'} ${acc.account_name} (${acc.institution})` 
            }))}
        />
      </Box>

      {/* 2. Big Balance */}
      {selectedAccount ? (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
             <Typography level="body-xs" textTransform="uppercase" letterSpacing="1px" color="neutral">Current Balance</Typography>
             <Typography level="h1" color="success">
                £{selectedAccount.current_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </Typography>
             <Typography level="body-sm" color="neutral">
                {selectedAccount.interest_rate}% AER
             </Typography>
        </Box>
      ) : (
         <Typography level="body-sm" color="neutral" textAlign="center" sx={{ mt: 4 }}>
             No account selected.
         </Typography>
      )}

      {/* 3. Pots List */}
      {selectedAccount && (
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <Typography level="title-sm" sx={{ mb: 1, px: 0.5 }}>Pots Allocation</Typography>
            {selectedPots.length === 0 ? (
                <Typography level="body-xs" color="neutral" sx={{ fontStyle: 'italic', p: 1 }}>No pots created for this account.</Typography>
            ) : (
                <Stack spacing={1}>
                    {selectedPots.map(pot => {
                        const progress = pot.target_amount ? (pot.current_amount / pot.target_amount) * 100 : 0;
                        return (
                            <Card key={pot.id} variant="soft" size="sm" sx={{ p: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography level="title-sm">{pot.emoji} {pot.name}</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <IconButton size="sm" variant="outlined" color="danger" onClick={() => setAdjustPot({ savingsId: selectedAccount.id, pot, type: 'remove' })}>
                                            <Remove fontSize="small" />
                                        </IconButton>
                                        <IconButton size="sm" variant="outlined" color="success" onClick={() => setAdjustPot({ savingsId: selectedAccount.id, pot, type: 'add' })}>
                                            <Add fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography level="body-sm">£{pot.current_amount?.toLocaleString()}</Typography>
                                    {pot.target_amount && <Typography level="body-xs" color="neutral">of £{pot.target_amount?.toLocaleString()}</Typography>}
                                </Box>
                                {pot.target_amount && <LinearProgress determinate value={Math.min(progress, 100)} size="sm" color={progress >= 100 ? 'success' : 'primary'} sx={{ mt: 1 }} />}
                            </Card>
                        );
                    })}
                </Stack>
            )}
          </Box>
      )}

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