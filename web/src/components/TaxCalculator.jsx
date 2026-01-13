import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Sheet, Typography, IconButton 
} from '@mui/joy';
import { 
  Close, DragIndicator, OpenInNew, Payments 
} from '@mui/icons-material';
import TaxCalculatorContent from './tools/TaxCalculatorContent';

export default function TaxCalculator({ onClose, isPopout = false, isDark = false, isDocked = false, onPopout }) {
  const [pos, setPos] = useState({ x: 250, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
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
      ref={containerRef} variant="outlined"
      sx={{
        position: (isPopout || isDocked) ? 'relative' : 'fixed',
        left: (isPopout || isDocked) ? 0 : pos.x,
        top: (isPopout || isDocked) ? 0 : pos.y,
        width: (isPopout || isDocked) ? '100%' : 450,
        height: (isPopout || isDocked) ? '100%' : 650,
        zIndex: 1300, display: 'flex', flexDirection: 'column',
        borderRadius: isPopout || isDocked ? 0 : 'md', boxShadow: 'lg', overflow: 'hidden'
      }}
    >
      <Box onMouseDown={onMouseDown} sx={{ p: 1, bgcolor: 'warning.softBg', display: 'flex', alignItems: 'center', cursor: isDocked ? 'default' : 'move' }}>
        <Payments fontSize="small" sx={{ mr: 1 }} />
        <Typography level="title-sm" sx={{ flexGrow: 1 }}>Tax Tools (UK)</Typography>
        {!isPopout && <IconButton size="sm" variant="plain" onClick={onPopout}><OpenInNew fontSize="inherit" /></IconButton>}
        <IconButton size="sm" variant="plain" onClick={onClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <TaxCalculatorContent />
      </Box>
    </Sheet>
  );
}
