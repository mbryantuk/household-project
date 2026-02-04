import React, { useState, useEffect } from 'react';
import { Stack, Typography, Box } from '@mui/joy';
import AccessTime from '@mui/icons-material/AccessTime';
import { format } from 'date-fns';
import WidgetWrapper from './WidgetWrapper';

/**
 * Mantel Clock Widget
 * Displays the current time and date in a premium architectural style.
 */
export default function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <WidgetWrapper title="System Time" icon={<AccessTime />} color="neutral">
      <Stack 
        alignItems="center" 
        justifyContent="center" 
        sx={{ 
            height: '100%', 
            py: 2,
            textAlign: 'center'
        }}
      >
        <Typography 
            level="h1" 
            sx={{ 
                fontSize: '3.5rem', 
                fontWeight: 'xl', 
                mb: 0,
                fontFamily: 'JetBrains Mono, Roboto Mono, monospace',
                letterSpacing: '-2px'
            }}
        >
          {format(now, 'HH:mm:ss')}
        </Typography>
        <Typography 
            level="title-md" 
            color="neutral"
            sx={{ 
                textTransform: 'uppercase', 
                letterSpacing: '2px',
                fontWeight: 'lg',
                mt: -1,
                opacity: 0.8
            }}
        >
          {format(now, 'EEEE, do MMMM yyyy')}
        </Typography>
      </Stack>
    </WidgetWrapper>
  );
}
