import { Button } from '@mui/joy';
import { styled } from '@mui/joy/styles';

/**
 * Standardized App Button
 * Enforces touch target size and theme consistency.
 */
const AppButton = styled(Button)(({ theme }) => ({
  minHeight: '44px', // Touch target mandate
  borderRadius: theme.vars.radius.md,
  fontWeight: theme.vars.fontWeight.md,
  transition: 'all 0.2s ease',
  '&:active': {
    transform: 'scale(0.98)',
  },
}));

export default AppButton;
