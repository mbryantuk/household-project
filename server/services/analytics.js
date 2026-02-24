const { PostHog } = require('posthog-node');

// Item 72: Privacy-First Analytics (PostHog)
// Initialize PostHog, gracefully degrading if no key is provided
let client = null;

if (process.env.POSTHOG_API_KEY) {
  client = new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
  });
}

const captureEvent = (distinctId, event, properties = {}) => {
  if (client) {
    client.capture({
      distinctId,
      event,
      properties,
    });
  }
};

const shutdownAnalytics = () => {
  if (client) {
    client.shutdown();
  }
};

module.exports = { captureEvent, shutdownAnalytics };
