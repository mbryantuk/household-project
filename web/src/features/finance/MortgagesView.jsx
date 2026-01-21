import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  AvatarGroup, LinearProgress, Table, Sheet, Dropdown, Menu, MenuButton, MenuItem, Checkbox
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd, TrendingUp, Sell, AccountBalanceWallet, ArrowDropDown } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';
import AppSelect from '../../components/ui/AppSelect';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (val) => {
    const num = parseFloat(val) || 0;
    return num.toFixed(2) + '%';
};

export default function MortgagesView() {
  const { api, id: householdId, user: currentUser, isDark, members } = useOutletContext();
  const [mortgages, setMortgages] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [houseDetails, setHouseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [activeType, setActiveType] = useState('mortgage'); // 'mortgage' | 'equity'
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const getAssignees = useCallback((itemId) => assignments.filter(a => a.entity_id === itemId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean), [assignments, members]);

  useEffect(() => {
      if (editItem && editItem.id) {
          setSelectedEmoji(editItem.emoji || (editItem.mortgage_type === 'equity' ? '💰' : '🏠'));
          setSelectedMembers(getAssignees(editItem.id).map(m => m.id));
          if (editItem.mortgage_type) setActiveType(editItem.mortgage_type);
      } else if (isNew) {
          setSelectedEmoji(activeType === 'equity' ? '💰' : '🏠');
          setSelectedMembers([currentUser?.id].filter(Boolean));
      }
  }, [editItem, isNew, activeType, getAssignees, currentUser?.id]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, assRes, assetRes, detRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/mortgages`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=finance_mortgages`),
          api.get(`/households/${householdId}/assets`),
          api.get(`/households/${householdId}/details`)
      ]);
      setMortgages(mRes.data || []);
      setAssignments(assRes.data || []);
      setAssets(assetRes.data || []);
      setHouseDetails(detRes.data || null);
    } catch (err) {
      console.error("Failed to fetch mortgage data", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    delete data.selected_members_dummy;

    const numericFields = ['total_amount', 'remaining_balance', 'interest_rate', 'monthly_payment', 'term_years', 'term_months', 'equity_loan_amount', 'equity_loan_interest_rate', 'equity_loan_cpi_rate', 'other_secured_debt', 'follow_on_rate', 'follow_on_payment', 'original_purchase_price'];
    numericFields.forEach(field => {
        if (data[field] === '' || data[field] === undefined) data[field] = 0;
    });

    try {
      let itemId = editItem?.id;
      if (isNew) {
        const res = await api.post(`/households/${householdId}/finance/mortgages`, { ...data, mortgage_type: activeType });
        itemId = res.data.id;
      } else {
        await api.put(`/households/${householdId}/finance/mortgages/${itemId}`, data);
      }
      
      const currentIds = isNew ? [] : getAssignees(itemId).map(m => m.id);
      const toAdd = selectedMembers.filter(id => !currentIds.includes(id));
      await Promise.all(toAdd.map(mid => api.post(`/households/${householdId}/finance/assignments`, {
          entity_type: 'finance_mortgages', entity_id: itemId, member_id: mid
      })));
      const toRemove = currentIds.filter(id => !selectedMembers.includes(id));
      await Promise.all(toRemove.map(mid => api.delete(`/households/${householdId}/finance/assignments/finance_mortgages/${itemId}/${mid}`)));
      
      fetchData();
      setEditItem(null);
      setIsNew(false);
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try { await api.delete(`/households/${householdId}/finance/mortgages/${id}`); fetchData(); } catch { alert("Failed to delete"); }
  };

  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, {
              entity_type: 'finance_mortgages', entity_id: assignItem.id, member_id: memberId
          });
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_mortgages`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Assignment failed", err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/finance_mortgages/${assignItem.id}/${memberId}`);
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_mortgages`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Removal failed", err); }
  };

  const calculateH2BProjections = (originalLoan, startDate, rpiRate) => {
      if (!originalLoan || !startDate) return null;
      const start = new Date(startDate);
      const baseYear = start.getFullYear();
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const taxYearStart = currentMonth >= 3 ? currentYear : currentYear - 1;

      const projections = [];
      const baseAmount = parseFloat(originalLoan);
      const rpiPlusOne = (parseFloat(rpiRate) || 4.0) + 1.0;

      let runningRate = 1.75;
      let totalPaidSoFar = 0;
      let totalProjectedLife = 0;

      for (let yearNum = 1; yearNum <= 25; yearNum++) {
          const periodStart = baseYear + yearNum - 1;
          const periodEnd = periodStart + 1;
          let rateApplied = 0;
          let annualCost = 0;
          let status = "";

          if (yearNum <= 5) {
              rateApplied = 0;
              annualCost = 0;
              status = "Interest Free";
          } else if (yearNum === 6) {
              rateApplied = 1.75;
              annualCost = baseAmount * (rateApplied / 100);
              status = periodStart < taxYearStart ? "Paid" : (periodStart === taxYearStart ? "Active" : "Forecast");
          } else {
              const multiplier = 1 + (rpiPlusOne / 100);
              rateApplied = runningRate * multiplier;
              runningRate = rateApplied;
              annualCost = baseAmount * (rateApplied / 100);
              status = periodStart < taxYearStart ? "Paid" : (periodStart === taxYearStart ? "Active" : "Forecast");
          }

          if (periodStart < taxYearStart || periodStart === taxYearStart) {
              totalPaidSoFar += annualCost;
          }
          totalProjectedLife += annualCost;

          if (periodStart === taxYearStart) status = "YOU ARE HERE";
          if (yearNum === 25) status = "Final Year";

          projections.push({
              year: yearNum,
              period: `${periodStart} – ${periodEnd}`,
              rate: rateApplied.toFixed(2) + "%",
              fee: annualCost,
              status: status,
              isCurrent: periodStart === taxYearStart
          });
      }
      return { projections, totalPaidSoFar, totalProjectedLife };
  };

  const properties = [
      { id: 'primary', name: 'Primary Residence', valuation: houseDetails?.current_valuation || 0, emoji: '🏠' },
      ...assets.filter(a => a.category?.toLowerCase() === 'property').map(a => ({
          id: a.id, name: a.name, valuation: a.purchase_value || 0, emoji: a.emoji || '🏘️'
      }))
  ];

  const groupedMortgages = properties.map(prop => {
      const associated = mortgages.filter(m => {
          if (prop.id === 'primary') return !m.asset_id || m.asset_id === 'primary';
          return String(m.asset_id) === String(prop.id);
      });
      return { ...prop, mortgages: associated };
  }).filter(p => p.mortgages.length > 0 || p.id === 'primary');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Mortgages & Equity</Typography>
                <Typography level="body-md" color="neutral">Track loans secured against your properties.</Typography>
            </Box>
            {isAdmin && (
                <Dropdown>
                    <MenuButton variant="solid" color="primary" startDecorator={<Add />} endDecorator={<ArrowDropDown />}>Add New</MenuButton>
                    <Menu placement="bottom-end">
                        <MenuItem onClick={() => { setEditItem({}); setIsNew(true); setActiveType('mortgage'); }}>Add Mortgage</MenuItem>
                        <MenuItem onClick={() => { setEditItem({}); setIsNew(true); setActiveType('equity'); }}>Add Equity Loan</MenuItem>
                    </Menu>
                </Dropdown>
            )}
        </Box>

        <Stack spacing={4}>
            {groupedMortgages.map(prop => {
                const totalDebt = prop.mortgages.reduce((sum, m) => {
                    if (m.mortgage_type === 'equity') {
                        const originalPrice = parseFloat(m.original_purchase_price) || 1;
                        const originalLoan = parseFloat(m.equity_loan_amount) || 0;
                        const sharePercent = (originalLoan / originalPrice);
                        return sum + (prop.valuation * sharePercent);
                    }
                    return sum + (parseFloat(m.remaining_balance) || 0) + (parseFloat(m.other_secured_debt) || 0);
                }, 0);
                const equityValue = (parseFloat(prop.valuation)||0) - totalDebt;
                const ltv = prop.valuation > 0 ? (totalDebt / prop.valuation) * 100 : 0;

                return (
                    <Box key={prop.id}>
                        <Sheet variant="soft" color="primary" sx={{ p: 2, mb: 2, borderRadius: 'md', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.solidBg' }}>{prop.emoji}</Avatar>
                                <Box><Typography level="title-md">{prop.name}</Typography><Typography level="body-xs">Valuation: {formatCurrency(prop.valuation)}</Typography></Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: { xs: 2, sm: 4 } }}>
                                <Box><Typography level="body-xs" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Total Debt</Typography><Typography level="title-md" color="danger">{formatCurrency(totalDebt)}</Typography></Box>
                                <Box><Typography level="body-xs" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Net Equity</Typography><Typography level="title-md" color="success">{formatCurrency(equityValue)}</Typography></Box>
                                <Box><Typography level="body-xs" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>LTV</Typography><Typography level="title-md">{ltv.toFixed(1)}%</Typography></Box>
                            </Box>
                        </Sheet>

                        <Grid container spacing={2}>
                            {prop.mortgages.map(mort => {
                                const isEquityType = mort.mortgage_type === 'equity';
                                const main = parseFloat(mort.remaining_balance) || 0;
                                const originalPrice = parseFloat(mort.original_purchase_price) || 0;
                                const originalLoan = parseFloat(mort.equity_loan_amount) || 0;
                                const sharePercent = originalPrice > 0 ? (originalLoan / originalPrice) * 100 : 0;
                                const currentRedemption = (prop.valuation * (sharePercent / 100));
                                
                                const progress = !isEquityType && (parseFloat(mort.total_amount) || 0) > 0 ? ((parseFloat(mort.total_amount) - main) / parseFloat(mort.total_amount)) * 100 : 0;
                                const h2bData = isEquityType ? calculateH2BProjections(mort.equity_loan_amount, mort.equity_loan_start_date, mort.equity_loan_cpi_rate) : null;

                                return (
                                    <Grid xs={12} lg={isEquityType ? 12 : 6} key={mort.id}>
                                        <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                                            <Grid container spacing={2}>
                                                <Grid xs={12} md={isEquityType ? 4 : 12}>
                                                    <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                                        <Avatar size="lg" sx={{ bgcolor: getEmojiColor(mort.emoji || (isEquityType ? '💰' : '🏠'), isDark) }}>{mort.emoji || (isEquityType ? '💰' : '🏠')}</Avatar>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography level="title-md">{mort.lender}</Typography>
                                                            <Typography level="body-xs" color="neutral">{isEquityType ? `Equity Loan (${sharePercent.toFixed(1)}%)` : 'Mortgage Part'}</Typography>
                                                        </Box>
                                                        <Box sx={{ textAlign: 'right' }}>
                                                            <Typography level="title-md" color="danger">{formatCurrency(isEquityType ? currentRedemption : main)}</Typography>
                                                            <Typography level="body-xs" fontWeight="bold">{isEquityType ? 'Est. Redemption' : formatPercent(mort.interest_rate)}</Typography>
                                                        </Box>
                                                    </Box>

                                                    {!isEquityType && (
                                                        <Box sx={{ mb: 2 }}><LinearProgress determinate value={Math.min(progress, 100)} color="success" sx={{ height: 6, borderRadius: 3 }} /></Box>
                                                    )}

                                                    <Grid container spacing={1}>
                                                        <Grid xs={4}><Typography level="body-xs" color="neutral">Monthly</Typography><Typography level="body-sm" fontWeight="bold">{formatCurrency(mort.monthly_payment)}</Typography></Grid>
                                                        <Grid xs={4}><Typography level="body-xs" color="neutral">Day</Typography><Typography level="body-sm" fontWeight="bold">{mort.payment_day || '-'}</Typography></Grid>
                                                        <Grid xs={4}><Typography level="body-xs" color="neutral">{isEquityType ? 'Started' : 'Term'}</Typography><Typography level="body-sm" fontWeight="bold">{isEquityType ? (mort.equity_loan_start_date || 'N/A') : (mort.term_months > 0 ? `${mort.term_years}y ${mort.term_months}m` : `${mort.term_years}y`)}</Typography></Grid>
                                                    </Grid>

                                                    {isEquityType && (
                                                        <Stack spacing={1} mt={2}>
                                                            <Sheet variant="soft" color="warning" sx={{ p: 1.5, borderRadius: 'sm' }}>
                                                                <Typography level="title-sm" startDecorator={<Sell />}>Redemption Scenario</Typography>
                                                                <Typography level="body-xs">Based on {formatCurrency(prop.valuation)} valuation, the government's share is <b>{formatCurrency(currentRedemption)}</b>.</Typography>
                                                            </Sheet>
                                                            <Sheet variant="soft" color="neutral" sx={{ p: 1.5, borderRadius: 'sm' }}>
                                                                <Typography level="title-sm" startDecorator={<AccountBalanceWallet />}>Interest Paid</Typography>
                                                                <Typography level="body-xs">To date (approx): <b>{formatCurrency(h2bData?.totalPaidSoFar)}</b></Typography>
                                                                <Typography level="body-xs" color="neutral">Projected 25y total: {formatCurrency(h2bData?.totalProjectedLife)}</Typography>
                                                            </Sheet>
                                                        </Stack>
                                                    )}
                                                </Grid>

                                                {isEquityType && h2bData && (
                                                    <Grid xs={12} md={8}>
                                                        <Sheet variant="outlined" sx={{ p: 1, borderRadius: 'sm', height: '100%', maxHeight: 350, overflowY: 'auto' }}>
                                                            <Typography level="title-sm" sx={{ mb: 1, position: 'sticky', top: 0, bgcolor: 'background.surface', zIndex: 1 }} startDecorator={<TrendingUp />}>25-Year Interest Breakdown (RPI + 1%)</Typography>
                                                            <Table size="sm" stickyHeader sx={{ '--TableCell-paddingX': '8px' }}>
                                                                <thead><tr><th>Year</th><th>Period</th><th>Rate</th><th>Monthly</th><th>Annual</th><th>Status</th></tr></thead>
                                                                <tbody>
                                                                    {h2bData.projections.map((p, idx) => (
                                                                        <tr key={idx} style={p.isCurrent ? { backgroundColor: 'var(--joy-palette-warning-softBg)' } : {}}>
                                                                            <td>{p.year}</td><td style={{ whiteSpace: 'nowrap' }}>{p.period}</td><td>{p.rate}</td><td>{formatCurrency(p.fee/12)}</td><td>{formatCurrency(p.fee)}</td>
                                                                            <td>
                                                                                <Typography level="body-xs" fontWeight="bold" color={p.isCurrent ? "primary" : "neutral"}>{p.status}</Typography>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </Table>
                                                        </Sheet>
                                                    </Grid>
                                                )}
                                            </Grid>

                                            {!isEquityType && (mort.follow_on_rate > 0 || mort.follow_on_payment > 0) && (
                                                <Sheet variant="soft" sx={{ mt: 2, p: 1, borderRadius: 'sm', bgcolor: 'background.level1' }}>
                                                    <Typography level="body-xs" color="neutral" startDecorator={<TrendingUp sx={{ fontSize: '0.9rem' }}/>}>After fixed rate: <b>{formatPercent(mort.follow_on_rate)}</b> ({formatCurrency(mort.follow_on_payment)}/mo)</Typography>
                                                </Sheet>
                                            )}

                                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <AvatarGroup size="sm">{getAssignees(mort.id).map(m => (<Avatar key={m.id} sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>))}<IconButton size="sm" onClick={() => setAssignItem(mort)} sx={{ borderRadius: '50%' }}><GroupAdd /></IconButton></AvatarGroup>
                                                <Box><IconButton size="sm" variant="plain" onClick={() => { setEditItem(mort); setIsNew(false); }}><Edit /></IconButton><IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(mort.id)}><Delete /></IconButton></Box>
                                            </Box>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                );
            })}
        </Stack>

        <Modal open={Boolean(editItem)} onClose={() => { setEditItem(null); setIsNew(false); }}>
            <ModalDialog sx={{ width: '100%', maxWidth: 700, maxHeight: '95vh', overflowY: 'auto' }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ position: 'relative' }}>
                        <Avatar size="lg" sx={{ '--Avatar-size': '64px', bgcolor: getEmojiColor(selectedEmoji, isDark), fontSize: '2rem', cursor: 'pointer' }} onClick={() => setEmojiPicker(true)}>{selectedEmoji}</Avatar>
                        <IconButton size="sm" variant="solid" color="primary" sx={{ position: 'absolute', bottom: -4, right: -4, borderRadius: '50%', border: '2px solid', borderColor: 'background.surface' }} onClick={() => setEmojiPicker(true)}><Edit sx={{ fontSize: '0.8rem' }} /></IconButton>
                    </Box>
                    <Box sx={{ flexGrow: 1 }}><DialogTitle>{isNew ? (activeType === 'equity' ? 'Add Equity Loan' : 'Add Mortgage') : 'Edit Mortgage Details'}</DialogTitle><Typography level="body-sm" color="neutral">Capture professional statement data with full decimal precision.</Typography></Box>
                </Box>
                
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <input type="hidden" name="emoji" value={selectedEmoji} />
                        <Stack spacing={2}>
                            <Grid container spacing={2}>
                                <Grid xs={12} md={6}><AppSelect label="Linked Property" name="asset_id" defaultValue={String(editItem?.asset_id || 'primary')} options={[{ value: 'primary', label: '🏠 Primary Residence' }, ...assets.filter(a => a.category?.toLowerCase() === 'property').map(a => ({ value: String(a.id), label: `${a.emoji || '🏘️'} ${a.name}` }))]} /></Grid>
                                <Grid xs={12} md={6}><FormControl required><FormLabel>Lender</FormLabel><Input name="lender" defaultValue={editItem?.lender} placeholder="e.g. Nationwide" /></FormControl></Grid>
                            </Grid>

                            {activeType === 'mortgage' ? (
                                <>
                                    <Divider><Chip variant="soft" size="sm">CURRENT FIXED RATE PERIOD</Chip></Divider>
                                    <Grid container spacing={2}>
                                        <Grid xs={12} sm={6} md={4}><FormControl required><FormLabel>Total Loan Amount (£)</FormLabel><Input name="total_amount" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={editItem?.total_amount} /></FormControl></Grid>
                                        <Grid xs={12} sm={6} md={4}><FormControl required><FormLabel>Current Balance (£)</FormLabel><Input name="remaining_balance" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={editItem?.remaining_balance} /></FormControl></Grid>
                                        <Grid xs={12} sm={6} md={4}><FormControl required><FormLabel>Interest Rate (%)</FormLabel><Input name="interest_rate" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={editItem?.interest_rate} /></FormControl></Grid>
                                        <Grid xs={12} sm={6} md={4}><FormControl required><FormLabel>Monthly Payment (£)</FormLabel><Input name="monthly_payment" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={editItem?.monthly_payment} /></FormControl></Grid>
                                        <Grid xs={12} sm={6} md={4}><FormControl><FormLabel>Fixed Rate Expiry</FormLabel><Input name="fixed_rate_expiry" type="date" defaultValue={editItem?.fixed_rate_expiry} /></FormControl></Grid>
                                                                <Grid xs={6}>
                                                                    <FormControl required>
                                                                        <FormLabel>Payment Day</FormLabel>
                                                                        <Input name="payment_day" type="number" min="1" max="31" defaultValue={editItem?.payment_day} />
                                                                    </FormControl>
                                                                </Grid>
                                                                <Grid xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <Checkbox 
                                                                        label="Nearest Working Day (Next)" 
                                                                        name="nearest_working_day"
                                                                        defaultChecked={editItem?.nearest_working_day !== 0}
                                                                        value="1"
                                                                        sx={{ mt: 3 }}
                                                                    />
                                                                </Grid>
                                    </Grid>
                                    <Divider><Chip variant="soft" size="sm">REMAINING TERM</Chip></Divider>
                                    <Grid container spacing={2}>
                                        <Grid xs={6}><FormControl><FormLabel>Years</FormLabel><Input name="term_years" type="number" defaultValue={editItem?.term_years} /></FormControl></Grid>
                                        <Grid xs={6}><FormControl><FormLabel>Months</FormLabel><Input name="term_months" type="number" defaultValue={editItem?.term_months || 0} /></FormControl></Grid>
                                        <Grid xs={12}><AppSelect label="Repayment Type" name="repayment_type" defaultValue={editItem?.repayment_type || 'Repayment'} options={[{ value: 'Repayment', label: 'Capital & Interest (Repayment)' }, { value: 'Interest Only', label: 'Interest Only' }]} /></Grid>
                                    </Grid>
                                    <Divider><Chip variant="soft" color="warning" size="sm">FOLLOW-ON RATE (AFTER FIXED ENDS)</Chip></Divider>
                                    <Grid container spacing={2}>
                                        <Grid xs={12} sm={6}><FormControl><FormLabel>Expected Follow-on Rate (%)</FormLabel><Input name="follow_on_rate" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={editItem?.follow_on_rate} placeholder="e.g. 8.49" /></FormControl></Grid>
                                        <Grid xs={12} sm={6}><FormControl><FormLabel>Follow-on Monthly Payment (£)</FormLabel><Input name="follow_on_payment" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={editItem?.follow_on_payment} placeholder="e.g. 1187.36" /></FormControl></Grid>
                                    </Grid>
                                </>
                            ) : (
                                <>
                                    <Divider><Chip variant="soft" color="warning" size="sm">HELP TO BUY (2018) DETAILS</Chip></Divider>
                                    <Grid container spacing={2}>
                                        <Grid xs={12} sm={6}><FormControl required><FormLabel>Original Purchase Price (£)</FormLabel><Input name="original_purchase_price" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={editItem?.original_purchase_price} /></FormControl></Grid>
                                        <Grid xs={12} sm={6}><FormControl required><FormLabel>Original Loan Amount (£)</FormLabel><Input name="equity_loan_amount" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={editItem?.equity_loan_amount} /></FormControl></Grid>
                                        <Grid xs={12} sm={6}><FormControl required><FormLabel>Completion Date</FormLabel><Input name="equity_loan_start_date" type="date" defaultValue={editItem?.equity_loan_start_date} /></FormControl></Grid>
                                        <Grid xs={12} sm={6}><FormControl required><FormLabel>Estimated Future RPI (%)</FormLabel><Input name="equity_loan_cpi_rate" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={editItem?.equity_loan_cpi_rate || 4.0} /></FormControl></Grid>
                                        <Grid xs={12} sm={6}><FormControl><FormLabel>Current Monthly Payment (£)</FormLabel><Input name="monthly_payment" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={editItem?.monthly_payment} /></FormControl></Grid>
                                        <Grid xs={12} sm={6}><FormControl><FormLabel>Payment Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={editItem?.payment_day} /></FormControl></Grid>
                                    </Grid>
                                </>
                            )}
                            <FormControl><FormLabel>Assign Borrowers / Owners</FormLabel><Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{members.filter(m => m.type !== 'pet').map(m => { const isSelected = selectedMembers.includes(m.id); return <Chip key={m.id} variant={isSelected ? 'solid' : 'outlined'} color={isSelected ? 'primary' : 'neutral'} onClick={() => setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} startDecorator={<Avatar size="sm">{m.emoji}</Avatar>}>{m.name}</Chip> })}</Box></FormControl>
                        </Stack>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                            {!isNew && <Button color="danger" variant="soft" onClick={() => { handleDelete(editItem.id); setEditItem(null); }}>Delete</Button>}
                            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                <Button variant="plain" color="neutral" onClick={() => { setEditItem(null); setIsNew(false); }}>Cancel</Button>
                                <Button type="submit" color="primary">Save Mortgage Details</Button>
                            </Box>
                        </Box>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={Boolean(assignItem)} onClose={() => setAssignItem(null)}>
            <ModalDialog size="sm">
                <DialogTitle>Assign Borrowers</DialogTitle>
                <DialogContent>
                    <Stack spacing={1}>
                        {members.filter(m => m.type !== 'pet').map(m => {
                            const isAssigned = getAssignees(assignItem?.id).some(a => a.id === m.id);
                            return (
                                <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Avatar size="sm" sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar><Typography>{m.name}</Typography></Box>
                                    {isAssigned ? <Button size="sm" color="danger" variant="soft" onClick={() => handleUnassignMember(m.id)}>Remove</Button> : <Button size="sm" variant="soft" onClick={() => handleAssignMember(m.id)}>Assign</Button>}
                                </Box>
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setAssignItem(null)}>Done</Button></DialogActions>
            </ModalDialog>
        </Modal>

        <EmojiPicker open={emojiPicker} onClose={() => setEmojiPicker(false)} onEmojiSelect={(emoji) => { setSelectedEmoji(emoji); setEmojiPicker(false); }} isDark={isDark} />
    </Box>
  );
}
