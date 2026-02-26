import confetti from 'canvas-confetti';

/**
 * Trigger a celebration confetti burst
 */
export const triggerConfetti = (options = {}) => {
  const defaults = {
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#374151', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
    zIndex: 10000,
  };

  confetti({
    ...defaults,
    ...options,
  });
};

/**
 * Trigger a side-cannon celebration (good for major completions)
 */
export const triggerSuccessBlast = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 10000,
    colors: ['#374151', '#10b981'],
  };

  function fire(particleRatio, opts) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};
