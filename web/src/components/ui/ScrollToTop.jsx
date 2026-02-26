import React, { useState, useEffect } from 'react';
import { IconButton, Box } from '@mui/joy';
import { KeyboardArrowUp } from '@mui/icons-material';

/**
 * Floating button to scroll back to top of the page/container.
 */
export default function ScrollToTop({ scrollRef }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = scrollRef?.current || window;
    const handleScroll = () => {
      const scrollY = target === window ? window.scrollY : target.scrollTop;
      setVisible(scrollY > 300);
    };

    target.addEventListener('scroll', handleScroll);
    return () => target.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);

  const scrollToTop = () => {
    const target = scrollRef?.current || window;
    target.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        display: visible ? 'block' : 'none',
      }}
    >
      <IconButton
        variant="solid"
        color="primary"
        size="lg"
        onClick={scrollToTop}
        sx={{
          borderRadius: '50%',
          boxShadow: 'md',
          width: 48,
          height: 48,
        }}
      >
        <KeyboardArrowUp />
      </IconButton>
    </Box>
  );
}
