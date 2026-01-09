import { AppBar, Toolbar, Typography, IconButton, Box, Avatar } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import TotemIcon from './TotemIcon';
import { getEmojiColor } from '../theme';

export default function TopBar({
  currentHousehold, toggleSidebar
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        {/* LEFT SECTION: Family Name & Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {currentHousehold && (
            <IconButton 
              color="inherit" 
              onClick={toggleSidebar} 
              edge="start" 
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box 
            sx={{ 
              bgcolor: currentHousehold?.avatar && !currentHousehold.avatar.startsWith('data:image') 
                ? getEmojiColor(currentHousehold.avatar, isDark) 
                : 'white', 
              borderRadius: '50%', 
              p: 0.5, 
              mr: 1.5, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: 2,
              cursor: 'pointer',
              width: 36,
              height: 36,
              fontSize: '1.4rem',
              overflow: 'hidden',
              flexShrink: 0
            }}
            onClick={() => navigate('/')}
          >
            {currentHousehold?.avatar ? (
              currentHousehold.avatar.startsWith('data:image') ? (
                <Avatar src={currentHousehold.avatar} sx={{ width: '100%', height: '100%' }} />
              ) : (
                currentHousehold.avatar
              )
            ) : (
              <TotemIcon sx={{ fontSize: 24 }} />
            )}
          </Box>

          <Typography variant="h6" noWrap sx={{ fontWeight: 'bold', letterSpacing: 1.5, color: 'white' }}>
            {currentHousehold ? currentHousehold.name.toUpperCase() : 'TOTEM'}
          </Typography>
        </Box>

        {/* RIGHT SECTION: EMPTY AS REQUESTED */}
        <Box sx={{ flexGrow: 1 }} />
      </Toolbar>
    </AppBar>
  );
}
