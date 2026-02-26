import React, { useState, useRef, useCallback } from 'react';
import { Box, CircularProgress } from '@mui/joy';

/**
 * Pull to Refresh Wrapper for mobile
 *
 * @param {function} onRefresh - Async refresh handler
 * @param {React.ReactNode} children - Scrollable content
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const PULL_THRESHOLD = 60;
  const MAX_PULL = 100;

  const handleTouchStart = useCallback((e) => {
    // Only allow pull if we are at the top of the page/container
    if (window.scrollY <= 5) {
      startY.current = e.touches[0].pageY;
      isPulling.current = true;
    } else {
      isPulling.current = false;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (!isPulling.current || refreshing) return;

      const currentY = e.touches[0].pageY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Linear resistance
        const distance = Math.min(diff * 0.4, MAX_PULL);
        setPullDistance(distance);

        // Prevent default scrolling when pulling
        if (distance > 10 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    },
    [refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || refreshing) return;

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(40); // Stay at loading position
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    isPulling.current = false;
  }, [onRefresh, pullDistance, refreshing]);

  return (
    <Box
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{
        position: 'relative',
        minHeight: '100%',
        width: '100%',
        // Ensure the touch area covers the screen
      }}
    >
      <Box
        sx={{
          height: pullDistance,
          opacity: pullDistance > 0 ? 1 : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: isPulling.current ? 'none' : 'height 0.3s ease, opacity 0.3s ease',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <CircularProgress
          size="md"
          variant="soft"
          color="primary"
          determinate={!refreshing}
          value={refreshing ? undefined : Math.min((pullDistance / PULL_THRESHOLD) * 100, 100)}
        />
      </Box>
      <Box
        sx={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling.current ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
