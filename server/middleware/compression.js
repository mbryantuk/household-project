const compression = require('compression');

// Add compression middleware logic for gzip/deflate support.
// Item 158: Aggressive Asset Optimization (partially met by edge caching, fully met by sending gzipped sizes).

module.exports = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});
