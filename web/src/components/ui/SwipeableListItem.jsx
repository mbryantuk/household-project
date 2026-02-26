import React, { useState, useRef, useCallback } from 'react';
import { Box, useTheme } from '@mui/joy';
import { Check, Delete } from '@mui/icons-material';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * Swipeable List Item for Mobile
 * Provides Swipe-to-Action functionality (Right to Complete/Check, Left to Delete).
 *
 * @param {React.ReactNode} children - The list item content
 * @param {function} onSwipeRight - Handler for right swipe (Complete)
 * @param {function} onSwipeLeft - Handler for left swipe (Delete)
 */
export default function SwipeableListItem({ children, onSwipeRight, onSwipeLeft }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [swipeX, setSwipeX] = useState(0);
  const [isSwipingUI, setIsSwipingUI] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isSwiping = useRef(false);
  const isVerticalScroll = useRef(false);

  const THRESHOLD = 70;
  const MAX_SWIPE = 100;

  const handleTouchStart = useCallback((e) => {
    startX.current = e.touches[0].pageX;
    startY.current = e.touches[0].pageY;
    isSwiping.current = true;
    setIsSwipingUI(true);
    isVerticalScroll.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isSwiping.current || isVerticalScroll.current) return;

    const currentX = e.touches[0].pageX;
    const currentY = e.touches[0].pageY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Detect if user is trying to scroll vertically
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
      isVerticalScroll.current = true;
      setSwipeX(0);
      setIsSwipingUI(false);
      return;
    }

    if (Math.abs(diffX) > 10) {
      // Add resistance
      const resistance =
        diffX > 0 ? Math.min(diffX * 0.5, MAX_SWIPE) : Math.max(diffX * 0.5, -MAX_SWIPE);
      setSwipeX(resistance);

      // Prevent vertical scroll when swiping horizontally
      if (e.cancelable) e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsSwipingUI(false);
    if (!isSwiping.current || isVerticalScroll.current) {
      setSwipeX(0);
      return;
    }

    if (swipeX > THRESHOLD && onSwipeRight) {
      onSwipeRight();
    } else if (swipeX < -THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
    }

    setSwipeX(0);
    isSwiping.current = false;
  }, [onSwipeLeft, onSwipeRight, swipeX]);

  if (!isMobile) return children;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'md',
        touchAction: 'pan-y', // Allow vertical scrolling
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Actions */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          bgcolor: swipeX > 0 ? 'success.softBg' : 'danger.softBg',
          zIndex: 0,
          opacity: Math.abs(swipeX) > 20 ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      >
        <Check
          color="success"
          sx={{
            transform: `scale(${Math.min(swipeX / THRESHOLD, 1.2)})`,
            visibility: swipeX > 0 ? 'visible' : 'hidden',
          }}
        />
        <Delete
          color="danger"
          sx={{
            transform: `scale(${Math.min(Math.abs(swipeX) / THRESHOLD, 1.2)})`,
            visibility: swipeX < 0 ? 'visible' : 'hidden',
          }}
        />
      </Box>

      {/* Content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          transform: `translateX(${swipeX}px)`,
          transition: isSwipingUI ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
