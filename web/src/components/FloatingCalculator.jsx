import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, Paper, Typography, IconButton, Grid, Button, 
  Divider, Tooltip, TextField
} from '@mui/material';
import { 
  Close, DragIndicator, ContentCopy, ContentPaste, Backspace
} from '@mui/icons-material';

export default function FloatingCalculator({ onClose }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 }); // Relative mouse position within the header
  const [isFocused, setIsFocused] = useState(true);
  
  const calcRef = useRef(null);

  // --- CALC LOGIC ---
  const handleAction = useCallback((val) => {
    if (val === '=') {
      try {
        // Simple eval-like logic (sanitized or use a parser if complex)
        // For a basic calculator, we can use Function constructor as a safer eval
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

  // --- KEYBOARD SUPPORT ---
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
      } else if ((e.ctrlKey || e.metaKey) && key === 'c') {
         // Let default copy work if text is selected, or we can force result copy
         if (!window.getSelection().toString()) {
            navigator.clipboard.writeText(result || input);
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, input, result, handleAction, onClose]);

  // --- DRAG LOGIC ---
  const onMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    const rect = calcRef.current.getBoundingClientRect();
    setRel({
      x: e.pageX - rect.left,
      y: e.pageY - rect.top
    });
    e.stopPropagation();
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging) return;
      setPos({
        x: e.pageX - rel.x,
        y: e.pageY - rel.y
      });
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
  }, [isDragging, rel]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result || input);
  };

  return (
    <Paper
      ref={calcRef}
      elevation={12}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false);
        }
      }}
      tabIndex={0}
      sx={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 280,
        height: 400,
        minWidth: 200,
        minHeight: 300,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        resize: 'both',
        transition: 'opacity 0.2s',
        opacity: isFocused ? 1 : 0.6,
        border: '1px solid',
        borderColor: isFocused ? 'primary.main' : 'divider',
        boxShadow: isFocused ? 24 : 4,
        '&:hover': { opacity: 1 }
      }}
    >
      {/* Header / Drag Handle */}
      <Box 
        onMouseDown={onMouseDown}
        sx={{ 
          p: 1, 
          bgcolor: isFocused ? 'primary.main' : 'background.paper', 
          color: isFocused ? 'primary.contrastText' : 'text.primary',
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'move',
          userSelect: 'none'
        }}
      >
        <DragIndicator fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
        <Typography variant="subtitle2" sx={{ flexGrow: 1, fontWeight: 'bold' }}>Calculator</Typography>
        <IconButton size="small" color="inherit" onClick={onClose} sx={{ ml: 1 }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Display */}
      <Box sx={{ p: 2, bgcolor: 'action.hover', textAlign: 'right' }}>
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

      {/* Buttons */}
      <Box sx={{ p: 1, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={1} sx={{ flexGrow: 1 }}>
          {['C', 'DEL', '/', '*'].map(btn => (
             <Grid item xs={3} key={btn}>
                <Button fullWidth variant="outlined" color="secondary" onClick={() => handleAction(btn)} sx={{ height: '100%', minHeight: 40 }}>
                    {btn === 'DEL' ? <Backspace fontSize="small" /> : btn}
                </Button>
             </Grid>
          ))}
          {['7', '8', '9', '-'].map(btn => (
             <Grid item xs={3} key={btn}>
                <Button fullWidth variant="contained" color={isNaN(btn) ? "secondary" : "inherit"} onClick={() => handleAction(btn)} sx={{ height: '100%', minHeight: 40 }}>
                    {btn}
                </Button>
             </Grid>
          ))}
          {['4', '5', '6', '+'].map(btn => (
             <Grid item xs={3} key={btn}>
                <Button fullWidth variant="contained" color={isNaN(btn) ? "secondary" : "inherit"} onClick={() => handleAction(btn)} sx={{ height: '100%', minHeight: 40 }}>
                    {btn}
                </Button>
             </Grid>
          ))}
          <Grid item xs={9}>
            <Grid container spacing={1} sx={{ height: '100%' }}>
                {['1', '2', '3', '0', '.', '='].map((btn, idx) => (
                    <Grid item xs={btn === '=' ? 8 : 4} key={btn}>
                        <Button 
                            fullWidth 
                            variant="contained" 
                            color={btn === '=' ? "primary" : "inherit"} 
                            onClick={() => handleAction(btn)} 
                            sx={{ height: '100%', minHeight: 40 }}
                        >
                            {btn}
                        </Button>
                    </Grid>
                ))}
            </Grid>
          </Grid>
          <Grid item xs={3}>
             {/* Large Equals space if needed, but handled above */}
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
