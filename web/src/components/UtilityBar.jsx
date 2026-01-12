import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, IconButton, Tooltip, Sheet, Typography 
} from '@mui/joy';
import { 
  Calculate, NoteAlt, CalendarMonth, Close, OpenInNew, DragIndicator
} from '@mui/icons-material';
import FloatingCalculator from './FloatingCalculator';
import FloatingCalendar from './FloatingCalendar';
import PostItNote from './PostItNote';

// Wrapper for Floating Widgets to handle Translucency & Dragging
const WidgetWrapper = ({ children, onClose, onPopout, title, isPoppedOut, initialPos }) => {
    const [isFocused, setIsFocused] = useState(true);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        // If not focused, reduce opacity
        setOpacity(isFocused ? 1 : 0.6);
    }, [isFocused]);

    if (isPoppedOut) return null; // Don't render if popped out

    return (
        <Box 
            onMouseEnter={() => setOpacity(1)}
            onMouseLeave={() => !isFocused && setOpacity(0.6)}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsFocused(false);
                }
            }}
            tabIndex={-1} // Allow focus
            sx={{
                position: 'fixed',
                zIndex: 1300,
                opacity: opacity,
                transition: 'opacity 0.2s ease-in-out',
                // Positioning handled by child (Floating components usually handle their own drag/pos)
                // But we need to ensure they render properly.
                // Actually, the existing Floating components handle drag/pos internally.
                // We just wrap them to catch focus events.
                // We pass 'isFocused' prop if they support it, or just use the wrapper's opacity.
            }}
        >
            {/* We inject opacity control via style or context? 
                The existing components have their own Sheets. 
                We might need to modify them to accept className or style, 
                or just wrap them in a div that applies opacity. 
            */}
            <Box sx={{ opacity: opacity, transition: 'opacity 0.2s' }}>
                {children}
            </Box>
        </Box>
    );
};

export default function UtilityBar({ 
    user, api, dates, onDateAdded, onUpdateProfile, isDark, canInstall, onInstall 
}) {
  const [openWidget, setOpenWidget] = useState(null); // 'notes', 'calc', 'calendar' or null
  const [poppedOut, setPoppedOut] = useState({}); // { notes: boolean, ... }

  const handleToggle = (widget) => {
      if (openWidget === widget) {
          setOpenWidget(null); // Minimize
      } else {
          setOpenWidget(widget);
      }
  };

  const handlePopout = (widget, url) => {
      window.open(url, `Totem${widget}`, 'width=320,height=400,menubar=no,toolbar=no,location=no,status=no');
      setPoppedOut(prev => ({ ...prev, [widget]: true }));
      setOpenWidget(null);
  };

  // Listen for popout closing? Hard to track cross-window without polling/postMessage.
  // We'll assume once popped out, it stays "unpinned" from bar until refresh or manual reset.

  return (
    <>
      {/* Floating Widgets Layer */}
      {openWidget === 'notes' && !poppedOut.notes && (
          <PostItNote 
            onClose={() => setOpenWidget(null)}
            user={user}
            onUpdateProfile={onUpdateProfile}
            onPopout={() => handlePopout('notes', '/note-window')}
          />
      )}
      
      {openWidget === 'calc' && !poppedOut.calc && (
          <FloatingCalculator 
            onClose={() => setOpenWidget(null)}
            isDark={isDark}
            // Add onPopout prop to Calculator if not exists, or handle internally
          />
      )}

      {openWidget === 'calendar' && !poppedOut.calendar && (
          <FloatingCalendar 
            dates={dates}
            api={api}
            householdId={user?.default_household_id} // Fallback or current? UtilityBar needs household context if calendar adds events
            currentUser={user}
            onDateAdded={onDateAdded}
            onClose={() => setOpenWidget(null)}
            isDark={isDark}
          />
      )}

      {/* Bottom Bar */}
      <Sheet
        variant="soft"
        sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 48,
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
            <Typography level="title-sm" sx={{ alignSelf: 'center', mr: 2, color: 'neutral.500', display: { xs: 'none', md: 'block' } }}>
                UTILITIES
            </Typography>
            
            <Tooltip title="Sticky Notes" placement="top">
                <IconButton 
                    variant={openWidget === 'notes' ? 'solid' : 'plain'} 
                    color={openWidget === 'notes' ? 'warning' : 'neutral'}
                    onClick={() => handleToggle('notes')}
                >
                    <NoteAlt />
                </IconButton>
            </Tooltip>

            <Tooltip title="Calculator" placement="top">
                <IconButton 
                    variant={openWidget === 'calc' ? 'solid' : 'plain'} 
                    color={openWidget === 'calc' ? 'primary' : 'neutral'}
                    onClick={() => handleToggle('calc')}
                >
                    <Calculate />
                </IconButton>
            </Tooltip>

            <Tooltip title="Calendar" placement="top">
                <IconButton 
                    variant={openWidget === 'calendar' ? 'solid' : 'plain'} 
                    color={openWidget === 'calendar' ? 'success' : 'neutral'}
                    onClick={() => handleToggle('calendar')}
                >
                    <CalendarMonth />
                </IconButton>
            </Tooltip>
        </Box>

        <Box>
            {/* Status or additional info can go here */}
        </Box>
      </Sheet>
    </>
  );
}
