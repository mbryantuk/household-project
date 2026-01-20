import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  AvatarGroup, LinearProgress, Table, Sheet
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd, Home, InfoOutlined } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

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
  const [loading, setLoading] = useState(true);
  
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  useEffect(() => {
      if (editItem) {
          setSelectedEmoji(editItem.emoji || '🏠');
          setSelectedMembers(getAssignees(editItem.id).map(m => m.id));
      } else if (isNew) {
          setSelectedEmoji('🏠');
          setSelectedMembers([currentUser?.id].filter(Boolean));
      }
  }, [editItem, isNew]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/mortgages`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=finance_mortgages`)
      ]);
      setMortgages(res.data || []);
      setAssignments(assRes.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    try {
      let itemId = editItem?.id;
      if (isNew) {
        const res = await api.post(`/households/${householdId}/finance/mortgages`, data);
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
    } catch (err) { alert("Failed to save: " + err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this mortgage?")) return;
    try { await api.delete(`/households/${householdId}/finance/mortgages/${id}`); fetchData(); } catch (err) { alert("Failed to delete"); }
  };

  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, {
              entity_type: 'finance_mortgages', entity_id: assignItem.id, member_id: memberId
          });
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_mortgages`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error(err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/finance_mortgages/${assignItem.id}/${memberId}`);
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_mortgages`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error(err); }
  };

  const getAssignees = (itemId) => assignments.filter(a => a.entity_id === itemId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean);

  const calculateH2BProjections = (amount, startDate, initialRate, cpiRate) => {
      if (!amount || !startDate) return null;
      const start = new Date(startDate);
      const now = new Date();
      const yearsDiff = now.getFullYear() - start.getFullYear();
      
      const projections = [];
      const baseAmount = parseFloat(amount);
      let currentRate = parseFloat(initialRate) || 1.75;
      const cpiPlusTwo = (parseFloat(cpiRate) || 2.0) + 2.0;

      for (let i = 1; i <= 5; i++) {
          const year = now.getFullYear() + i - 1;
          const ageOfLoan = year - start.getFullYear();
          
          let annualFee = 0;
          let rateDisplay = "0.00%";
          
          if (ageOfLoan >= 5) { // Year 6 onwards
              // Calculate rate for this specific year
              // If it's the first year of interest (age 5, which is year 6)
              if (ageOfLoan === 5) {
                  annualFee = baseAmount * (currentRate / 100);
                  rateDisplay = currentRate.toFixed(2) + "%";
              } else {
                  // Escalate rate from previous year
                  // This is a simplified escalation: Rate = PrevRate * (1 + (CPI+2)/100)
                  const escalationFactor = 1 + (cpiPlusTwo / 100);
                  // We need to calculate the rate for Year 6 first, then escalate it for each year after
                  let year6Rate = currentRate;
                  let escalatedRate = year6Rate;
                  for (let y = 6; y <= ageOfLoan; y++) {
                      escalatedRate *= escalationFactor;
                  }
                  annualFee = baseAmount * (escalatedRate / 100);
                  rateDisplay = escalatedRate.toFixed(2) + "%";
              }
          }

          projections.push({
              year,
              age: ageOfLoan + 1,
              fee: annualFee,
              rate: rateDisplay
          });
      }
      return projections;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Mortgages</Typography>
                <Typography level="body-md" color="neutral">Track property loans and home equity.</Typography>
            </Box>
            {isAdmin && (
                <Button startDecorator={<Add />} onClick={() => { setEditItem({}); setIsNew(true); }}>
                    Add Mortgage
                </Button>
            )}
        </Box>

        <Grid container spacing={3}>
            {mortgages.map(mort => {
                const total = parseFloat(mort.total_amount) || 0;
                const remaining = parseFloat(mort.remaining_balance) || 0;
                const equity = total - remaining;
                const progress = total > 0 ? (equity / total) * 100 : 0;
                
                const h2bAmount = parseFloat(mort.equity_loan_amount) || 0;
                const h2bProjections = h2bAmount > 0 ? calculateH2BProjections(
                    mort.equity_loan_amount, 
                    mort.equity_loan_start_date, 
                    mort.equity_loan_interest_rate, 
                    mort.equity_loan_cpi_rate
                ) : null;

                return (
                    <Grid xs={12} key={mort.id}>
                        <Card variant="outlined" sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, p: 3 }}>
                            <Box sx={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 200 }}>
                                <Avatar size="xl" sx={{ '--Avatar-size': '80px', bgcolor: getEmojiColor(mort.emoji || '🏠', isDark), fontSize: '2.5rem' }}>
                                    {mort.emoji || '🏠'}
                                </Avatar>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography level="title-lg">{mort.lender}</Typography>
                                    <Typography level="body-sm" color="neutral">{mort.property_address}</Typography>
                                </Box>
                                <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                                    <IconButton variant="soft" color="neutral" size="sm" onClick={() => { setEditItem(mort); setIsNew(false); }}><Edit /></IconButton>
                                    <IconButton variant="soft" color="neutral" size="sm" onClick={() => setAssignItem(mort)}><GroupAdd /></IconButton>
                                </Box>
                            </Box>

                            <Divider orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />

                            <Box sx={{ flexGrow: 1 }}>
                                <Grid container spacing={2}>
                                    <Grid xs={12} md={6}>
                                        <Typography level="body-xs" color="neutral" textTransform="uppercase" fontWeight="bold">Main Mortgage Balance</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                                            <Typography level="h2" color="danger">{formatCurrency(remaining)}</Typography>
                                            <Typography level="body-sm" color="neutral">of {formatCurrency(total)}</Typography>
                                        </Box>
                                        <Box sx={{ mb: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography level="body-xs">Principal Paid / Equity</Typography>
                                                <Typography level="body-xs" fontWeight="bold">{progress.toFixed(2)}%</Typography>
                                            </Box>
                                            <LinearProgress determinate value={Math.min(progress, 100)} color="success" sx={{ height: 8, borderRadius: 4 }} />
                                        </Box>
                                        
                                        <Grid container spacing={2}>
                                            <Grid xs={6}>
                                                <Typography level="body-xs" color="neutral">Monthly Payment</Typography>
                                                <Typography level="body-md" fontWeight="bold">{formatCurrency(mort.monthly_payment)}</Typography>
                                            </Grid>
                                            <Grid xs={6}>
                                                <Typography level="body-xs" color="neutral">Interest Rate</Typography>
                                                <Typography level="body-md" fontWeight="bold">{formatPercent(mort.interest_rate)}</Typography>
                                            </Grid>
                                            <Grid xs={6}>
                                                <Typography level="body-xs" color="neutral">Term Remaining</Typography>
                                                <Typography level="body-md" fontWeight="bold">{mort.term_years} Years</Typography>
                                            </Grid>
                                            <Grid xs={6}>
                                                <Typography level="body-xs" color="neutral">Fixed Expiry</Typography>
                                                <Typography level="body-md" fontWeight="bold" color={mort.fixed_rate_expiry ? 'primary' : 'neutral'}>{mort.fixed_rate_expiry || 'N/A'}</Typography>
                                            </Grid>
                                        </Grid>
                                    </Grid>

                                    {h2bAmount > 0 && (
                                        <Grid xs={12} md={6}>
                                            <Sheet variant="soft" color="warning" sx={{ p: 2, borderRadius: 'md', height: '100%' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    <InfoOutlined color="warning" />
                                                    <Typography level="title-md">Help to Buy Equity Loan</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
                                                    <Typography level="h3">{formatCurrency(h2bAmount)}</Typography>
                                                    <Typography level="body-xs" color="neutral">Started: {mort.equity_loan_start_date}</Typography>
                                                </Box>

                                                <Typography level="body-xs" fontWeight="bold" sx={{ mb: 1 }}>5-YEAR INTEREST PROJECTION (ESTIMATED)</Typography>
                                                <Table size="sm" sx={{ '--TableCell-paddingX': '4px' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '25%' }}>Year</th>
                                                            <th style={{ width: '25%' }}>Loan Age</th>
                                                            <th style={{ width: '25%' }}>Est. Rate</th>
                                                            <th style={{ textAlign: 'right' }}>Annual Fee</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {h2bProjections.map((p, idx) => (
                                                            <tr key={idx}>
                                                                <td>{p.year}</td>
                                                                <td>Yr {p.age}</td>
                                                                <td>{p.rate}</td>
                                                                <td style={{ textAlign: 'right' }}>{p.fee > 0 ? formatCurrency(p.fee) : '£0.00'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                                <Typography level="body-xs" sx={{ mt: 1, fontStyle: 'italic', opacity: 0.8 }}>
                                                    * Projection based on {formatPercent(mort.equity_loan_cpi_rate)} CPI. 
                                                    Fees typically start in Year 6.
                                                </Typography>
                                            </Sheet>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>

        <Modal open={Boolean(editItem)} onClose={() => { setEditItem(null); setIsNew(false); }}>
            <ModalDialog sx={{ width: '100%', maxWidth: 600 }}>
                <DialogTitle>{isNew ? 'Add Mortgage' : 'Edit Mortgage'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <FormControl required><FormLabel>Lender</FormLabel><Input name="lender" defaultValue={editItem?.lender} /></FormControl>
                                <FormControl required><FormLabel>Property Address</FormLabel><Input name="property_address" defaultValue={editItem?.property_address} /></FormControl>
                            </Box>
                            
                            <Divider sx={{ my: 1 }}><Chip variant="soft" size="sm">MORTGAGE DETAILS</Chip></Divider>
                            
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                                <FormControl required><FormLabel>Total Loan (£)</FormLabel><Input name="total_amount" type="number" step="0.01" defaultValue={editItem?.total_amount} /></FormControl>
                                <FormControl required><FormLabel>Remaining (£)</FormLabel><Input name="remaining_balance" type="number" step="0.01" defaultValue={editItem?.remaining_balance} /></FormControl>
                                <FormControl required><FormLabel>Rate (%)</FormLabel><Input name="interest_rate" type="number" step="0.01" defaultValue={editItem?.interest_rate} /></FormControl>
                                <FormControl required><FormLabel>Monthly (£)</FormLabel><Input name="monthly_payment" type="number" step="0.01" defaultValue={editItem?.monthly_payment} /></FormControl>
                                <FormControl><FormLabel>Term (Yrs)</FormLabel><Input name="term_years" type="number" defaultValue={editItem?.term_years} /></FormControl>
                                <FormControl><FormLabel>Fixed Expiry</FormLabel><Input name="fixed_rate_expiry" type="date" defaultValue={editItem?.fixed_rate_expiry} /></FormControl>
                            </Box>

                            <Divider sx={{ my: 1 }}><Chip variant="soft" color="warning" size="sm">EQUITY LOAN (H2B)</Chip></Divider>
                            
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <FormControl><FormLabel>Equity Loan Amount (£)</FormLabel><Input name="equity_loan_amount" type="number" step="0.01" defaultValue={editItem?.equity_loan_amount} placeholder="0.00" /></FormControl>
                                <FormControl><FormLabel>Start Date</FormLabel><Input name="equity_loan_start_date" type="date" defaultValue={editItem?.equity_loan_start_date} /></FormControl>
                                <FormControl><FormLabel>Initial Fee Rate (%)</FormLabel><Input name="equity_loan_interest_rate" type="number" step="0.01" defaultValue={editItem?.equity_loan_interest_rate || 1.75} /></FormControl>
                                <FormControl><FormLabel>Est. CPI Rate (%)</FormLabel><Input name="equity_loan_cpi_rate" type="number" step="0.01" defaultValue={editItem?.equity_loan_cpi_rate || 2.0} /></FormControl>
                            </Box>

                            <FormControl><FormLabel>Emoji</FormLabel>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Button variant="outlined" color="neutral" onClick={() => setEmojiPicker(true)} sx={{ minWidth: 48 }}><Avatar size="sm" sx={{ bgcolor: getEmojiColor(selectedEmoji, isDark) }}>{selectedEmoji}</Avatar></Button>
                                    <Input type="hidden" name="emoji" value={selectedEmoji} />
                                </Box>
                            </FormControl>
                            
                            <FormControl><FormLabel>Assign Members</FormLabel>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {members.filter(m => m.type !== 'pet').map(m => {
                                        const isSelected = selectedMembers.includes(m.id);
                                        return <Chip key={m.id} variant={isSelected ? 'solid' : 'outlined'} color={isSelected ? 'primary' : 'neutral'} onClick={() => setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} startDecorator={<Avatar size="sm">{m.emoji}</Avatar>}>{m.name}</Chip>
                                    })}
                                </Box>
                            </FormControl>
                        </Stack>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                            {!isNew && <Button color="danger" variant="soft" onClick={() => { handleDelete(editItem.id); setEditItem(null); }}>Delete</Button>}
                            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                <Button variant="plain" color="neutral" onClick={() => { setEditItem(null); setIsNew(false); }}>Cancel</Button>
                                <Button type="submit" color="primary">Save Mortgage</Button>
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
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>
                                        <Typography>{m.name}</Typography>
                                    </Box>
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