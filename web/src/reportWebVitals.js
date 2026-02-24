// Item 159: Core Web Vitals Tracking (Updated for web-vitals v4)
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

const sendToAnalytics = (metric) => {
  const body = JSON.stringify(metric);

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/system/vitals', body);
  } else {
    // Fallback to fetch if sendBeacon is not available
    fetch('/api/system/vitals', {
      body,
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const reportWebVitals = () => {
  try {
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics); // Replaced onFID with onINP
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  } catch (error) {
    console.error('Error reporting web vitals', error);
  }
};
