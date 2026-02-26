import { useEffect } from 'react';
import { useColorScheme } from '@mui/joy';

/**
 * AUTO MODE HOOK
 * Item 230: Switch Dark/Light based on time/sun
 */
export function useAutoMode() {
  const { mode, setMode } = useColorScheme();

  useEffect(() => {
    const isAutoEnabled = localStorage.getItem('auto_dark_mode') === 'true';
    if (!isAutoEnabled) return;

    const checkSun = async () => {
      try {
        // 1. Get Location
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;

          // 2. Fetch Sun info (cached for the day)
          const res = await fetch(
            `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`
          );
          const { results } = await res.json();

          const now = new Date();
          const sunrise = new Date(results.sunrise);
          const sunset = new Date(results.sunset);

          if (now > sunset || now < sunrise) {
            if (mode !== 'dark') setMode('dark');
          } else {
            if (mode !== 'light') setMode('light');
          }
        });
      } catch (err) {
        console.error('Auto mode failed', err);
      }
    };

    checkSun();
    const interval = setInterval(checkSun, 60 * 60 * 1000); // Check every hour
    return () => clearInterval(interval);
  }, [mode, setMode]);
}
