import { Input } from '@mui/joy';
import { styled } from '@mui/joy/styles';

/**
 * Standardized App Input
 */
const AppInput = styled(Input)(({ theme }) => ({
  '--Input-radius': theme.vars.radius.md,
  '--Input-focusedThickness': '2px',
  minHeight: '44px',
}));

export default AppInput;
