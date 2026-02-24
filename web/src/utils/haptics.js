/**
 * Haptic Feedback Utilities
 * Provides tactile feedback for mobile devices using the Vibration API.
 */

export const haptics = {
  /**
   * Light tap for standard button clicks or toggles.
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Moderate feedback for successful operations.
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 30, 10]);
    }
  },

  /**
   * Strong feedback for errors or destructive actions.
   */
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  },

  /**
   * Selection feedback for list item interactions.
   */
  selection: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  },
};

export default haptics;
