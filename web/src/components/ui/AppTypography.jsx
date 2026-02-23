import { Typography } from '@mui/joy';
import { styled } from '@mui/joy/styles';

/**
 * Standardized App Typography
 * Ensures all text follows the design system tokens.
 */
const AppTypography = styled(Typography)(({ theme }) => ({
  color: theme.vars.palette.text.primary,
}));

export default AppTypography;
