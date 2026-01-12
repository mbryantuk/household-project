import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Sheet, Typography, IconButton, Button, Input, FormControl, FormLabel,
  Tabs, TabList, Tab, TabPanel, Divider
} from '@mui/joy';
import { 
  Close, DragIndicator, OpenInNew, Savings, AccountBalance, AttachMoney
} from '@mui/icons-material';

export default function FinancialCalculator({ onClose, isPopout = false, isDark = false, isDocked = false, onPopout }) {
  const [pos, setPos] = useState({ x: 200, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(true);
  const containerRef = useRef(null);

  // Tab State: 0 = Savings, 1 = Loan
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

  const calculateSavings = () => {
    const P = parseFloat(savingsPrincipal) || 0;
    const r = (parseFloat(savingsRate) || 0) / 100 / 12;
    const n = (parseFloat(savingsYears) || 0) * 12;
    const PMT = parseFloat(savingsContribution) || 0;

    if (n <= 0) return;

    // Compound Interest with Monthly Contributions
    // FV = P * (1 + r)^n + PMT * [ ((1 + r)^n - 1) / r ]
    let fv = 0;
    if (r === 0) {
        fv = P + (PMT * n);
    } else {
        fv = P * Math.pow(1 + r, n) + (PMT * (Math.pow(1 + r, n) - 1)) / r;
    }
    setSavingsResult(fv);
  };

  const calculateLoan = () => {
    const P = parseFloat(loanPrincipal) || 0;
    const r = (parseFloat(loanRate) || 0) / 100 / 12;
    const n = (parseFloat(loanYears) || 0) * 12;

    if (n <= 0 || P <= 0) return;

    // Mortgage Formula: M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1 ]
    let payment = 0;
    if (r === 0) {
        payment = P / n;
    } else {
        payment = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    setLoanResult(payment);
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
        position: isPopout ? 'relative' : 'fixed',
        left: isPopout ? 0 : (isDocked ? 'inherit' : pos.x),
        bottom: isDocked ? 0 : 'inherit',
        top: !isDocked && !isPopout ? pos.y : 'inherit',
        width: isPopout ? '100%' : 350,
        height: isPopout ? '100%' : 520,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isPopout || isDocked ? 0 : 'md',
        boxShadow: 'lg', 
        opacity: isPopout || isDocked ? 1 : (isFocused ? 1 : 0.6), 
        transition: 'opacity 0.2s'
      }}
    >
      <Box onMouseDown={onMouseDown} sx={{ p: 1, bgcolor: 'background.level2', color: 'text.primary', display: 'flex', alignItems: 'center', cursor: isDocked ? 'default' : 'move' }}>
        {!isDocked && !isPopout && <DragIndicator fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
        <Typography level="title-sm" sx={{ flexGrow: 1, color: 'inherit' }}>Financial Tools</Typography>
        {!isPopout && <IconButton size="sm" variant="plain" color="inherit" onClick={onPopout}><OpenInNew fontSize="inherit" /></IconButton>}
        <IconButton size="sm" variant="plain" color="inherit" onClick={onClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.surface' }}>
        <Tabs 
            value={tabIndex} 
            onChange={(e, v) => setTabIndex(v)}
            sx={{ bgcolor: 'transparent' }}
        >
            <TabList disableUnderline sx={{ p: 0.5, gap: 0.5, borderRadius: 'sm', bgcolor: 'background.level1', mx: 2, mt: 2 }}>
                <Tab disableIndicator variant={tabIndex === 0 ? 'solid' : 'plain'} color={tabIndex === 0 ? 'success' : 'neutral'} value={0} sx={{ borderRadius: 'sm' }}><Savings sx={{ mr: 1 }}/> Savings</Tab>
                <Tab disableIndicator variant={tabIndex === 1 ? 'solid' : 'plain'} color={tabIndex === 1 ? 'danger' : 'neutral'} value={1} sx={{ borderRadius: 'sm' }}><AccountBalance sx={{ mr: 1 }}/> Loan</Tab>
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
                <Button color="danger" onClick={calculateLoan}>Calculate Payment</Button>
                {loanResult !== null && (
                    <Box sx={{ p: 2, bgcolor: 'danger.softBg', borderRadius: 'md', textAlign: 'center' }}>
                        <Typography level="body-sm">Monthly Payment</Typography>
                        <Typography level="h3" color="danger">£{loanResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Box>
                )}
            </TabPanel>
        </Tabs>
      </Box>
    </Sheet>
  );
}