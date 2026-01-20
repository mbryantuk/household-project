import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Stack, LinearProgress, IconButton } from '@mui/joy';
import { Savings, Add, Remove } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import AppSelect from '../ui/AppSelect';

export default function SavingsWidget({ api, household, user }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState('total');

  const fetchData = useCallback(async () => {
    if (!api || !household?.id) return;
    setLoading(true);
    try {
      const accRes = await api.get(`/households/${household.id}/finance/savings`);
      setAccounts(accRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, household?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedAccount = selectedAccountId === 'total' 
    ? null 
    : accounts.find(a => a.id === parseInt(selectedAccountId));

  const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.current_balance) || 0), 0);
  const displayBalance = selectedAccount ? (parseFloat(selectedAccount.current_balance) || 0) : totalBalance;
  const displayLabel = selectedAccount ? selectedAccount.account_name : 'Total Savings';
  const displayEmoji = selectedAccount ? (selectedAccount.emoji || '💰') : '🏦';

  return (
    <WidgetWrapper title="Savings" icon={<Savings />} color="success">
      <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
        
        {/* Selector */}
        <Box>
            <AppSelect
                placeholder="Select Account"
                value={selectedAccountId}
                onChange={(e, val) => setSelectedAccountId(val)}
                options={[
                    { value: 'total', label: 'Total Savings' },
                    ...accounts.map(acc => ({ value: String(acc.id), label: `${acc.emoji || '💰'} ${acc.account_name}` }))
                ]}
                size="sm"
            />
        </Box>

        {/* Big Balance Display */}
        <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography level="body-sm" color="neutral" textTransform="uppercase" letterSpacing="1px">
                {displayLabel}
            </Typography>
            <Typography level="h2" color="success">
                {displayEmoji} £{displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
        </Box>

        {/* Mini Details */}
        {selectedAccount && (
             <Box>
                <Typography level="body-xs" sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Interest Rate</span>
                    <span>{selectedAccount.interest_rate}%</span>
                </Typography>
                <Typography level="body-xs" sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Institution</span>
                    <span>{selectedAccount.institution}</span>
                </Typography>
             </Box>
        )}
        
        {!selectedAccount && accounts.length > 0 && (
            <Stack spacing={1}>
                {accounts.slice(0, 3).map(acc => (
                    <Box key={acc.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography level="body-xs">{acc.emoji} {acc.account_name}</Typography>
                        <Typography level="body-xs" fontWeight="bold">£{acc.current_balance?.toLocaleString()}</Typography>
                    </Box>
                ))}
                {accounts.length > 3 && <Typography level="body-xs" color="neutral" textAlign="center">+{accounts.length - 3} more</Typography>}
            </Stack>
        )}

        {accounts.length === 0 && !loading && <Typography level="body-sm" color="neutral" textAlign="center">No savings accounts yet.</Typography>}

      </Stack>
    </WidgetWrapper>
  );
}