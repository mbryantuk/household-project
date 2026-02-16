import { useState, useEffect } from 'react';
import { 
  Box, Stepper, Step, StepIndicator, StepButton, Typography, Button, 
  Stack, Grid, Card, FormControl, FormLabel, Input, Select, Option, 
  Avatar, IconButton, Chip, Divider, AspectRatio, CircularProgress
} from '@mui/joy';
import { 
  Person, Home, DirectionsCar, AccountBalance, ReceiptLong, 
  Add, Delete, CheckCircle, ArrowBack, ArrowForward, HomeWork
} from '@mui/icons-material';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import EmojiPicker from '../components/EmojiPicker';

const steps = [
  { label: 'Family & Pets', icon: <Person /> },
  { label: 'Property', icon: <HomeWork /> },
  { label: 'Vehicles', icon: <DirectionsCar /> },
  { label: 'Banking', icon: <AccountBalance /> },
  { label: 'Budget', icon: <ReceiptLong /> },
];

export default function OnboardingWizard() {
  const { id: householdId } = useParams();
  const { api, showNotification, isDark } = useOutletContext();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // --- STATE ---
  const [members, setMembers] = useState([{ name: '', type: 'adult', emoji: '👤' }]);
  const [house, setHouse] = useState({ property_type: 'Detached', construction_year: 2000, council_tax_band: 'D' });
  const [vehicles, setVehicles] = useState([]);
  const [banking, setBanking] = useState([]);
  const [budgetItems, setBudgetItems] = useState([
    { name: 'Council Tax', amount: 150, category_id: 'council_tax', emoji: '🏛️' },
    { name: 'Electricity', amount: 80, category_id: 'energy', emoji: '⚡' },
    { name: 'Water', amount: 30, category_id: 'utility', emoji: '💧' },
    { name: 'Internet', amount: 35, category_id: 'utility', emoji: '🌐' }
  ]);

  const [emojiPicker, setEmojiPicker] = useState({ open: false, target: null, index: null });

  const handleNext = async () => {
    if (activeStep === steps.length - 1) {
      await finalizeOnboarding();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const finalizeOnboarding = async () => {
    setLoading(true);
    try {
      // 1. Members
      for (const m of members) {
          if (m.name) await api.post(`/households/${householdId}/members`, m);
      }
      
      // 2. House
      await api.put(`/households/${householdId}/house`, house);
      
      // 3. Vehicles
      for (const v of vehicles) {
          await api.post(`/households/${householdId}/vehicles`, v);
      }
      
      // 4. Banking
      for (const b of banking) {
          await api.post(`/households/${householdId}/finance/current-accounts`, b);
      }
      
      // 5. Budget
      for (const item of budgetItems) {
          await api.post(`/households/${householdId}/finance/recurring-costs`, item);
      }

      showNotification("Onboarding complete! Welcome to your new home.", "success");
      navigate(`/household/${householdId}/dashboard`);
    } catch (err) {
      console.error("Onboarding failed", err);
      showNotification("Some data failed to save, but you can update it later.", "warning");
      navigate(`/household/${householdId}/dashboard`);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERS ---
  const renderStepContent = (step) => {
    switch (step) {
      case 0: return (
        <Stack spacing={2}>
          <Typography level="title-lg">Who lives here?</Typography>
          <Typography level="body-sm">Add your family members, roommates, or pets.</Typography>
          {members.map((m, i) => (
            <Card key={i} variant="soft" sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid xs="auto">
                  <Avatar 
                    sx={{ bgcolor: getEmojiColor(m.emoji, isDark), cursor: 'pointer' }} 
                    onClick={() => setEmojiPicker({ open: true, target: 'member', index: i })}
                  >
                    {m.emoji}
                  </Avatar>
                </Grid>
                <Grid xs>
                  <Input 
                    placeholder="Name" 
                    value={m.name} 
                    onChange={(e) => {
                        const newM = [...members];
                        newM[i].name = e.target.value;
                        setMembers(newM);
                    }} 
                  />
                </Grid>
                <Grid xs={3}>
                  <Select 
                    value={m.type} 
                    onChange={(_, val) => {
                        const newM = [...members];
                        newM[i].type = val;
                        setMembers(newM);
                    }}
                  >
                    <Option value="adult">Adult</Option>
                    <Option value="child">Child</Option>
                    <Option value="pet">Pet</Option>
                  </Select>
                </Grid>
                <Grid xs="auto">
                  <IconButton color="danger" variant="plain" onClick={() => setMembers(members.filter((_, idx) => idx !== i))}>
                    <Delete />
                  </IconButton>
                </Grid>
              </Grid>
            </Card>
          ))}
          <Button startDecorator={<Add />} variant="outlined" onClick={() => setMembers([...members, { name: '', type: 'adult', emoji: '👤' }])}>Add Another</Button>
        </Stack>
      );
      case 1: return (
        <Stack spacing={2}>
            <Typography level="title-lg">About the Property</Typography>
            <Typography level="body-sm">Help us estimate costs by telling us about your home.</Typography>
            <Grid container spacing={2}>
                <Grid xs={12} md={6}>
                    <FormControl>
                        <FormLabel>Property Type</FormLabel>
                        <Select value={house.property_type} onChange={(_, val) => setHouse({...house, property_type: val})}>
                            <Option value="Detached">Detached</Option>
                            <Option value="Semi-Detached">Semi-Detached</Option>
                            <Option value="Terraced">Terraced</Option>
                            <Option value="Flat/Apartment">Flat/Apartment</Option>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid xs={12} md={6}>
                    <FormControl>
                        <FormLabel>Construction Year (Approx)</FormLabel>
                        <Input type="number" value={house.construction_year} onChange={(e) => setHouse({...house, construction_year: e.target.value})} />
                    </FormControl>
                </Grid>
                <Grid xs={12} md={6}>
                    <FormControl>
                        <FormLabel>Council Tax Band</FormLabel>
                        <Select value={house.council_tax_band} onChange={(_, val) => setHouse({...house, council_tax_band: val})}>
                            {['A','B','C','D','E','F','G','H'].map(b => <Option key={b} value={b}>{b}</Option>)}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Stack>
      );
      case 2: return (
          <Stack spacing={2}>
              <Typography level="title-lg">Vehicles</Typography>
              <Typography level="body-sm">Add cars, bikes, or vans used by the household.</Typography>
              {vehicles.map((v, i) => (
                  <Card key={i} variant="soft" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                        <Grid xs={5}>
                            <Input placeholder="Make/Model" value={v.make} onChange={(e) => {
                                const newV = [...vehicles];
                                newV[i].make = e.target.value;
                                setVehicles(newV);
                            }} />
                        </Grid>
                        <Grid xs={5}>
                            <Input placeholder="Registration" value={v.registration} onChange={(e) => {
                                const newV = [...vehicles];
                                newV[i].registration = e.target.value;
                                setVehicles(newV);
                            }} />
                        </Grid>
                        <Grid xs={2}>
                            <IconButton color="danger" variant="plain" onClick={() => setVehicles(vehicles.filter((_, idx) => idx !== i))}>
                                <Delete />
                            </IconButton>
                        </Grid>
                    </Grid>
                  </Card>
              ))}
              <Button startDecorator={<Add />} variant="outlined" onClick={() => setVehicles([...vehicles, { make: '', registration: '', emoji: '🚗' }])}>Add Vehicle</Button>
          </Stack>
      );
      case 3: return (
          <Stack spacing={2}>
              <Typography level="title-lg">Banking</Typography>
              <Typography level="body-sm">Set up your primary current accounts.</Typography>
                {banking.map((b, i) => (
                    <Card key={i} variant="soft" sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                            <Grid xs={6}>
                                <Input placeholder="Bank Name" value={b.bank_name} onChange={(e) => {
                                    const newB = [...banking];
                                    newB[i].bank_name = e.target.value;
                                    setBanking(newB);
                                }} />
                            </Grid>
                            <Grid xs={6}>
                                <Input placeholder="Balance" type="number" value={b.current_balance} onChange={(e) => {
                                    const newB = [...banking];
                                    newB[i].current_balance = e.target.value;
                                    setBanking(newB);
                                }} />
                            </Grid>
                        </Grid>
                    </Card>
                ))}
                <Button startDecorator={<Add />} variant="outlined" onClick={() => setBanking([...banking, { bank_name: '', current_balance: 0, emoji: '🏦' }])}>Add Bank Account</Button>
          </Stack>
      );
      case 4: return (
          <Stack spacing={2}>
              <Typography level="title-lg">Budget Bones</Typography>
              <Typography level="body-sm">We've suggested some common bills. Adjust or add more.</Typography>
              <Grid container spacing={2}>
                  {budgetItems.map((item, i) => (
                      <Grid key={i} xs={12} md={6}>
                          <Card variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: getEmojiColor(item.emoji, isDark) }}>{item.emoji}</Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography level="title-sm">{item.name}</Typography>
                                <Input size="sm" type="number" value={item.amount} onChange={(e) => {
                                    const newB = [...budgetItems];
                                    newB[i].amount = e.target.value;
                                    setBudgetItems(newB);
                                }} startDecorator="£" />
                            </Box>
                            <IconButton size="sm" color="danger" variant="plain" onClick={() => setBudgetItems(budgetItems.filter((_, idx) => idx !== i))}>
                                <Delete />
                            </IconButton>
                          </Card>
                      </Grid>
                  ))}
              </Grid>
              <Button startDecorator={<Add />} variant="outlined" onClick={() => setBudgetItems([...budgetItems, { name: 'New Item', amount: 0, category_id: 'utility', emoji: '💸' }])}>Add Other Bill</Button>
          </Stack>
      );
      default: return null;
    }
  };

  return (
    <Box sx={{ 
        height: '100%', 
        bgcolor: 'background.body', 
        p: { xs: 2, md: 5 },
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    }}>
      <Box sx={{ maxWidth: 800, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography level="h1">Welcome to Hearthstone</Typography>
            <Typography level="title-md" color="neutral">Let's set up your household profile in 5 quick steps.</Typography>
        </Box>

        <Stepper sx={{ mb: 5 }}>
          {steps.map((step, index) => (
            <Step
              key={step.label}
              indicator={
                <StepIndicator variant={activeStep >= index ? 'solid' : 'outlined'} color={activeStep >= index ? 'primary' : 'neutral'}>
                  {activeStep > index ? <CheckCircle /> : step.icon}
                </StepIndicator>
              }
            >
              <Typography level="title-sm" sx={{ display: { xs: 'none', md: 'block' } }}>{step.label}</Typography>
            </Step>
          ))}
        </Stepper>

        <Card sx={{ p: 4, mb: 4, boxShadow: 'lg' }}>
            {renderStepContent(activeStep)}
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 10 }}>
            <Button variant="plain" color="neutral" startDecorator={<ArrowBack />} onClick={handleBack} disabled={activeStep === 0 || loading}>
                Back
            </Button>
            <Button variant="solid" color="primary" endDecorator={activeStep === steps.length - 1 ? <CheckCircle /> : <ArrowForward />} onClick={handleNext} loading={loading}>
                {activeStep === steps.length - 1 ? 'Finish Setup' : 'Next Step'}
            </Button>
        </Box>
      </Box>

      <EmojiPicker 
        open={emojiPicker.open}
        onClose={() => setEmojiPicker({ ...emojiPicker, open: false })}
        onEmojiSelect={(emoji) => {
            if (emojiPicker.target === 'member') {
                const newM = [...members];
                newM[emojiPicker.index].emoji = emoji;
                setMembers(newM);
            }
            setEmojiPicker({ ...emojiPicker, open: false });
        }}
        isDark={isDark}
      />
    </Box>
  );
}
