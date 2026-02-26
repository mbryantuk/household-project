import { useState, useEffect } from 'react';
import posthog from 'posthog-js';

/**
 * FEATURE FLAG HOOK
 * Item 235: Integrated with PostHog
 */
export function useFeatureFlag(flagName) {
  const [isEnabled, setIsEnabled] = useState(posthog.isFeatureEnabled(flagName));

  useEffect(() => {
    const callback = () => {
      setIsEnabled(posthog.isFeatureEnabled(flagName));
    };

    posthog.onFeatureFlags(callback);
    return () => posthog.offFeatureFlags(callback);
  }, [flagName]);

  return isEnabled;
}
