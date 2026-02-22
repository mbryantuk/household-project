const express = require('express');
const router = express.Router({ mergeParams: true });
const { useTenantDb } = require('../middleware/tenant');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

/**
 * Helper to calculate recurring cost due date
 */
const getNextDueDate = (cost) => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Simple Monthly Logic
  if (cost.frequency === 'monthly' && cost.day_of_month) {
    let targetMonth = currentMonth;
    let targetYear = currentYear;

    // If day has passed, move to next month
    if (cost.day_of_month < currentDay) {
      targetMonth++;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
      }
    }

    // Handle short months (e.g. 31st in Feb)
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const finalDay = Math.min(cost.day_of_month, daysInMonth);

    return new Date(targetYear, targetMonth, finalDay);
  }

  // Weekly Logic (Simplistic) - Assuming start_date is anchor
  if (cost.frequency === 'weekly' && cost.start_date) {
    const start = new Date(cost.start_date);
    const diff = today - start;
    const daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
    const daysToNext = 7 - (daysSince % 7);
    const next = new Date(today);
    next.setDate(today.getDate() + (daysToNext === 7 ? 0 : daysToNext));
    return next;
  }

  return null;
};

router.get(
  '/',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const nextMonth = new Date(today);
      nextMonth.setDate(today.getDate() + 30);

      const todayStr = today.toISOString().split('T')[0];
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      const nextMonthStr = nextMonth.toISOString().split('T')[0];

      const notifications = {
        urgent: [],
        upcoming: [],
        info: [],
      };

      // 1. Chores (Due today or overdue)
      const chores = await new Promise((resolve, reject) => {
        req.tenantDb.all(
          `SELECT * FROM chores WHERE next_due_date <= ? OR next_due_date IS NULL`,
          [nextWeekStr],
          (err, rows) => (err ? reject(err) : resolve(rows || []))
        );
      });

      chores.forEach((c) => {
        if (!c.next_due_date) return;
        const due = new Date(c.next_due_date);
        const isOverdue = due < today;
        const isToday = due.toDateString() === today.toDateString();

        const item = {
          type: 'chore',
          id: c.id,
          title: c.name,
          date: c.next_due_date,
          emoji: c.emoji || '🧹',
        };

        if (isOverdue) notifications.urgent.push({ ...item, message: 'Overdue' });
        else if (isToday) notifications.urgent.push({ ...item, message: 'Due Today' });
        else notifications.upcoming.push({ ...item, message: 'Due Soon' });
      });

      // 2. Calendar Events (Today + 7 days)
      const events = await new Promise((resolve, reject) => {
        req.tenantDb.all(
          `SELECT * FROM dates WHERE date BETWEEN ? AND ?`,
          [todayStr, nextWeekStr],
          (err, rows) => (err ? reject(err) : resolve(rows || []))
        );
      });

      events.forEach((e) => {
        const date = new Date(e.date);
        const isToday = date.toDateString() === today.toDateString();
        const item = {
          type: 'event',
          id: e.id,
          title: e.title,
          date: e.date,
          emoji: e.emoji || '📅',
        };

        if (isToday) notifications.info.push({ ...item, message: 'Happening Today' });
        else
          notifications.upcoming.push({ ...item, message: new Date(e.date).toLocaleDateString() });
      });

      // 3. Vehicles (MOT/Tax within 30 days)
      const vehicles = await new Promise((resolve, reject) => {
        req.tenantDb.all(
          `SELECT * FROM vehicles WHERE mot_due <= ? OR tax_due <= ?`,
          [nextMonthStr, nextMonthStr],
          (err, rows) => (err ? reject(err) : resolve(rows || []))
        );
      });

      vehicles.forEach((v) => {
        if (v.mot_due) {
          const mot = new Date(v.mot_due);
          if (mot <= nextMonth) {
            const isUrgent = mot <= nextWeek;
            const item = {
              type: 'vehicle',
              id: v.id,
              title: `${v.make} ${v.model} MOT`,
              date: v.mot_due,
              emoji: '🔧',
              message: isUrgent ? 'Expiring Soon!' : 'Due this month',
            };
            if (isUrgent) notifications.urgent.push(item);
            else notifications.upcoming.push(item);
          }
        }
        if (v.tax_due) {
          const tax = new Date(v.tax_due);
          if (tax <= nextMonth) {
            const isUrgent = tax <= nextWeek;
            const item = {
              type: 'vehicle',
              id: v.id,
              title: `${v.make} ${v.model} Tax`,
              date: v.tax_due,
              emoji: '🧾',
              message: isUrgent ? 'Expiring Soon!' : 'Due this month',
            };
            if (isUrgent) notifications.urgent.push(item);
            else notifications.upcoming.push(item);
          }
        }
      });

      // 4. Finance (Bills due in 7 days)
      const costs = await new Promise((resolve, reject) => {
        req.tenantDb.all(`SELECT * FROM recurring_costs WHERE is_active = 1`, [], (err, rows) =>
          err ? reject(err) : resolve(rows || [])
        );
      });

      costs.forEach((cost) => {
        const nextDue = getNextDueDate(cost);
        if (nextDue && nextDue >= today && nextDue <= nextWeek) {
          const isToday = nextDue.toDateString() === today.toDateString();
          const item = {
            type: 'bill',
            id: cost.id,
            title: cost.name,
            date: nextDue.toISOString().split('T')[0],
            amount: cost.amount,
            emoji: cost.emoji || '💸',
          };

          if (isToday) notifications.urgent.push({ ...item, message: 'Due Today' });
          else notifications.upcoming.push({ ...item, message: 'Due Soon' });
        }
      });

      res.json(notifications);
    } catch (err) {
      console.error('Notifications Error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
