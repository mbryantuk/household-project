import { useState } from 'react';
import { 
  Sheet, IconButton, Typography, Avatar, Tooltip, Box
} from '@mui/joy';
import { 
  Menu as MenuIcon, Calculate, CalendarMonth, GetApp, NoteAlt
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import TotemIcon from './TotemIcon';
import FloatingCalendar from './FloatingCalendar';
import FloatingCalculator from './FloatingCalculator';
import PostItNote from './PostItNote';
import { getEmojiColor } from '../theme';

export default function TopBar({
  currentHousehold, toggleSidebar, canInstall, onInstall,
  dates, api, onDateAdded, currentMode, user
}) {
  const isDark = currentMode === 'dark';
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const navigate = useNavigate();

  return (
    <Sheet
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        height: 'var(--Header-height, 60px)',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        boxShadow: 'sm',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface'
      }}
    >
        {/* LEFT SECTION */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {currentHousehold && (
            <IconButton 
                variant="plain" 
                color="neutral" 
                onClick={toggleSidebar} 
                size="sm"
                sx={{ display: { md: 'none' } }} // Hide on desktop where sidebar is permanent
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box 
            sx={{ 
              display: 'flex', alignItems: 'center', gap: 1.5, 
              cursor: 'pointer' 
            }}
            onClick={() => navigate('/')}
          >
             <Box 
                sx={{ 
                  bgcolor: currentHousehold?.avatar && !currentHousehold.avatar.startsWith('data:image') 
                    ? getEmojiColor(currentHousehold.avatar, isDark) 
                    : 'background.level1', 
                  borderRadius: '50%', p: 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, fontSize: '1.2rem',
                  overflow: 'hidden', border: '1px solid', borderColor: 'divider'
                }}
              >
                {currentHousehold?.avatar ? (
                  currentHousehold.avatar.startsWith('data:image') ? (
                    <Avatar src={currentHousehold.avatar} sx={{ width: '100%', height: '100%' }} />
                  ) : (
                    currentHousehold.avatar
                  )
                ) : (
                  <TotemIcon sx={{ fontSize: 20 }} />
                )}
              </Box>
              <Typography level="title-lg" sx={{ letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: 'sm' }}>
                {currentHousehold ? currentHousehold.name : 'TOTEM'}
              </Typography>
          </Box>
        </Box>

        {/* RIGHT SECTION */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Sticky Note" variant="soft">
            <IconButton variant="plain" onClick={() => setShowNote(!showNote)} size="sm">
              <NoteAlt />
            </IconButton>
          </Tooltip>

          <Tooltip title="Calculator" variant="soft">
            <IconButton variant="plain" onClick={() => setShowCalc(!showCalc)} size="sm">
              <Calculate />
            </IconButton>
          </Tooltip>

          <Tooltip title="Calendar" variant="soft">
            <IconButton variant="plain" onClick={() => setShowCalendar(!showCalendar)} size="sm">
              <CalendarMonth />
            </IconButton>
          </Tooltip>

          {canInstall && (
            <Tooltip title="Install App" variant="soft">
              <IconButton variant="plain" onClick={onInstall} size="sm">
                <GetApp />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Calendar Floating Window */}
        {showCalendar && (
          <FloatingCalendar 
            dates={dates} 
            api={api} 
            householdId={currentHousehold?.id}
            currentUser={user}
            onDateAdded={onDateAdded} 
            onClose={() => setShowCalendar(false)}
            isDark={isDark}
          />
        )}

        {showCalc && <FloatingCalculator onClose={() => setShowCalc(false)} isDark={isDark} />}

        {showNote && <PostItNote onClose={() => setShowNote(false)} />}
    </Sheet>
  );
}