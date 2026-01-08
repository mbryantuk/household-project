import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, Paper, Typography, IconButton, Grid, Button, 
  Divider, Tooltip
} from '@mui/material';
import { 
  Close, DragIndicator, ContentCopy, Backspace, OpenInNew
} from '@mui/icons-material';

export default function FloatingCalculator({ onClose, isPopout = false }) {
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
        // eslint-disable-next-line no-new-func
        const res = new Function(`return ${input.replace(/[^-+*/.0-9]/g, '')}`)();
        setResult(String(res));
      } catch (e) {
        setResult('Error');
      }
    } else if (val === 'C') {
      setInput('');
      setResult('');
    } else if (val === 'DEL') {
      setInput(prev => prev.slice(0, -1));
    } else {
      setInput(prev => prev + val);
    }
  }, [input]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isFocused) return;
      const key = e.key;
      if (/[0-9+\-*/.]/.test(key)) {
        handleAction(key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleAction('=');
      } else if (key === 'Backspace') {
        handleAction('DEL');
      } else if (key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, handleAction, onClose]);

  const onMouseDown = (e) => {
    if (isPopout) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    const rect = calcRef.current.getBoundingClientRect();
    setRel({ x: e.pageX - rect.left, y: e.pageY - rect.top });
    e.stopPropagation();
  };

  useEffect(() => {
    if (isPopout) return;
    const onMouseMove = (e) => {
      if (!isDragging) return;
      setPos({ x: e.pageX - rel.x, y: e.pageY - rel.y });
    };
    const onMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, rel, isPopout]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result || input);
  };

  const handlePopout = () => {
    window.open('/calculator', 'TotemCalculator', 'width=300,height=450,menubar=no,toolbar=no,location=no,status=no');
    onClose();
  };

  return (
    <Paper
      ref={calcRef}
      elevation={isPopout ? 0 : 12}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false);
      }}
      tabIndex={0}
      sx={{
        position: isPopout ? 'relative' : 'fixed',
        left: isPopout ? 0 : pos.x,
        top: isPopout ? 0 : pos.y,
        width: isPopout ? '100%' : 300,
        height: isPopout ? '100%' : 420,
        minWidth: 240,
        minHeight: 350,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isPopout ? 0 : 2,
        overflow: 'hidden',
        resize: isPopout ? 'none' : 'both',
        transition: 'opacity 0.2s',
        opacity: isFocused ? 1 : 0.6,
        border: isPopout ? 'none' : '1px solid',
        borderColor: isFocused ? 'primary.main' : 'divider',
        boxShadow: isFocused ? 24 : 4,
        '&:hover': { opacity: 1 }
      }}
    >
      {/* Header */}
      <Box 
        onMouseDown={onMouseDown}
        sx={{ 
          p: 1, 
          bgcolor: isFocused ? 'primary.main' : 'background.paper', 
          color: isFocused ? 'primary.contrastText' : 'text.primary',
          display: 'flex', 
          alignItems: 'center', 
          cursor: isPopout ? 'default' : 'move',
          userSelect: 'none'
        }}
      >
        {!isPopout && <DragIndicator fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
        <Typography variant="subtitle2" sx={{ flexGrow: 1, fontWeight: 'bold' }}>Calculator</Typography>
        
        {!isPopout && (
            <Tooltip title="Pop out">
                <IconButton size="small" color="inherit" onClick={handlePopout}><OpenInNew fontSize="inherit" /></IconButton>
            </Tooltip>
        )}
        <IconButton size="small" color="inherit" onClick={onClose} sx={{ ml: 1 }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Display */}
      <Box sx={{ p: 2, bgcolor: 'action.hover', textAlign: 'right', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', height: 20, overflow: 'hidden' }}>
          {input || ' '}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {result || '0'}
            </Typography>
            <Tooltip title="Copy Result">
                <IconButton size="small" onClick={copyToClipboard}><ContentCopy fontSize="inherit" /></IconButton>
            </Tooltip>
        </Box>
      </Box>

      <Divider />

      {/* Buttons - Using display: grid for better resizing */}
      <Box sx={{ p: 1, flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {['C', 'DEL', '/', '*'].map(btn => (
            <Button key={btn} variant="outlined" color="secondary" onClick={() => handleAction(btn)} sx={{ minHeight: 40, fontWeight: 'bold' }}>
                {btn === 'DEL' ? <Backspace fontSize="small" /> : btn}
            </Button>
          ))}
          {['7', '8', '9', '-'].map(btn => (
            <Button key={btn} variant="contained" color={isNaN(btn) ? "secondary" : "inherit"} onClick={() => handleAction(btn)} sx={{ minHeight: 40, fontWeight: 'bold' }}>{btn}</Button>
          ))}
          {['4', '5', '6', '+'].map(btn => (
            <Button key={btn} variant="contained" color={isNaN(btn) ? "secondary" : "inherit"} onClick={() => handleAction(btn)} sx={{ minHeight: 40, fontWeight: 'bold' }}>{btn}</Button>
          ))}
          {['1', '2', '3', '='].map(btn => (
            <Button key={btn} variant="contained" color={btn === '=' ? "primary" : "inherit"} onClick={() => handleAction(btn)} sx={{ minHeight: 40, fontWeight: 'bold', gridRow: btn === '=' ? 'span 2' : 'auto' }}>{btn}</Button>
          ))}
          <Box sx={{ gridColumn: 'span 2' }}>
            <Button fullWidth variant="contained" onClick={() => handleAction('0')} sx={{ height: '100%', minHeight: 40, fontWeight: 'bold' }}>0</Button>
          </Box>
          <Button variant="contained" onClick={() => handleAction('.')} sx={{ minHeight: 40, fontWeight: 'bold' }}>.</Button>
      </Box>
    </Paper>
  );
}