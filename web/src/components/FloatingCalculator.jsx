import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, Sheet, Typography, IconButton, Button, Tooltip, Divider
} from '@mui/joy';
import { 
  Close, DragIndicator, ContentCopy, Backspace, OpenInNew
} from '@mui/icons-material';

export default function FloatingCalculator({ onClose, isPopout = false, isDark = false, isDocked = false, onPopout }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [pos, setPos] = useState({ x: 150, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(true);
  
  const calcRef = useRef(null);

  const handleAction = useCallback((val) => {
    if (val === '=') {
      try {
        const res = new Function(`return ${input.replace(/[^-+*/.0-9]/g, '')}`)();
        setResult(String(res));
      } catch (e) { setResult('Error'); }
    } else if (val === 'C') { setInput(''); setResult(''); }
    else if (val === 'DEL') { setInput(prev => prev.slice(0, -1)); }
    else { setInput(prev => prev + val); }
  }, [input]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isFocused) return;
      if (/[0-9+\-*/.]/.test(e.key)) handleAction(e.key);
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); handleAction('='); }
      else if (e.key === 'Backspace') handleAction('DEL');
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, handleAction, onClose]);

  const onMouseDown = (e) => {
    if (isPopout || isDocked) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    const rect = calcRef.current.getBoundingClientRect();
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
      ref={calcRef}
      variant="outlined"
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false); }}
      tabIndex={0}
      sx={{
        position: isPopout ? 'relative' : 'fixed',
        left: isPopout ? 0 : (isDocked ? 'inherit' : pos.x),
        bottom: isDocked ? 0 : 'inherit',
        top: !isDocked && !isPopout ? pos.y : 'inherit',
        width: 300,
        height: 420,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isPopout || isDocked ? 0 : 'md',
        overflow: 'hidden',
        opacity: isFocused || isPopout ? 1 : 0.4,
        boxShadow: 'lg',
        borderColor: isFocused ? 'primary.500' : 'divider',
        transition: 'opacity 0.2s'
      }}
    >
      <Box onMouseDown={onMouseDown} sx={{ p: 1, bgcolor: 'background.level2', color: 'text.primary', display: 'flex', alignItems: 'center', cursor: isDocked ? 'default' : 'move' }}>
        {!isDocked && !isPopout && <DragIndicator fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
        <Typography level="title-sm" sx={{ flexGrow: 1, color: 'inherit' }}>Calculator</Typography>
        {!isPopout && <IconButton size="sm" variant="plain" color="inherit" onClick={onPopout}><OpenInNew fontSize="inherit" /></IconButton>}
        <IconButton size="sm" variant="plain" color="inherit" onClick={onClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ p: 2, bgcolor: 'background.level1', textAlign: 'right', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography level="body-xs" color="neutral" sx={{ display: 'block', height: 20 }}>{input || ' '}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
            <Typography level="h3" noWrap>{result || '0'}</Typography>
            <IconButton size="sm" onClick={() => navigator.clipboard.writeText(result || input)}><ContentCopy fontSize="inherit" /></IconButton>
        </Box>
      </Box>
      <Divider />
      <Box sx={{ p: 1, flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {['C', 'DEL', '/', '*'].map(btn => <Button key={btn} variant="outlined" color="neutral" onClick={() => handleAction(btn)}>{btn === 'DEL' ? <Backspace fontSize="small" /> : btn}</Button>)}
          {['7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3'].map(btn => <Button key={btn} variant="solid" color="neutral" onClick={() => handleAction(btn)}>{btn}</Button>)}
          <Button variant="solid" color="primary" sx={{ gridRow: 'span 2' }} onClick={() => handleAction('=')}>=</Button>
          <Box sx={{ gridColumn: 'span 2' }}><Button fullWidth variant="solid" color="neutral" onClick={() => handleAction('0')}>0</Button></Box>
          <Button variant="solid" color="neutral" onClick={() => handleAction('.')}>.</Button>
      </Box>
    </Sheet>
  );
}