const geoip = require('geoip-lite');
const logger = require('./logger');

/**
 * IP GEOLOCATION UTILITY
 * Item 233
 */

function getCountryFromIP(ip) {
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.0.0.1')) {
    return 'LOCAL';
  }

  const geo = geoip.lookup(ip);
  if (!geo) {
    logger.warn(`[GEO] Could not resolve location for IP: ${ip}`);
    return 'UNKNOWN';
  }

  return geo.country;
}

module.exports = { getCountryFromIP };
