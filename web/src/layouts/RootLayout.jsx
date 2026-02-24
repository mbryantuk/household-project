import { Outlet } from 'react-router-dom';
import { Box, Link } from '@mui/joy';

export default function RootLayout({ context }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.body',
      }}
    >
      <Link
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -10000,
          top: 'auto',
          width: 1,
          height: 1,
          overflow: 'hidden',
          '&:focus': {
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 10000,
            width: 'auto',
            height: 'auto',
            bgcolor: 'primary.solidBg',
            color: 'primary.solidColor',
            p: 2,
            borderRadius: 'md',
            boxShadow: 'lg',
          },
        }}
      >
        Skip to main content
      </Link>
      <Box id="main-content" component="main" sx={{ flexGrow: 1 }}>
        <Outlet context={context} />
      </Box>
    </Box>
  );
}
