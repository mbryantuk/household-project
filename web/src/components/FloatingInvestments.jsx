import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Sheet, Typography, IconButton 
} from '@mui/joy';
import { 
  Close, DragIndicator, OpenInNew, TrendingUp
} from '@mui/icons-material';
import InvestmentsContent from './tools/InvestmentsContent';

export default function FloatingInvestments({ onClose, isPopout = false, isDark = false, isDocked = false, onPopout, api, householdId }) {
  const [pos, setPos] = useState({ x: 150, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(true);
  
  const ref = useRef(null);

  const onMouseDown = (e) => {
    if (isPopout || isDocked) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    const rect = ref.current.getBoundingClientRect();
    setRel({ x: e.pageX - rect.left, y: e.pageY - rect.top });
    e.stopPropagation();
  };

  useEffect(() => {
    if (isPopout || isDocked) return;
    const onMouseMove = (e) => { if (isDragging) setPos({ x: e.pageX - rel.x, y: e.pageY - rel.y }); };
    const onMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, rel, isPopout, isDocked]);

  return (
    <Sheet
      ref={ref}
      variant="outlined"
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false); }}
      tabIndex={0}
      sx={{
        position: (isPopout || isDocked) ? 'relative' : 'fixed',
        left: (isPopout || isDocked) ? 0 : pos.x,
        top: (isPopout || isDocked) ? 0 : pos.y,
        width: (isPopout || isDocked) ? '100%' : 320,
        height: (isPopout || isDocked) ? '100%' : 500,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isPopout || isDocked ? 0 : 'md',
        overflow: 'hidden',
        opacity: isPopout || isDocked ? 1 : (isFocused ? 1 : 0.6),
        boxShadow: 'lg',
        borderColor: isFocused ? 'success.500' : 'divider',
        transition: 'opacity 0.2s'
      }}
    >
      <Box onMouseDown={onMouseDown} sx={{ p: 1, bgcolor: 'background.level2', color: 'text.primary', display: 'flex', alignItems: 'center', cursor: isDocked ? 'default' : 'move' }}>
        {!isDocked && !isPopout && <DragIndicator fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
        <TrendingUp fontSize="small" sx={{ mr: 1, color: 'success.plainColor' }} />
        <Typography level="title-sm" sx={{ flexGrow: 1, color: 'inherit' }}>Investments</Typography>
        {!isPopout && <IconButton size="sm" variant="plain" color="inherit" onClick={onPopout}><OpenInNew fontSize="inherit" /></IconButton>}
        <IconButton size="sm" variant="plain" color="inherit" onClick={onClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <InvestmentsContent onClose={onClose} api={api} householdId={householdId} isDark={isDark} />
      </Box>
    </Sheet>
  );
}