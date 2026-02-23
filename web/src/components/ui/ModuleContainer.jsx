import { Box } from '@mui/joy';
import { styled } from '@mui/joy/styles';

/**
 * Standardized Module Container
 * Provides consistent padding and responsive spacing across all views.
 */
const ModuleContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
  },
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  height: '100%',
  overflowY: 'auto',
  backgroundColor: theme.vars.palette.background.body,
}));

export default ModuleContainer;
