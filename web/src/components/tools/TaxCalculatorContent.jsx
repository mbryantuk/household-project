import React, { useState } from 'react';
import { 
  Box, Typography, Button, Input, FormControl, FormLabel,
  Tabs, TabList, Tab, TabPanel, Divider, RadioGroup, Radio, Checkbox, Stack, Select, Option
} from '@mui/joy';
import { ReceiptLong, Payments } from '@mui/icons-material';

export default function TaxCalculatorContent() {
  const [subTab, setSubTab] = useState(0);

  // --- INCOME TAX STATE ---
  const [taxYear, setTaxYear] = useState('2025/26');
  const [region, setRegion] = useState('UK');
  const [salary, setSalary] = useState('');
  const [pension, setPension] = useState('0');
  const [allowances, setAllowances] = useState('0');
  const [taxCode, setTaxCode] = useState('');
  const [studentLoan, setStudentLoan] = useState('none');
  const [age, setAge] = useState('under65');
  
  const [isMarried, setIsMarried] = useState(false);
  const [isBlind, setIsBlind] = useState(false);
  const [noNI, setNoNI] = useState(false);

  const [result, setResult] = useState(null);

  // --- SDLT STATE ---
  const [propertyPrice, setPropertyPrice] = useState('');
  const [buyerType, setBuyerType] = useState('standard');
  const [sdltVal, setSdltVal] = useState(null);

  const calculateTax = () => {
    let gross = parseFloat(salary) || 0;
    let pen = parseFloat(pension) || 0;
    let extraAllow = parseFloat(allowances) || 0;

    // 1. Personal Allowance
    let personalAllowance = 12570;
    if (isBlind) personalAllowance += 3070;
    if (gross > 100000) {
        personalAllowance = Math.max(0, personalAllowance - (gross - 100000) / 2);
    }

    // 2. Taxable Income
    let taxable = Math.max(0, gross - pen - personalAllowance - extraAllow);
    let incomeTax = 0;

    // 2025/26 Bands (Standard UK)
    const basicLimit = 37700; // Band above allowance
    const higherLimit = 125140 - 12570;

    let remaining = taxable;
    // Basic Rate 20%
    const basicPart = Math.min(remaining, basicLimit);
    incomeTax += basicPart * 0.20;
    remaining -= basicPart;

    // Higher Rate 40%
    if (remaining > 0) {
        const higherPart = Math.min(remaining, higherLimit - basicLimit);
        incomeTax += higherPart * 0.40;
        remaining -= higherPart;
    }

    // Additional Rate 45%
    if (remaining > 0) incomeTax += remaining * 0.45;

    // 3. National Insurance
    let ni = 0;
    if (!noNI && age === 'under65') {
        const niThreshold = 12576;
        const niUpper = 50270;
        if (gross > niThreshold) {
            ni += (Math.min(gross, niUpper) - niThreshold) * 0.08;
            if (gross > niUpper) ni += (gross - niUpper) * 0.02;
        }
    }

    // 4. Student Loan (Plan 2 approx)
    let sl = 0;
    const slThreshold = 27295;
    if (studentLoan !== 'none' && gross > slThreshold) {
        sl = (gross - slThreshold) * 0.09;
    }

    const takeHome = gross - incomeTax - ni - sl - pen;
    setResult({ incomeTax, ni, sl, takeHome, monthly: takeHome / 12 });
  };

  const calculateSDLT = () => {
    let p = parseFloat(propertyPrice) || 0;
    let tax = 0;
    if (buyerType === 'firstTime') {
        if (p <= 425000) tax = 0;
        else if (p <= 625000) tax = (p - 425000) * 0.05;
        else tax = calcStandard(p);
    } else {
        tax = calcStandard(p);
        if (buyerType === 'secondHome') tax += p * 0.03;
    }
    setSdltVal(tax);
  };

  const calcStandard = (p) => {
    let t = 0;
    if (p > 1500000) { t += (p - 1500000) * 0.12; p = 1500000; }
    if (p > 925000) { t += (p - 925000) * 0.10; p = 925000; }
    if (p > 250000) { t += (p - 250000) * 0.05; p = 250000; }
    return t;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
        <Tabs value={subTab} onChange={(e, v) => setSubTab(v)} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <TabList disableUnderline sx={{ p: 0.5, gap: 0.5, bgcolor: 'background.level1', mx: 1, mt: 1 }}>
                <Tab disableIndicator variant={subTab === 0 ? 'solid' : 'plain'} color="warning" value={0} sx={{ flex: 1, minHeight: 32, px: 1 }}><Payments sx={{mr:0.5, fontSize: 18}}/> Income Tax</Tab>
                <Tab disableIndicator variant={subTab === 1 ? 'solid' : 'plain'} color="warning" value={1} sx={{ flex: 1, minHeight: 32, px: 1 }}><ReceiptLong sx={{mr:0.5, fontSize: 18}}/> Stamp Duty</Tab>
            </TabList>

            <TabPanel value={0} sx={{ p: 1.5, flexGrow: 1, overflow: 'auto' }}>
                <Stack gap={1}>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl sx={{ flex: 1 }}>
                            <FormLabel sx={{ mb: 0.25, fontSize: 'xs' }}>Tax Year</FormLabel>
                            <Select size="sm" value={taxYear} onChange={(e, v) => setTaxYear(v)}>
                                <Option value="2025/26">2025/26</Option>
                                <Option value="2024/25">2024/25</Option>
                            </Select>
                        </FormControl>
                        <FormControl sx={{ flex: 1 }}>
                            <FormLabel sx={{ mb: 0.25, fontSize: 'xs' }}>Region</FormLabel>
                            <Select size="sm" value={region} onChange={(e, v) => setRegion(v)}>
                                <Option value="UK">UK (Excl. Scotland)</Option>
                                <Option value="Scotland">Scotland</Option>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        <Checkbox size="sm" label="Married" checked={isMarried} onChange={e => setIsMarried(e.target.checked)} />
                        <Checkbox size="sm" label="Blind" checked={isBlind} onChange={e => setIsBlind(e.target.checked)} />
                        <Checkbox size="sm" label="No NI" checked={noNI} onChange={e => setNoNI(e.target.checked)} />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl sx={{ flex: 1 }}><FormLabel sx={{ mb: 0.25, fontSize: 'xs' }}>Salary (£)</FormLabel><Input size="sm" type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="per year" /></FormControl>
                        <FormControl sx={{ flex: 1 }}><FormLabel sx={{ mb: 0.25, fontSize: 'xs' }}>Pension %</FormLabel><Input size="sm" type="number" value={pension} onChange={e => setPension(e.target.value)} /></FormControl>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl sx={{ flex: 1 }}>
                            <FormLabel sx={{ mb: 0.25, fontSize: 'xs' }}>Student Loan</FormLabel>
                            <Select size="sm" value={studentLoan} onChange={(e, v) => setStudentLoan(v)}>
                                <Option value="none">No Loan</Option>
                                <Option value="plan1">Plan 1</Option>
                                <Option value="plan2">Plan 2</Option>
                                <Option value="plan4">Plan 4 (Scot)</Option>
                                <Option value="plan5">Plan 5</Option>
                            </Select>
                        </FormControl>
                        <FormControl sx={{ flex: 1 }}>
                            <FormLabel sx={{ mb: 0.25, fontSize: 'xs' }}>Age</FormLabel>
                            <Select size="sm" value={age} onChange={(e, v) => setAge(v)}>
                                <Option value="under65">Under 65</Option>
                                <Option value="over65">65 or Over</Option>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl sx={{ flex: 1 }}><FormLabel sx={{ mb: 0.25, fontSize: 'xs' }}>Deductions (£)</FormLabel><Input size="sm" type="number" value={allowances} onChange={e => setAllowances(e.target.value)} /></FormControl>
                        <FormControl sx={{ flex: 1 }}><FormLabel sx={{ mb: 0.25, fontSize: 'xs' }}>Tax Code</FormLabel><Input size="sm" placeholder="e.g. 1257L" value={taxCode} onChange={e => setTaxCode(e.target.value)} /></FormControl>
                    </Box>

                    <Button size="sm" color="warning" onClick={calculateTax}>Calculate Take Home</Button>

                    {result && (
                        <Box sx={{ p: 1, bgcolor: 'warning.softBg', borderRadius: 'md', border: '1px solid', borderColor: 'warning.outlinedBorder' }}>
                            <Typography level="body-xs" sx={{ textAlign: 'center', mb: 0.5 }}>MONTHLY TAKE HOME</Typography>
                            <Typography level="h3" color="warning" sx={{ textAlign: 'center', mb: 1 }}>£{result.monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Typography>
                            <Stack gap={0.25}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-xs">Income Tax:</Typography><Typography level="body-xs" fontWeight="bold">£{result.incomeTax.toLocaleString()}</Typography></Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-xs">NI:</Typography><Typography level="body-xs" fontWeight="bold">£{result.ni.toLocaleString()}</Typography></Box>
                                {result.sl > 0 && <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-xs">Student Loan:</Typography><Typography level="body-xs" fontWeight="bold">£{result.sl.toLocaleString()}</Typography></Box>}
                                <Divider sx={{ my: 0.25 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-xs">Annual Take Home:</Typography><Typography level="body-xs" fontWeight="bold">£{result.takeHome.toLocaleString()}</Typography></Box>
                            </Stack>
                        </Box>
                    )}
                </Stack>
            </TabPanel>

            <TabPanel value={1} sx={{ p: 1.5, flexGrow: 1, overflow: 'auto' }}>
                <Stack gap={1.5}>
                    <FormControl><FormLabel sx={{ mb: 0.5, fontSize: 'xs' }}>Property Price (£)</FormLabel><Input size="sm" type="number" value={propertyPrice} onChange={e => setPropertyPrice(e.target.value)} startDecorator="£" /></FormControl>
                    <FormControl><FormLabel sx={{ mb: 0.5, fontSize: 'xs' }}>Buyer Context</FormLabel><RadioGroup value={buyerType} onChange={(e) => setBuyerType(e.target.value)} sx={{ gap: 0.5 }}>
                        <Radio size="sm" value="firstTime" label="First Time Buyer" />
                        <Radio size="sm" value="standard" label="Standard (Moving Home)" />
                        <Radio size="sm" value="secondHome" label="Additional Property" />
                    </RadioGroup></FormControl>
                    <Button size="sm" color="warning" onClick={calculateSDLT}>Calculate Stamp Duty</Button>
                    {sdltVal !== null && <Box sx={{ p: 1, bgcolor: 'warning.softBg', borderRadius: 'md', textAlign: 'center' }}><Typography level="body-xs">Stamp Duty Payable</Typography><Typography level="h4" color="warning">£{sdltVal.toLocaleString()}</Typography></Box>}
                </Stack>
            </TabPanel>
        </Tabs>
    </Box>
  );
}