import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Sheet, Typography, IconButton 
} from '@mui/joy';
import { 
  Close, DragIndicator, OpenInNew
} from '@mui/icons-material';
import FinancialCalculatorContent from './tools/FinancialCalculatorContent';

export default function FinancialCalculator({ onClose, isPopout = false, isDark = false, isDocked = false, onPopout }) {
  const [pos, setPos] = useState({ x: 200, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(true);
  const containerRef = useRef(null);

  const onMouseDown = (e) => {
    if (isPopout || isDocked || e.button !== 0) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setRel({ x: e.pageX - rect.left, y: e.pageY - rect.top });
    e.stopPropagation();
  };

  useEffect(() => {
    if (isPopout || isDocked) return;
    const onMouseMove = (e) => { if (isDragging) setPos({ x: e.pageX - rel.x, y: e.pageY - rel.y }); };
    const onMouseUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp); }
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [isDragging, rel, isPopout, isDocked]);

  return (
    <Sheet
      ref={containerRef} variant="outlined" tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false); }}
      sx={{
        position: (isPopout || isDocked) ? 'relative' : 'fixed',
        left: (isPopout || isDocked) ? 0 : pos.x,
        top: (isPopout || isDocked) ? 0 : pos.y,
        width: (isPopout || isDocked) ? '100%' : 400,
        height: (isPopout || isDocked) ? '100%' : 550,
        zIndex: 1300, display: 'flex', flexDirection: 'column',
        borderRadius: isPopout || isDocked ? 0 : 'md', boxShadow: 'lg', 
        opacity: isPopout || isDocked ? 1 : (isFocused ? 1 : 0.6), 
        transition: 'opacity 0.2s', overflow: 'hidden'
      }}
    >
      <Box onMouseDown={onMouseDown} sx={{ p: 1, bgcolor: 'background.level2', display: 'flex', alignItems: 'center', cursor: isDocked ? 'default' : 'move' }}>
        {!isDocked && !isPopout && <DragIndicator fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
        <Typography level="title-sm" sx={{ flexGrow: 1 }}>Financial Tools</Typography>
        {!isPopout && <IconButton size="sm" variant="plain" onClick={onPopout}><OpenInNew fontSize="inherit" /></IconButton>}
        <IconButton size="sm" variant="plain" onClick={onClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <FinancialCalculatorContent />
      </Box>
    </Sheet>
  );
}