import React, { useState } from 'react';
import { 
  Box, Typography, Button, Input, FormControl, FormLabel,
  Tabs, TabList, Tab, TabPanel, Divider, RadioGroup, Radio
} from '@mui/joy';
import { Savings, AccountBalance, Home } from '@mui/icons-material';

export default function FinancialCalculatorContent() {
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <TabList disableUnderline sx={{ p: 0.5, gap: 1, borderRadius: 'sm', bgcolor: 'background.level1', mx: 2, mt: 2 }}>
                <Tab disableIndicator variant={tabIndex === 0 ? 'solid' : 'plain'} color="success" value={0} sx={{ borderRadius: 'sm', px: 2, flex: 1 }}><Savings sx={{ mr: 1 }}/> Save</Tab>
                <Tab disableIndicator variant={tabIndex === 1 ? 'solid' : 'plain'} color="primary" value={1} sx={{ borderRadius: 'sm', px: 2, flex: 1 }}><AccountBalance sx={{ mr: 1 }}/> Loan</Tab>
                <Tab disableIndicator variant={tabIndex === 2 ? 'solid' : 'plain'} color="danger" value={2} sx={{ borderRadius: 'sm', px: 2, flex: 1 }}><Home sx={{ mr: 1 }}/> Mortg</Tab>
            </TabList>
            
            <TabPanel value={0} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, overflow: 'auto' }}>
                <FormControl><FormLabel>Starting Amount (£)</FormLabel><Input type="number" value={savingsPrincipal} onChange={e => setSavingsPrincipal(e.target.value)} /></FormControl>
                <FormControl><FormLabel>Monthly Contribution (£)</FormLabel><Input type="number" value={savingsContribution} onChange={e => setSavingsContribution(e.target.value)} /></FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}><FormControl sx={{ flex: 1 }}><FormLabel>Interest Rate (%)</FormLabel><Input type="number" value={savingsRate} onChange={e => setSavingsRate(e.target.value)} /></FormControl><FormControl sx={{ flex: 1 }}><FormLabel>Years</FormLabel><Input type="number" value={savingsYears} onChange={e => setSavingsYears(e.target.value)} /></FormControl></Box>
                <Button color="success" onClick={calculateSavings}>Calculate</Button>
                {savingsResult !== null && <Box sx={{ p: 2, bgcolor: 'success.softBg', borderRadius: 'md', textAlign: 'center' }}><Typography level="body-sm">Future Value</Typography><Typography level="h3" color="success">£{savingsResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box>}
            </TabPanel>

            <TabPanel value={1} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, overflow: 'auto' }}>
                <FormControl><FormLabel>Loan Amount (£)</FormLabel><Input type="number" value={loanPrincipal} onChange={e => setLoanPrincipal(e.target.value)} /></FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}><FormControl sx={{ flex: 1 }}><FormLabel>Interest Rate (%)</FormLabel><Input type="number" value={loanRate} onChange={e => setLoanRate(e.target.value)} /></FormControl><FormControl sx={{ flex: 1 }}><FormLabel>Years</FormLabel><Input type="number" value={loanYears} onChange={e => setLoanYears(e.target.value)} /></FormControl></Box>
                <Button color="primary" onClick={calculateLoan}>Calculate</Button>
                {loanResult !== null && <Box sx={{ p: 2, bgcolor: 'primary.softBg', borderRadius: 'md', textAlign: 'center' }}><Typography level="body-sm">Monthly Payment</Typography><Typography level="h3" color="primary">£{loanResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box>}
            </TabPanel>

            <TabPanel value={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, overflow: 'auto' }}>
                <FormControl><FormLabel>Mortgage Amount (£)</FormLabel><Input type="number" value={mortgageAmount} onChange={e => setMortgageAmount(e.target.value)} /></FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}><FormControl sx={{ flex: 1 }}><FormLabel>Interest Rate (%)</FormLabel><Input type="number" value={mortgageRate} onChange={e => setMortgageRate(e.target.value)} /></FormControl><FormControl sx={{ flex: 1 }}><FormLabel>Years</FormLabel><Input type="number" value={mortgageYears} onChange={e => setMortgageYears(e.target.value)} /></FormControl></Box>
                <FormControl><FormLabel>Repayment Type</FormLabel><RadioGroup row value={mortgageType} onChange={(e) => setMortgageType(e.target.value)}><Radio value="repayment" label="Repayment" variant="outlined" /><Radio value="interestOnly" label="Interest Only" variant="outlined" /></RadioGroup></FormControl>
                <Button color="danger" onClick={calculateMortgage}>Calculate</Button>
                {mortgageResult && <Box sx={{ p: 2, bgcolor: 'danger.softBg', borderRadius: 'md', display: 'flex', flexDirection: 'column', gap: 1 }}><Box sx={{ textAlign: 'center' }}><Typography level="body-sm">Monthly Payment</Typography><Typography level="h3" color="danger">£{mortgageResult.monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box><Divider /><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-xs">Total Interest:</Typography><Typography level="body-xs" fontWeight="bold">£{mortgageResult.totalInterest.toLocaleString()}</Typography></Box><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-xs">Total Paid:</Typography><Typography level="body-xs" fontWeight="bold">£{mortgageResult.totalPaid.toLocaleString()}</Typography></Box></Box>}
            </TabPanel>
        </Tabs>
    </Box>
  );
}