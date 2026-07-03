const express = require('express');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const pool = getPool();
  const [userRows] = await pool.query(
    `SELECT prefs_due_24h, prefs_due_3d, prefs_due_7d
     FROM users WHERE id = ?`,
    [req.user.id]
  );
  if (!userRows.length) return res.status(404).json({ message: 'User not found.' });

  const prefs = userRows[0];
  const [rows] = await pool.query(
    `SELECT t.title, DATE_FORMAT(t.due_date, '%Y-%m-%d') AS dueDate, c.code AS courseCode
     FROM tasks t
     JOIN courses c ON c.id = t.course_id
     WHERE t.user_id = ? AND t.status <> 'completed'`,
    [req.user.id]
  );

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  function diffDays(fromStr, toStr) {
    const a = new Date(fromStr + 'T00:00:00');
    const b = new Date(toStr + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  const notifications = [];
  for (const row of rows) {
    const d = diffDays(todayKey, row.dueDate);
    if (d < 0) {
      notifications.push({ type: 'overdue', text: `${row.title} (${row.courseCode}) is overdue by ${Math.abs(d)} day(s).` });
    } else if (d <= 1 && prefs.prefs_due_24h) {
      notifications.push({ type: 'due-soon', text: `${row.title} (${row.courseCode}) is due within 24 hours.` });
    } else if (d <= 3 && prefs.prefs_due_3d) {
      notifications.push({ type: 'due-soon', text: `${row.title} (${row.courseCode}) is due in ${d} day(s).` });
    } else if (d <= 7 && prefs.prefs_due_7d) {
      notifications.push({ type: 'info', text: `${row.title} (${row.courseCode}) is due within a week.` });
    }
  }

  return res.json({ notifications });
});

module.exports = router;