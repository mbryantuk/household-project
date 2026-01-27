import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Divider, Avatar, Select, Option, Checkbox, Grid, Card, LinearProgress, Tooltip, Chip
} from '@mui/joy';
import { Add, Edit, Delete, Home, Calculate, TrendingUp, AccountBalance } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch { return `£${num.toFixed(2)}`; }
};

export default function MortgagesView() {
  const { api, id: householdId, household, showNotification, confirmAction } = useOutletContext();
  const [mortgages, setMortgages] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    lender: '', 
    remaining_balance: 0, 
    monthly_payment: 0, 
    emoji: '🏠',
    // Detailed Fields
    original_purchase_price: 0,
    estimated_value: 0,
    term_years: 25,
    term_months: 0,
    interest_rate: 0,
    repayment_type: 'repayment',
    mortgage_type: 'mortgage',
    // Equity Loan Fields
    equity_loan_amount: 0,
    equity_loan_start_date: '',
    equity_loan_interest_rate: 1.75,
    equity_loan_cpi_rate: 2.0
  });

  const fetchMortgages = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await api.get(`/households/${householdId}/finance/mortgages`);
      setMortgages(res.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId]);

  useEffect(() => { 
      fetchMortgages(); 
  }, [fetchMortgages]);

  const handleEdit = (m) => {
    setEditingId(m.id);
    setFormData({
      lender: m.lender, 
      remaining_balance: m.remaining_balance,
      monthly_payment: m.monthly_payment, 
      emoji: m.emoji || '🏠',
      original_purchase_price: m.original_purchase_price || 0,
      estimated_value: m.estimated_value || 0,
      term_years: m.term_years || 25,
      term_months: m.term_months || 0,
      interest_rate: m.interest_rate || 0,
      repayment_type: m.repayment_type || 'repayment',
      mortgage_type: m.mortgage_type || 'mortgage',
      equity_loan_amount: m.equity_loan_amount || 0,
      equity_loan_start_date: m.equity_loan_start_date || '',
      equity_loan_interest_rate: m.equity_loan_interest_rate || 1.75,
      equity_loan_cpi_rate: m.equity_loan_cpi_rate || 2.0
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingId ? `/households/${householdId}/finance/mortgages/${editingId}` : `/households/${householdId}/finance/mortgages`;
      await api[editingId ? 'put' : 'post'](url, formData);
      setOpen(false); setEditingId(null); fetchMortgages();
      showNotification("Saved.", "success");
    } catch { showNotification("Error.", "danger"); }
  };

  // --- Calculations ---
  const totals = useMemo(() => {
      return mortgages.reduce((acc, m) => {
          acc.balance += (m.remaining_balance || 0);
          acc.equity_loan += (m.equity_loan_amount || 0);
          acc.value += (m.estimated_value || 0);
          return acc;
      }, { balance: 0, equity_loan: 0, value: 0 });
  }, [mortgages]);

  const equity = totals.value - totals.balance - totals.equity_loan;
  const ltv = totals.value > 0 ? ((totals.balance / totals.value) * 100) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
            <Typography level="h2" startDecorator={<Home />}>Mortgages & Equity</Typography>
            <Typography level="body-sm">Manage property finance, equity loans, and LTV tracking.</Typography>
        </Box>
        <Button startDecorator={<Add />} onClick={() => { setEditingId(null); setOpen(true); }}>Add Mortgage</Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid xs={12} md={4}>
              <Card variant="soft" color="primary">
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar><Home /></Avatar>
                      <Box>
                          <Typography level="body-xs">Total Property Value</Typography>
                          <Typography level="h3">{formatCurrency(totals.value, household?.currency)}</Typography>
                      </Box>
                  </Box>
              </Card>
          </Grid>
          <Grid xs={12} md={4}>
              <Card variant="soft" color="success">
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar color="success"><TrendingUp /></Avatar>
                      <Box>
                          <Typography level="body-xs">Your Equity</Typography>
                          <Typography level="h3">{formatCurrency(equity, household?.currency)}</Typography>
                          <Typography level="body-xs">{(totals.value > 0 ? (equity / totals.value) * 100 : 0).toFixed(1)}% Ownership</Typography>
                      </Box>
                  </Box>
              </Card>
          </Grid>
          <Grid xs={12} md={4}>
              <Card variant="soft" color="warning">
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar color="warning"><AccountBalance /></Avatar>
                      <Box>
                          <Typography level="body-xs">Bank / Equity Loan Debt</Typography>
                          <Typography level="h3">{formatCurrency(totals.balance + totals.equity_loan, household?.currency)}</Typography>
                          <Typography level="body-xs">LTV: {ltv.toFixed(1)}%</Typography>
                      </Box>
                  </Box>
              </Card>
          </Grid>
      </Grid>

      {/* Equity Visualizer */}
      {totals.value > 0 && (
          <Sheet variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 'md' }}>
              <Typography level="title-sm" sx={{ mb: 1 }}>Equity Breakdown</Typography>
              <LinearProgress
                  determinate
                  thickness={24}
                  value={(totals.balance / totals.value) * 100}
                  sx={{ 
                      '--LinearProgress-radius': '10px',
                      '--LinearProgress-progressThickness': '24px',
                      bgcolor: 'success.softBg',
                      color: 'primary.500', // Bank
                  }}
              >
                  {totals.equity_loan > 0 && (
                      <Box 
                          sx={{ 
                              position: 'absolute', 
                              left: `${(totals.balance / totals.value) * 100}%`,
                              width: `${(totals.equity_loan / totals.value) * 100}%`,
                              height: '100%',
                              bgcolor: 'warning.400' // Equity Loan
                          }} 
                      />
                  )}
              </LinearProgress>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, fontSize: 'xs' }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box sx={{ width: 10, height: 10, bgcolor: 'primary.500', borderRadius: '50%' }} />
                      <Typography level="body-xs">Mortgage ({((totals.balance / totals.value) * 100).toFixed(0)}%)</Typography>
                  </Box>
                  {totals.equity_loan > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Box sx={{ width: 10, height: 10, bgcolor: 'warning.400', borderRadius: '50%' }} />
                          <Typography level="body-xs">Equity Loan ({((totals.equity_loan / totals.value) * 100).toFixed(0)}%)</Typography>
                      </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box sx={{ width: 10, height: 10, bgcolor: 'success.softBg', borderRadius: '50%', border: '1px solid currentColor' }} />
                      <Typography level="body-xs">Your Equity ({((equity / totals.value) * 100).toFixed(0)}%)</Typography>
                  </Box>
              </Box>
          </Sheet>
      )}

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Lender</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Est. Value</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th style={{ textAlign: 'right' }}>Monthly</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {mortgages.map(m => (
              <tr key={m.id}>
                <td><Avatar size="sm" sx={{ bgcolor: getEmojiColor(m.emoji) }}>{m.emoji}</Avatar></td>
                <td>
                    <Typography fontWeight="lg">{m.lender}</Typography>
                    <Typography level="body-xs">{m.interest_rate}% {m.repayment_type}</Typography>
                </td>
                <td>
                    <Chip size="sm" variant="soft" color={m.mortgage_type === 'equity_loan' ? 'warning' : 'primary'}>
                        {m.mortgage_type === 'equity_loan' ? 'Equity Loan' : 'Mortgage'}
                    </Chip>
                </td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(m.estimated_value, household?.currency)}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(m.remaining_balance, household?.currency)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(m.monthly_payment, household?.currency)}</td>
                <td>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="sm" onClick={() => handleEdit(m)}><Edit /></IconButton>
                    <IconButton size="sm" color="danger" onClick={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/mortgages/${m.id}`).then(fetchMortgages))}><Delete /></IconButton>
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ maxWidth: 700, width: '100%', overflow: 'auto' }}>
          <ModalClose />
          <Typography level="h4">{editingId ? 'Edit Mortgage' : 'New Mortgage'}</Typography>
          <Divider />
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton variant="outlined" sx={{ width: 56, height: 56 }} onClick={() => setEmojiPickerOpen(true)}>
                    <Typography level="h2">{formData.emoji}</Typography>
                </IconButton>
                <FormControl required sx={{ flex: 1 }}><FormLabel>Lender</FormLabel><Input value={formData.lender} onChange={e => setFormData({ ...formData, lender: e.target.value })} /></FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required><FormLabel>Type</FormLabel>
                    <Select value={formData.mortgage_type} onChange={(e, v) => setFormData({ ...formData, mortgage_type: v })}>
                        <Option value="mortgage">Standard Mortgage</Option>
                        <Option value="equity_loan">Equity Loan (e.g. Help to Buy)</Option>
                    </Select>
                </FormControl>
                <FormControl><FormLabel>Repayment Type</FormLabel>
                    <Select value={formData.repayment_type} onChange={(e, v) => setFormData({ ...formData, repayment_type: v })}>
                        <Option value="repayment">Repayment</Option>
                        <Option value="interest_only">Interest Only</Option>
                    </Select>
                </FormControl>
            </Box>

            <Divider><Typography level="body-sm">Valuation & Balance</Typography></Divider>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                 <FormControl><FormLabel>Original Purchase Price</FormLabel><Input type="number" startDecorator="£" value={formData.original_purchase_price} onChange={e => setFormData({ ...formData, original_purchase_price: e.target.value })} /></FormControl>
                 <FormControl required><FormLabel>Current Est. Value</FormLabel><Input type="number" startDecorator="£" value={formData.estimated_value} onChange={e => setFormData({ ...formData, estimated_value: e.target.value })} /></FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl required><FormLabel>Remaining Balance</FormLabel><Input type="number" startDecorator="£" value={formData.remaining_balance} onChange={e => setFormData({ ...formData, remaining_balance: e.target.value })} /></FormControl>
                <FormControl required><FormLabel>Monthly Payment</FormLabel><Input type="number" startDecorator="£" value={formData.monthly_payment} onChange={e => setFormData({ ...formData, monthly_payment: e.target.value })} /></FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                 <FormControl><FormLabel>Interest Rate (%)</FormLabel><Input type="number" endDecorator="%" value={formData.interest_rate} onChange={e => setFormData({ ...formData, interest_rate: e.target.value })} /></FormControl>
                 <FormControl><FormLabel>Term (Years)</FormLabel><Input type="number" value={formData.term_years} onChange={e => setFormData({ ...formData, term_years: e.target.value })} /></FormControl>
                 <FormControl><FormLabel>Term (Months)</FormLabel><Input type="number" value={formData.term_months} onChange={e => setFormData({ ...formData, term_months: e.target.value })} /></FormControl>
            </Box>

            {formData.mortgage_type === 'equity_loan' && (
                <Card variant="soft" color="warning">
                    <Typography level="title-md" startDecorator={<Calculate />}>Equity Loan Details</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                         <FormControl><FormLabel>Initial Equity Amount</FormLabel><Input type="number" startDecorator="£" value={formData.equity_loan_amount} onChange={e => setFormData({ ...formData, equity_loan_amount: e.target.value })} /></FormControl>
                         <FormControl><FormLabel>Start Date</FormLabel><Input type="date" value={formData.equity_loan_start_date} onChange={e => setFormData({ ...formData, equity_loan_start_date: e.target.value })} /></FormControl>
                         <FormControl><FormLabel>Interest Rate (%)</FormLabel><Input type="number" endDecorator="%" value={formData.equity_loan_interest_rate} onChange={e => setFormData({ ...formData, equity_loan_interest_rate: e.target.value })} /></FormControl>
                         <FormControl><FormLabel>CPI Rate (%)</FormLabel><Input type="number" endDecorator="%" value={formData.equity_loan_cpi_rate} onChange={e => setFormData({ ...formData, equity_loan_cpi_rate: e.target.value })} /></FormControl>
                    </Box>
                </Card>
            )}

            <Button size="lg" onClick={handleSave}>Save Mortgage</Button>
          </Stack>
        </ModalDialog>
      </Modal>
      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} />
    </Box>
  );
}