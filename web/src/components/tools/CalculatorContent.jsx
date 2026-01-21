import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Divider } from '@mui/joy';
import { ContentCopy, Backspace } from '@mui/icons-material';

export default function CalculatorContent({ onClose }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  const handleAction = useCallback((val) => {
    if (val === '=') {
      try {
        const res = new Function(`return ${input.replace(/[^-+*/.0-9]/g, '')}`)();
        setResult(String(res));
      } catch { setResult('Error'); }
    } else if (val === 'C') { setInput(''); setResult(''); }
    else if (val === 'DEL') { setInput(prev => prev.slice(0, -1)); }
    else { setInput(prev => prev + val); }
  }, [input]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (/[0-9+\-*/.]/.test(e.key)) handleAction(e.key);
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); handleAction('='); }
      else if (e.key === 'Backspace') handleAction('DEL');
      else if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction, onClose]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
    </Box>
  );
}