import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Sheet, Typography, IconButton, Button, Input, FormControl, FormLabel,
  Tabs, TabList, Tab, TabPanel, Divider, RadioGroup, Radio, Alert
} from '@mui/joy';
import { 
  Close, DragIndicator, OpenInNew, Savings, AccountBalance, Home, ReceiptLong, LocalOffer
} from '@mui/icons-material';

export default function FinancialCalculator({ onClose, isPopout = false, isDark = false, isDocked = false, onPopout }) {
  const [pos, setPos] = useState({ x: 200, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(true);
  const containerRef = useRef(null);

  // Tab State: 0 = Savings, 1 = Loan, 2 = Mortgage, 3 = SDLT
  const [tabIndex, setTabIndex] = useState(0);

  // Savings State
  const [savingsPrincipal, setSavingsPrincipal] = useState('');
  const [savingsRate, setSavingsRate] = useState('');
  const [savingsYears, setSavingsYears] = useState('');
  const [savingsContribution, setSavingsContribution] = useState('');
  const [savingsResult, setSavingsResult] = useState(null);

  // Loan State
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanRate, setLoanRate] = useState('');
  const [loanYears, setLoanYears] = useState('');
  const [loanResult, setLoanResult] = useState(null);

  // Mortgage Specific State
  const [mortgageAmount, setMortgageAmount] = useState('');
  const [mortgageRate, setMortgageRate] = useState('');
  const [mortgageYears, setMortgageYears] = useState('');
  const [mortgageType, setMortgageType] = useState('repayment');
  const [mortgageResult, setMortgageResult] = useState(null);

  // SDLT (UK Stamp Duty) State
  const [propertyPrice, setPropertyPrice] = useState('');
  const [buyerType, setStandardBuyer] = useState('standard'); // standard, firstTime, secondHome
  const [sdltResult, setSdltResult] = useState(null);

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

    let monthly = 0;
    if (mortgageType === 'repayment') {
        monthly = r === 0 ? P / n : P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    } else {
        monthly = P * r; // Interest Only
    }
    
    const totalPaid = monthly * n;
    const totalInterest = totalPaid - P;
    setMortgageResult({ monthly, totalPaid, totalInterest });
  };

  const calculateSDLT = () => {
    const price = parseFloat(propertyPrice) || 0;
    let tax = 0;

    if (buyerType === 'firstTime') {
        if (price <= 425000) tax = 0;
        else if (price <= 625000) tax = (price - 425000) * 0.05;
        else {
            // Over 625k, normal rules apply for first time buyers
            tax = calculateStandardSDLT(price);
        }
    } else {
        tax = calculateStandardSDLT(price);
        if (buyerType === 'secondHome') {
            tax += price * 0.03; // 3% surcharge
        }
    }
    setSdltResult(tax);
  };

  const calculateStandardSDLT = (price) => {
    let tax = 0;
    if (price > 1500000) { tax += (price - 1500000) * 0.12; price = 1500000; }
    if (price > 925000) { tax += (price - 925000) * 0.10; price = 925000; }
    if (price > 250000) { tax += (price - 250000) * 0.05; price = 250000; }
    return tax;
  };

  // Drag Logic
  const onMouseDown = (e) => {
    if (isPopout || isDocked) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setRel({ x: e.pageX - rect.left, y: e.pageY - rect.top });
    e.stopPropagation();
  };

  useEffect(() => {
    if (isPopout || isDocked) return;
    const onMouseMove = (e) => { if (isDragging) setPos({ x: e.pageX - rel.x, y: e.pageY - rel.y }); };
    const onMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
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
        height: (isPopout || isDocked) ? '100%' : 580,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isPopout || isDocked ? 0 : 'md',
        boxShadow: 'lg', 
        opacity: isPopout || isDocked ? 1 : (isFocused ? 1 : 0.6), 
        transition: 'opacity 0.2s',
        overflow: 'hidden'
      }}
    >
      <Box onMouseDown={onMouseDown} sx={{ p: 1, bgcolor: 'background.level2', color: 'text.primary', display: 'flex', alignItems: 'center', cursor: isDocked ? 'default' : 'move' }}>
        {!isDocked && !isPopout && <DragIndicator fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
        <Typography level="title-sm" sx={{ flexGrow: 1, color: 'inherit' }}>Financial Tools</Typography>
        {!isPopout && <IconButton size="sm" variant="plain" color="inherit" onClick={onPopout}><OpenInNew fontSize="inherit" /></IconButton>}
        <IconButton size="sm" variant="plain" color="inherit" onClick={onClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.surface', overflow: 'auto' }}>
        <Tabs 
            value={tabIndex} 
            onChange={(e, v) => setTabIndex(v)}
            sx={{ bgcolor: 'transparent' }}
        >
            <TabList disableUnderline sx={{ p: 0.5, gap: 0.5, borderRadius: 'sm', bgcolor: 'background.level1', mx: 2, mt: 2, flexWrap: 'wrap' }}>
                <Tab disableIndicator variant={tabIndex === 0 ? 'solid' : 'plain'} color={tabIndex === 0 ? 'success' : 'neutral'} value={0} sx={{ borderRadius: 'sm', flex: 1 }}><Savings sx={{ mr: 1 }}/> Savings</Tab>
                <Tab disableIndicator variant={tabIndex === 1 ? 'solid' : 'plain'} color={tabIndex === 1 ? 'primary' : 'neutral'} value={1} sx={{ borderRadius: 'sm', flex: 1 }}><AccountBalance sx={{ mr: 1 }}/> Loan</Tab>
                <Tab disableIndicator variant={tabIndex === 2 ? 'solid' : 'plain'} color={tabIndex === 2 ? 'danger' : 'neutral'} value={2} sx={{ borderRadius: 'sm', flex: 1 }}><Home sx={{ mr: 1 }}/> Mortgage</Tab>
                <Tab disableIndicator variant={tabIndex === 3 ? 'solid' : 'plain'} color={tabIndex === 3 ? 'warning' : 'neutral'} value={3} sx={{ borderRadius: 'sm', flex: 1 }}><ReceiptLong sx={{ mr: 1 }}/> SDLT</Tab>
            </TabList>
            
            <TabPanel value={0} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl><FormLabel>Starting Amount (£)</FormLabel><Input type="number" value={savingsPrincipal} onChange={e => setSavingsPrincipal(e.target.value)} /></FormControl>
                <FormControl><FormLabel>Monthly Contribution (£)</FormLabel><Input type="number" value={savingsContribution} onChange={e => setSavingsContribution(e.target.value)} /></FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl sx={{ flex: 1 }}><FormLabel>Interest Rate (%)</FormLabel><Input type="number" value={savingsRate} onChange={e => setSavingsRate(e.target.value)} /></FormControl>
                    <FormControl sx={{ flex: 1 }}><FormLabel>Duration (Years)</FormLabel><Input type="number" value={savingsYears} onChange={e => setSavingsYears(e.target.value)} /></FormControl>
                </Box>
                <Button color="success" onClick={calculateSavings}>Calculate Future Value</Button>
                {savingsResult !== null && (
                    <Box sx={{ p: 2, bgcolor: 'success.softBg', borderRadius: 'md', textAlign: 'center' }}>
                        <Typography level="body-sm">Future Value</Typography>
                        <Typography level="h3" color="success">£{savingsResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Box>
                )}
            </TabPanel>

            <TabPanel value={1} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl><FormLabel>Loan Amount (£)</FormLabel><Input type="number" value={loanPrincipal} onChange={e => setLoanPrincipal(e.target.value)} /></FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl sx={{ flex: 1 }}><FormLabel>Interest Rate (%)</FormLabel><Input type="number" value={loanRate} onChange={e => setLoanRate(e.target.value)} /></FormControl>
                    <FormControl sx={{ flex: 1 }}><FormLabel>Term (Years)</FormLabel><Input type="number" value={loanYears} onChange={e => setLoanYears(e.target.value)} /></FormControl>
                </Box>
                <Button color="primary" onClick={calculateLoan}>Calculate Payment</Button>
                {loanResult !== null && (
                    <Box sx={{ p: 2, bgcolor: 'primary.softBg', borderRadius: 'md', textAlign: 'center' }}>
                        <Typography level="body-sm">Monthly Payment</Typography>
                        <Typography level="h3" color="primary">£{loanResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Box>
                )}
            </TabPanel>

            <TabPanel value={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl><FormLabel>Mortgage Amount (£)</FormLabel><Input type="number" value={mortgageAmount} onChange={e => setMortgageAmount(e.target.value)} /></FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl sx={{ flex: 1 }}><FormLabel>Interest Rate (%)</FormLabel><Input type="number" value={mortgageRate} onChange={e => setMortgageRate(e.target.value)} /></FormControl>
                    <FormControl sx={{ flex: 1 }}><FormLabel>Term (Years)</FormLabel><Input type="number" value={mortgageYears} onChange={e => setMortgageYears(e.target.value)} /></FormControl>
                </Box>
                <FormControl>
                    <FormLabel>Repayment Type</FormLabel>
                    <RadioGroup row value={mortgageType} onChange={(e) => setMortgageType(e.target.value)}>
                        <Radio value="repayment" label="Repayment" variant="outlined" />
                        <Radio value="interestOnly" label="Interest Only" variant="outlined" />
                    </RadioGroup>
                </FormControl>
                <Button color="danger" onClick={calculateMortgage}>Calculate Mortgage</Button>
                {mortgageResult && (
                    <Box sx={{ p: 2, bgcolor: 'danger.softBg', borderRadius: 'md', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography level="body-sm">Monthly Payment</Typography>
                            <Typography level="h3" color="danger">£{mortgageResult.monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography level="body-xs">Total Interest:</Typography>
                            <Typography level="body-xs" fontWeight="bold">£{mortgageResult.totalInterest.toLocaleString()}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography level="body-xs">Total Paid:</Typography>
                            <Typography level="body-xs" fontWeight="bold">£{mortgageResult.totalPaid.toLocaleString()}</Typography>
                        </Box>
                    </Box>
                )}
            </TabPanel>

            <TabPanel value={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl><FormLabel>Property Price (£)</FormLabel><Input type="number" value={propertyPrice} onChange={e => setPropertyPrice(e.target.value)} /></FormControl>
                <FormControl>
                    <FormLabel>Buyer Context</FormLabel>
                    <RadioGroup value={buyerType} onChange={(e) => setStandardBuyer(e.target.value)}>
                        <Radio value="firstTime" label="First Time Buyer" variant="outlined" />
                        <Radio value="standard" label="Standard (Moving Home)" variant="outlined" />
                        <Radio value="secondHome" label="Additional Property (3% Surcharge)" variant="outlined" />
                    </RadioGroup>
                </FormControl>
                <Button color="warning" onClick={calculateSDLT}>Calculate SDLT (UK)</Button>
                {sdltResult !== null && (
                    <Box sx={{ p: 2, bgcolor: 'warning.softBg', borderRadius: 'md', textAlign: 'center' }}>
                        <Typography level="body-sm">Stamp Duty Payable</Typography>
                        <Typography level="h3" color="warning">£{sdltResult.toLocaleString()}</Typography>
                    </Box>
                )}
                <Alert variant="soft" color="neutral" size="sm" startDecorator={<LocalOffer fontSize="small" />}>Rates based on UK SDLT thresholds (Jan 2026).</Alert>
            </TabPanel>
        </Tabs>
      </Box>
    </Sheet>
  );
}
