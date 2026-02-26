const express = require('express');
const router = express.Router();
const ical = require('ical-generator').default;
const { dbAll, getHouseholdDb } = require('../db');
const { households, apiKeys } = require('../db/schema');
const { eq, and } = require('drizzle-orm');
const crypto = require('crypto');

/**
 * PUBLIC ICAL FEED
 * Item 239: Subscription for Google Calendar/Apple Calendar
 * Authenticated via API Key in URL: /api/public/calendar/:hhId/feed.ics?key=...
 */
router.get('/:hhId/feed.ics', async (req, res) => {
  const { hhId } = req.params;
  const { key } = req.query;

  if (!key) return res.status(401).send('Missing API Key');

  try {
    const { db } = require('../db/index');
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    // Verify key has access to this household
    const [keyData] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          eq(apiKeys.householdId, parseInt(hhId)),
          eq(apiKeys.isActive, true)
        )
      )
      .limit(1);

    if (!keyData) return res.status(403).send('Invalid or unauthorized API Key');

    const tenantDb = getHouseholdDb(hhId);
    const dates = await dbAll(
      tenantDb,
      'SELECT * FROM dates WHERE household_id = ? AND deleted_at IS NULL',
      [hhId]
    );

    const calendar = ical({ name: `Hearthstone: HH ${hhId}` });

    dates.forEach((d) => {
      calendar.createEvent({
        start: new Date(d.date),
        end: d.end_date ? new Date(d.end_date) : new Date(d.date),
        summary: `${d.emoji || '📅'} ${d.title}`,
        description: d.description,
        allDay: !!d.is_all_day,
      });
    });

    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="calendar.ics"');
    res.send(calendar.toString());
  } catch (err) {
    console.error('[ICAL] Export failed:', err);
    res.status(500).send('Export failed');
  }
});

module.exports = router;
