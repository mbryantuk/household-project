import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Divider,
  IconButton,
  Modal,
  ModalDialog,
  ModalClose,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Avatar,
  Grid,
  Chip,
} from '@mui/joy';
import { Add, Edit, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { getEmojiColor } from '../../utils/colors';
import EmojiPicker from '../../components/EmojiPicker';
import ModuleHeader from '../../components/ui/ModuleHeader';
import FinanceCard from '../../components/ui/FinanceCard';

const formatCurrency = (val, currencyCode = 'GBP') => {
  const num = parseFloat(val) || 0;
  let code = currencyCode === '£' ? 'GBP' : currencyCode === '$' ? 'USD' : currencyCode || 'GBP';
  try {
    return num.toLocaleString('en-GB', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return `£${num.toFixed(2)}`;
  }
};

export default function InvestmentsView({ financialProfileId }) {
  const {
    api,
    id: householdId,
    household,
    showNotification,
    confirmAction,
    isDark,
  } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const selectedInvestmentId = queryParams.get('selectedInvestmentId');

  const [investments, setInvestments] = useState([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    platform: '',
    current_value: 0,
    total_invested: 0,
    emoji: '📈',
  });

  const fetchInvestments = useCallback(async () => {
    if (!householdId || !financialProfileId) return;
    try {
      const res = await api.get(
        `/households/${householdId}/finance/investments?financial_profile_id=${financialProfileId}`
      );
      setInvestments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [api, householdId, financialProfileId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        await fetchInvestments();
      } catch (e) {
        console.error(e);
      }
    };
    if (mounted) load();
    return () => {
      mounted = false;
    };
  }, [fetchInvestments]);

  const selectedInvestment = useMemo(
    () => investments.find((i) => String(i.id) === String(selectedInvestmentId)),
    [investments, selectedInvestmentId]
  );

  useEffect(() => {
    let active = true;
    if (selectedInvestment && active) {
      setTimeout(() => {
        if (!active) return;
        setFormData({
          name: selectedInvestment.name || '',
          platform: selectedInvestment.platform || '',
          current_value: selectedInvestment.current_value || 0,
          total_invested: selectedInvestment.total_invested || 0,
          emoji: selectedInvestment.emoji || '📈',
        });
      }, 0);
    } else if (selectedInvestmentId === 'new' && active) {
      setTimeout(() => {
        if (!active) return;
        setFormData({
          name: '',
          platform: '',
          current_value: 0,
          total_invested: 0,
          emoji: '📈',
        });
      }, 0);
    }
    return () => {
      active = false;
    };
  }, [selectedInvestment, selectedInvestmentId]);

  const setInvestmentId = (id) => {
    const newParams = new URLSearchParams(location.search);
    if (id) newParams.set('selectedInvestmentId', id);
    else newParams.delete('selectedInvestmentId');
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleSave = async () => {
    try {
      const isNew = selectedInvestmentId === 'new';
      const realUrl = isNew
        ? `/households/${householdId}/finance/investments`
        : `/households/${householdId}/finance/investments/${selectedInvestmentId}`;

      const payload = {
        ...formData,
        financial_profile_id: financialProfileId,
        current_value: parseFloat(formData.current_value) || 0,
        total_invested: parseFloat(formData.total_invested) || 0,
      };

      await api[isNew ? 'post' : 'put'](realUrl, payload);

      showNotification(isNew ? 'Investment added.' : 'Investment updated.', 'success');
      await fetchInvestments();
      setInvestmentId(null);
    } catch {
      showNotification('Error saving investment.', 'danger');
    }
  };

  return (
    <Box>
      <ModuleHeader
        title="Investments"
        description="Track stock market and crypto assets."
        emoji="📈"
        isDark={isDark}
        action={
          <Button
            variant="solid"
            startDecorator={<Add />}
            onClick={() => setInvestmentId('new')}
            sx={{ height: '44px' }}
          >
            Add Investment
          </Button>
        }
      />

      <Grid container spacing={3}>
        {investments.length === 0 && (
          <Grid xs={12}>
            <Typography level="body-lg" textAlign="center" sx={{ py: 10, opacity: 0.5 }}>
              No investments recorded yet.
            </Typography>
          </Grid>
        )}
        {investments.map((inv) => {
          const gain = inv.current_value - inv.total_invested;
          const gainPct = inv.total_invested > 0 ? (gain / inv.total_invested) * 100 : 0;
          const isUp = gain >= 0;

          return (
            <Grid key={inv.id} xs={12} lg={6} xl={4}>
              <FinanceCard
                title={inv.name}
                subtitle={inv.platform || 'Direct'}
                emoji={inv.emoji}
                isDark={isDark}
                balance={inv.current_value}
                balanceColor="success"
                currency={household?.currency}
                subValue={
                  <Chip
                    size="sm"
                    variant="soft"
                    color={isUp ? 'success' : 'danger'}
                    startDecorator={
                      isUp ? (
                        <ArrowUpward sx={{ fontSize: '0.8rem' }} />
                      ) : (
                        <ArrowDownward sx={{ fontSize: '0.8rem' }} />
                      )
                    }
                  >
                    {Math.abs(gainPct).toFixed(1)}%
                  </Chip>
                }
                onEdit={() => setInvestmentId(inv.id)}
                onDelete={() =>
                  confirmAction('Delete?', 'Are you sure?', () =>
                    api
                      .delete(`/households/${householdId}/finance/investments/${inv.id}`)
                      .then(() => fetchInvestments())
                  )
                }
              >
                <Grid container spacing={1}>
                  <Grid xs={6}>
                    <Typography level="body-xs" color="neutral">
                      Total Invested
                    </Typography>
                    <Typography level="body-sm">
                      {formatCurrency(inv.total_invested, household?.currency)}
                    </Typography>
                  </Grid>
                  <Grid xs={6}>
                    <Typography level="body-xs" color="neutral">
                      Net Gain/Loss
                    </Typography>
                    <Typography level="body-sm" color={isUp ? 'success' : 'danger'}>
                      {isUp ? '+' : ''}
                      {formatCurrency(gain, household?.currency)}
                    </Typography>
                  </Grid>
                </Grid>
              </FinanceCard>
            </Grid>
          );
        })}
      </Grid>

      <Modal open={Boolean(selectedInvestmentId)} onClose={() => setInvestmentId(null)}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
          <ModalClose />
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                size="lg"
                sx={{
                  '--Avatar-size': '64px',
                  bgcolor: getEmojiColor(formData.emoji, isDark),
                  fontSize: '2rem',
                  cursor: 'pointer',
                }}
                onClick={() => setEmojiPickerOpen(true)}
              >
                {formData.emoji}
              </Avatar>
              <IconButton
                size="sm"
                variant="solid"
                color="primary"
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'background.surface',
                }}
                onClick={() => setEmojiPickerOpen(true)}
              >
                <Edit sx={{ fontSize: '0.8rem' }} />
              </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography level="h4">
                {selectedInvestmentId === 'new' ? 'New Investment' : 'Edit Investment'}
              </Typography>
              <Typography level="body-sm" color="neutral">
                Track stock market and crypto assets.
              </Typography>
            </Box>
          </Box>
          <Divider />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <Stack spacing={2} sx={{ mt: 2 }}>
              <FormControl required>
                <FormLabel>Investment Name</FormLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormControl>
              <FormControl required>
                <FormLabel>Platform</FormLabel>
                <Input
                  name="platform"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                />
              </FormControl>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required>
                  <FormLabel>Current Value</FormLabel>
                  <Input
                    name="current_value"
                    type="number"
                    slotProps={{ input: { step: 'any' } }}
                    startDecorator="£"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Total Invested</FormLabel>
                  <Input
                    name="total_invested"
                    type="number"
                    slotProps={{ input: { step: 'any' } }}
                    startDecorator="£"
                    value={formData.total_invested}
                    onChange={(e) => setFormData({ ...formData, total_invested: e.target.value })}
                  />
                </FormControl>
              </Box>
              <Button size="lg" type="submit">
                Save
              </Button>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
      <EmojiPicker
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onEmojiSelect={(e) => {
          setFormData({ ...formData, emoji: e });
          setEmojiPickerOpen(false);
        }}
        isDark={isDark}
      />
    </Box>
  );
}
