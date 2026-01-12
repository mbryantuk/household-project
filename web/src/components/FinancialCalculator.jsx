import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Sheet, Typography, IconButton, Button, Input, FormControl, FormLabel,
  Tabs, TabList, Tab, TabPanel, Divider, RadioGroup, Radio, Stack
} from '@mui/joy';
import { 
  Close, DragIndicator, OpenInNew, Savings, AccountBalance, Home
} from '@mui/icons-material';

export default function FinancialCalculator({ onClose, isPopout = false, isDark = false, isDocked = false, onPopout }) {
  const [pos, setPos] = useState({ x: 200, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(true);
  const containerRef = useRef(null);

  const [tabIndex, setTabIndex] = useState(0);

  const [savingsPrincipal, setSavingsPrincipal] = useState('');
  const [savingsRate, setSavingsRate] = useState('');
  const [savingsYears, setSavingsYears] = useState('');
  const [savingsContribution, setSavingsContribution] = useState('');
  const [savingsResult, setSavingsResult] = useState(null);

  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanRate, setLoanRate] = useState('');
  const [loanYears, setLoanYears] = useState('');
  const [loanResult, setLoanResult] = useState(null);

  const [mortgageAmount, setMortgageAmount] = useState('');
  const [mortgageRate, setMortgageRate] = useState('');
  const [mortgageYears, setMortgageYears] = useState('');
  const [mortgageType, setMortgageType] = useState('repayment');
  const [mortgageResult, setMortgageResult] = useState(null);

  const calculateSavings = () => {
    const P = parseFloat(savingsPrincipal) || 0;
    const r = (parseFloat(savingsRate) || 0) / 100 / 12;
    const n = (parseFloat(savingsYears) || 0) * 12;
    const PMT = parseFloat(savingsContribution) || 0;
    if (n <= 0) return;
    let fv = r === 0 ? P + (PMT * n) : P * Math.pow(1 + r, n) + (PMT * (Math.pow(1 + r, n) - 1)) / r;
    setSavingsResult(fv);
  };

  const calculateLoan = () => {
    const P = parseFloat(loanPrincipal) || 0;
    const r = (parseFloat(loanRate) || 0) / 100 / 12;
    const n = (parseFloat(loanYears) || 0) * 12;
    if (n <= 0 || P <= 0) return;
    let payment = r === 0 ? P / n : P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    setLoanResult(payment);
  };

  const calculateMortgage = () => {
    const P = parseFloat(mortgageAmount) || 0;
    const r = (parseFloat(mortgageRate) || 0) / 100 / 12;
    const n = (parseFloat(mortgageYears) || 0) * 12;
    if (n <= 0 || P <= 0) return;
    let monthly = mortgageType === 'repayment' ? (r === 0 ? P / n : P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : P * r;
    const totalPaid = monthly * n;
    setMortgageResult({ monthly, totalPaid, totalInterest: totalPaid - P });
  };

  const onMouseDown = (e) => {
    if (isPopout || isDocked || e.button !== 0) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setRel({ x: e.pageX - rect.left, y: e.pageY - rect.top });
    e.stopPropagation();
  };

  useEffect(() => {
    if (isPopout || isDocked) return;
    const onMouseMove = (e) => { if (isDragging) setPos({ x: e.pageX - rel.x, y: e.pageY - rel.y }); };
    const onMouseUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp); }
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [isDragging, rel, isPopout, isDocked]);

  return (
    <Sheet
      ref={containerRef} variant="outlined" tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false); }}
      sx={{
        position: (isPopout || isDocked) ? 'relative' : 'fixed',
        left: (isPopout || isDocked) ? 0 : pos.x,
        top: (isPopout || isDocked) ? 0 : pos.y,
        width: (isPopout || isDocked) ? '100%' : 400,
        height: (isPopout || isDocked) ? '100%' : 550,
        zIndex: 1300, display: 'flex', flexDirection: 'column',
        borderRadius: isPopout || isDocked ? 0 : 'md', boxShadow: 'lg', 
        opacity: isPopout || isDocked ? 1 : (isFocused ? 1 : 0.6), 
        transition: 'opacity 0.2s', overflow: 'hidden'
      }}
    >
      <Box onMouseDown={onMouseDown} sx={{ p: 1, bgcolor: 'background.level2', display: 'flex', alignItems: 'center', cursor: isDocked ? 'default' : 'move' }}>
        {!isDocked && !isPopout && <DragIndicator fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
        <Typography level="title-sm" sx={{ flexGrow: 1 }}>Financial Tools</Typography>
        {!isPopout && <IconButton size="sm" variant="plain" onClick={onPopout}><OpenInNew fontSize="inherit" /></IconButton>}
        <IconButton size="sm" variant="plain" onClick={onClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.surface', overflow: 'auto' }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
            {/* STABLE TAB LIST: Fixed gap, no flex-grow on tabs to prevent spacing creep */}
            <TabList disableUnderline sx={{ p: 0.5, gap: 1, borderRadius: 'sm', bgcolor: 'background.level1', mx: 2, mt: 2 }}>
                <Tab disableIndicator variant={tabIndex === 0 ? 'solid' : 'plain'} color="success" value={0} sx={{ borderRadius: 'sm', px: 2 }}><Savings sx={{ mr: 1 }}/> Savings</Tab>
                <Tab disableIndicator variant={tabIndex === 1 ? 'solid' : 'plain'} color="primary" value={1} sx={{ borderRadius: 'sm', px: 2 }}><AccountBalance sx={{ mr: 1 }}/> Loan</Tab>
                <Tab disableIndicator variant={tabIndex === 2 ? 'solid' : 'plain'} color="danger" value={2} sx={{ borderRadius: 'sm', px: 2 }}><Home sx={{ mr: 1 }}/> Mortgage</Tab>
            </TabList>
            
            <TabPanel value={0} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl><FormLabel>Starting Amount (£)</FormLabel><Input type="number" value={savingsPrincipal} onChange={e => setSavingsPrincipal(e.target.value)} /></FormControl>
                <FormControl><FormLabel>Monthly Contribution (£)</FormLabel><Input type="number" value={savingsContribution} onChange={e => setSavingsContribution(e.target.value)} /></FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}><FormControl sx={{ flex: 1 }}><FormLabel>Interest Rate (%)</FormLabel><Input type="number" value={savingsRate} onChange={e => setSavingsRate(e.target.value)} /></FormControl><FormControl sx={{ flex: 1 }}><FormLabel>Duration (Years)</FormLabel><Input type="number" value={savingsYears} onChange={e => setSavingsYears(e.target.value)} /></FormControl></Box>
                <Button color="success" onClick={calculateSavings}>Calculate Future Value</Button>
                {savingsResult !== null && <Box sx={{ p: 2, bgcolor: 'success.softBg', borderRadius: 'md', textAlign: 'center' }}><Typography level="body-sm">Future Value</Typography><Typography level="h3" color="success">£{savingsResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box>}
            </TabPanel>

            <TabPanel value={1} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl><FormLabel>Loan Amount (£)</FormLabel><Input type="number" value={loanPrincipal} onChange={e => setLoanPrincipal(e.target.value)} /></FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}><FormControl sx={{ flex: 1 }}><FormLabel>Interest Rate (%)</FormLabel><Input type="number" value={loanRate} onChange={e => setLoanRate(e.target.value)} /></FormControl><FormControl sx={{ flex: 1 }}><FormLabel>Term (Years)</FormLabel><Input type="number" value={loanYears} onChange={e => setLoanYears(e.target.value)} /></FormControl></Box>
                <Button color="primary" onClick={calculateLoan}>Calculate Payment</Button>
                {loanResult !== null && <Box sx={{ p: 2, bgcolor: 'primary.softBg', borderRadius: 'md', textAlign: 'center' }}><Typography level="body-sm">Monthly Payment</Typography><Typography level="h3" color="primary">£{loanResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box>}
            </TabPanel>

            <TabPanel value={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl><FormLabel>Mortgage Amount (£)</FormLabel><Input type="number" value={mortgageAmount} onChange={e => setMortgageAmount(e.target.value)} /></FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}><FormControl sx={{ flex: 1 }}><FormLabel>Interest Rate (%)</FormLabel><Input type="number" value={mortgageRate} onChange={e => setMortgageRate(e.target.value)} /></FormControl><FormControl sx={{ flex: 1 }}><FormLabel>Term (Years)</FormLabel><Input type="number" value={mortgageYears} onChange={e => setMortgageYears(e.target.value)} /></FormControl></Box>
                <FormControl><FormLabel>Repayment Type</FormLabel><RadioGroup row value={mortgageType} onChange={(e) => setMortgageType(e.target.value)}><Radio value="repayment" label="Repayment" variant="outlined" /><Radio value="interestOnly" label="Interest Only" variant="outlined" /></RadioGroup></FormControl>
                <Button color="danger" onClick={calculateMortgage}>Calculate Mortgage</Button>
                {mortgageResult && <Box sx={{ p: 2, bgcolor: 'danger.softBg', borderRadius: 'md', display: 'flex', flexDirection: 'column', gap: 1 }}><Box sx={{ textAlign: 'center' }}><Typography level="body-sm">Monthly Payment</Typography><Typography level="h3" color="danger">£{mortgageResult.monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box><Divider /><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-xs">Total Interest:</Typography><Typography level="body-xs" fontWeight="bold">£{mortgageResult.totalInterest.toLocaleString()}</Typography></Box><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-xs">Total Paid:</Typography><Typography level="body-xs" fontWeight="bold">£{mortgageResult.totalPaid.toLocaleString()}</Typography></Box></Box>}
            </TabPanel>
        </Tabs>
      </Box>
    </Sheet>
  );
}