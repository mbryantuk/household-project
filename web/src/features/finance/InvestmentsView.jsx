import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Divider, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Avatar, Grid, Card, Chip
} from '@mui/joy';
import { Add, Edit, Delete, ArrowUpward, ArrowDownward, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch { return `£${num.toFixed(2)}`; }
};

export default function InvestmentsView({ financialProfileId }) {
  const { api, id: householdId, household, showNotification, confirmAction, isDark } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const selectedInvestmentId = queryParams.get('selectedInvestmentId');

  const [investments, setInvestments] = useState([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '', platform: '', current_value: 0, total_invested: 0, emoji: '📈'
  });

  const fetchInvestments = useCallback(async () => {
    if (!householdId || !financialProfileId) return;
    try {
      const res = await api.get(`/households/${householdId}/finance/investments?financial_profile_id=${financialProfileId}`);
      setInvestments(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId, financialProfileId]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const selectedInvestment = useMemo(() => 
    investments.find(i => String(i.id) === String(selectedInvestmentId)),
  [investments, selectedInvestmentId]);

  useEffect(() => {
    if (selectedInvestment) {
      setFormData(prev => {
          if (prev.name === selectedInvestment.name && 
              prev.platform === selectedInvestment.platform && 
              prev.current_value === selectedInvestment.current_value &&
              prev.total_invested === selectedInvestment.total_invested &&
              prev.emoji === selectedInvestment.emoji) return prev;
          return {
            name: selectedInvestment.name || '', 
            platform: selectedInvestment.platform || '',
            current_value: selectedInvestment.current_value || 0, 
            total_invested: selectedInvestment.total_invested || 0,
            emoji: selectedInvestment.emoji || '📈'
          };
      });
    } else if (selectedInvestmentId === 'new') {
      setFormData({
        name: '', platform: '', current_value: 0, total_invested: 0, emoji: '📈'
      });
    }
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
      const realUrl = isNew ? `/households/${householdId}/finance/investments` : `/households/${householdId}/finance/investments/${selectedInvestmentId}`;
      
      const payload = {
          ...formData,
          financial_profile_id: financialProfileId,
          current_value: parseFloat(formData.current_value) || 0,
          total_invested: parseFloat(formData.total_invested) || 0
      };

      await api[isNew ? 'post' : 'put'](realUrl, payload);
      
      showNotification(isNew ? "Investment added." : "Investment updated.", "success");
      await fetchInvestments();
      setInvestmentId(null);
    } catch { showNotification("Error saving investment.", "danger"); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography level="h2" startDecorator={<TrendingUpIcon />}>Investments</Typography>
        <Button startDecorator={<Add />} onClick={() => setInvestmentId('new')}>Add Investment</Button>
      </Box>

      <Grid container spacing={2}>
          {investments.length === 0 && (
              <Grid xs={12}>
                  <Typography level="body-lg" textAlign="center" sx={{ py: 10, opacity: 0.5 }}>No investments recorded yet.</Typography>
              </Grid>
          )}
          {investments.map(inv => {
              const gain = inv.current_value - inv.total_invested;
              const gainPct = inv.total_invested > 0 ? (gain / inv.total_invested) * 100 : 0;
              const isUp = gain >= 0;

              return (
                <Grid key={inv.id} xs={12} sm={6} md={4} lg={3}>
                    <Card variant="outlined" sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 'md' } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Avatar size="lg" sx={{ bgcolor: getEmojiColor(inv.emoji, isDark), fontSize: '1.5rem' }}>{inv.emoji}</Avatar>
                            <Stack direction="row">
                                <IconButton size="sm" variant="plain" onClick={() => setInvestmentId(inv.id)}><Edit /></IconButton>
                                <IconButton size="sm" variant="plain" color="danger" onClick={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/investments/${inv.id}`).then(() => fetchInvestments()))}><Delete /></IconButton>
                            </Stack>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <Typography level="title-lg" noWrap>{inv.name}</Typography>
                            <Typography level="body-xs" color="neutral" textTransform="uppercase">{inv.platform || 'Direct'}</Typography>
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box sx={{ mb: 1 }}>
                            <Typography level="body-xs" color="neutral">Current Value</Typography>
                            <Typography level="h3" sx={{ fontWeight: 'xl' }}>{formatCurrency(inv.current_value, household?.currency)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography level="body-xs" color="neutral">Invested</Typography>
                                <Typography level="body-sm" fontWeight="bold">{formatCurrency(inv.total_invested, household?.currency)}</Typography>
                            </Box>
                            <Chip 
                                size="sm" 
                                variant="soft" 
                                color={isUp ? 'success' : 'danger'}
                                startDecorator={isUp ? <ArrowUpward sx={{ fontSize: '0.8rem' }} /> : <ArrowDownward sx={{ fontSize: '0.8rem' }} />}
                            >
                                {Math.abs(gainPct).toFixed(1)}%
                            </Chip>
                        </Box>
                    </Card>
                </Grid>
              );
          })}
      </Grid>

      <Modal open={Boolean(selectedInvestmentId)} onClose={() => setInvestmentId(null)}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
          <ModalClose />
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                <Box sx={{ position: 'relative' }}>
                    <Avatar size="lg" sx={{ '--Avatar-size': '64px', bgcolor: getEmojiColor(formData.emoji, isDark), fontSize: '2rem', cursor: 'pointer' }} onClick={() => setEmojiPickerOpen(true)}>{formData.emoji}</Avatar>
                    <IconButton size="sm" variant="solid" color="primary" sx={{ position: 'absolute', bottom: -4, right: -4, borderRadius: '50%', border: '2px solid', borderColor: 'background.surface' }} onClick={() => setEmojiPickerOpen(true)}><Edit sx={{ fontSize: '0.8rem' }} /></IconButton>
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography level="h4">{selectedInvestmentId === 'new' ? 'New Investment' : 'Edit Investment'}</Typography>
                    <Typography level="body-sm" color="neutral">Track stock market and crypto assets.</Typography>
                </Box>
          </Box>
          <Divider />
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl required>
                <FormLabel>Investment Name</FormLabel>
                <Input 
                    name="name"
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                />
            </FormControl>
            <FormControl required>
                <FormLabel>Platform</FormLabel>
                <Input 
                    name="platform"
                    value={formData.platform} 
                    onChange={e => setFormData({ ...formData, platform: e.target.value })} 
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
                        onChange={e => setFormData({ ...formData, current_value: e.target.value })} 
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
                        onChange={e => setFormData({ ...formData, total_invested: e.target.value })} 
                    />
                </FormControl>
            </Box>
            <Button size="lg" type="submit">Save</Button>
          </Stack>
          </form>
        </ModalDialog>
      </Modal>
      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} 
        isDark={isDark}
      />
    </Box>
  );
}