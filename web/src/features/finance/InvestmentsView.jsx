import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Divider, Avatar
} from '@mui/joy';
import { Add, Edit, Delete, TrendingUp } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch { return `£${num.toFixed(2)}`; }
};

export default function InvestmentsView() {
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
    if (!householdId) return;
    try {
      const res = await api.get(`/households/${householdId}/finance/investments`);
      setInvestments(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvestments();
  }, [fetchInvestments]);

  const selectedInvestment = useMemo(() => 
    investments.find(i => String(i.id) === String(selectedInvestmentId)),
  [investments, selectedInvestmentId]);

  useEffect(() => {
    if (selectedInvestment) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: selectedInvestment.name || '', 
        platform: selectedInvestment.platform || '',
        current_value: selectedInvestment.current_value || 0, 
        total_invested: selectedInvestment.total_invested || 0,
        emoji: selectedInvestment.emoji || '📈'
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
        <Typography level="h2" startDecorator={<TrendingUp />}>Investments</Typography>
        <Button startDecorator={<Add />} onClick={() => setInvestmentId('new')}>Add Investment</Button>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Name</th>
              <th>Platform</th>
              <th style={{ textAlign: 'right' }}>Current Value</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {investments.map(inv => (
              <tr key={inv.id}>
                <td><Avatar size="sm" sx={{ bgcolor: getEmojiColor(inv.emoji, isDark) }}>{inv.emoji}</Avatar></td>
                <td><Typography fontWeight="lg">{inv.name}</Typography></td>
                <td>{inv.platform}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(inv.current_value, household?.currency)}</td>
                <td>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="sm" onClick={() => setInvestmentId(inv.id)}><Edit /></IconButton>
                    <IconButton size="sm" color="danger" onClick={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/investments/${inv.id}`).then(() => { fetchInvestments(); if (selectedInvestmentId === String(inv.id)) setInvestmentId(null); }))}><Delete /></IconButton>
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>

      <Modal open={Boolean(selectedInvestmentId)} onClose={() => setInvestmentId(null)}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
          <ModalClose />
          <Typography level="h4">{selectedInvestmentId === 'new' ? 'New Investment' : 'Edit Investment'}</Typography>
          <Divider />
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton variant="outlined" sx={{ width: 56, height: 56 }} onClick={() => setEmojiPickerOpen(true)}>
                    <Typography level="h2">{formData.emoji}</Typography>
                </IconButton>
                <FormControl required sx={{ flex: 1 }}>
                    <FormLabel>Investment Name</FormLabel>
                    <Input 
                        name="name"
                        value={formData.name} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    />
                </FormControl>
            </Box>
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