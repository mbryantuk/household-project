import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  Stack,
  Card,
  Avatar,
  CircularProgress,
  Sheet,
  Alert,
} from '@mui/joy';
import { Link as LinkIcon, AccountBalance, CheckCircle, Warning } from '@mui/icons-material';
import ModuleHeader from '../../components/ui/ModuleHeader';

const MOCK_BANKS = [
  { id: 'hsbc', name: 'HSBC UK', emoji: '🏦', color: '#db0011' },
  { id: 'monzo', name: 'Monzo', emoji: '🐡', color: '#ff4d4d' },
  { id: 'revolut', name: 'Revolut', emoji: '💳', color: '#000000' },
  { id: 'barclays', name: 'Barclays', emoji: '🦅', color: '#00aeef' },
];

/**
 * PlaidSandbox
 * Item 271: Mock Plaid Integration
 */
export default function PlaidSandbox({ financialProfileId }) {
  const { api, id: householdId, isDark, showNotification } = useOutletContext();
  const [linking, setLinking] = useState(false);
  const [step, setStep] = useState('start'); // 'start', 'select', 'success'
  const [selectedBank, setSelectedBank] = useState(null);

  const handleLink = async () => {
    setLinking(true);
    try {
      // Simulate API call to create linked account
      const mockAccount = {
        bank_name: selectedBank.name,
        account_name: 'Plaid Linked Checking',
        current_balance: Math.floor(Math.random() * 5000) + 1000,
        sort_code: '10-20-30',
        account_number: '88776655',
        currency: 'GBP',
        emoji: selectedBank.emoji,
        financial_profile_id: financialProfileId,
        notes: 'Linked via Plaid Sandbox',
      };

      await api.post(`/households/${householdId}/finance/current-accounts`, mockAccount);

      setStep('success');
      showNotification(`${selectedBank.name} linked successfully!`, 'success');
    } catch {
      showNotification('Failed to link account.', 'danger');
    } finally {
      setLinking(false);
    }
  };

  return (
    <Box>
      <ModuleHeader
        title="Bank Synchronisation"
        description="Simulate real-world bank integration using the Plaid Sandbox environment."
        emoji="🔗"
        isDark={isDark}
      />

      <Card variant="outlined" sx={{ p: 4, textAlign: 'center', maxWidth: 600, mx: 'auto', mt: 4 }}>
        {step === 'start' && (
          <Stack spacing={3} alignItems="center">
            <Avatar
              size="xl"
              sx={{ bgcolor: 'primary.softBg', color: 'primary.solidBg', width: 80, height: 80 }}
            >
              <LinkIcon sx={{ fontSize: '3rem' }} />
            </Avatar>
            <Box>
              <Typography level="h3">Connect your Bank</Typography>
              <Typography level="body-md">
                Hearthstone uses Plaid to securely connect to your financial institutions and
                automatically fetch your balances and transactions.
              </Typography>
            </Box>
            <Button size="lg" startDecorator={<LinkIcon />} onClick={() => setStep('select')}>
              Link an Account
            </Button>
            <Typography level="body-xs" color="neutral">
              Your credentials are never stored by Hearthstone.
            </Typography>
          </Stack>
        )}

        {step === 'select' && (
          <Stack spacing={3}>
            <Typography level="h4">Select your Institution</Typography>
            <Grid container spacing={2}>
              {MOCK_BANKS.map((bank) => (
                <Grid xs={6} key={bank.id}>
                  <Card
                    variant={selectedBank?.id === bank.id ? 'solid' : 'outlined'}
                    color={selectedBank?.id === bank.id ? 'primary' : 'neutral'}
                    onClick={() => setSelectedBank(bank)}
                    sx={{ cursor: 'pointer', p: 2, alignItems: 'center' }}
                  >
                    <Typography level="h2">{bank.emoji}</Typography>
                    <Typography level="title-md">{bank.name}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
              <Button variant="plain" color="neutral" onClick={() => setStep('start')}>
                Back
              </Button>
              <Button disabled={!selectedBank} loading={linking} onClick={handleLink}>
                Continue
              </Button>
            </Box>
          </Stack>
        )}

        {step === 'success' && (
          <Stack spacing={3} alignItems="center">
            <CheckCircle color="success" sx={{ fontSize: '5rem' }} />
            <Box>
              <Typography level="h3">Connection Successful!</Typography>
              <Typography level="body-md">
                Your <b>{selectedBank?.name}</b> account has been linked. Balances will sync every
                24 hours.
              </Typography>
            </Box>
            <Button size="lg" variant="outlined" onClick={() => setStep('start')}>
              Link Another Account
            </Button>
          </Stack>
        )}
      </Card>

      <Alert
        color="warning"
        variant="soft"
        startDecorator={<Warning />}
        sx={{ mt: 4, maxWidth: 600, mx: 'auto' }}
      >
        <Typography level="body-sm">
          <b>Sandbox Mode:</b> This is a simulation. No real bank data is accessed or stored.
          Linking an account will simply create a new mock account in your Hearthstone profile.
        </Typography>
      </Alert>
    </Box>
  );
}
