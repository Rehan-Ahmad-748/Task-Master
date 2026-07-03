const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { isEmail, inRangeLength } = require('../utils/validators');

const router = express.Router();
router.use(authRequired);

router.put('/', async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    studentId = '',
    department = '',
    academicYear,
    semester,
    notificationPrefs = {}
  } = req.body || {};

  if (!inRangeLength(firstName, 2, 80) || !inRangeLength(lastName, 2, 80)) {
    return res.status(400).json({ message: 'First and last name must be 2 to 80 characters.' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ message: 'Valid email is required.' });
  }

  const pool = getPool();
  try {
    await pool.query(
      `UPDATE users
       SET first_name = ?, last_name = ?, email = ?, student_id = ?, department = ?,
           academic_year = ?, semester = ?,
           prefs_due_24h = ?, prefs_due_3d = ?, prefs_due_7d = ?, prefs_email_critical = ?
       WHERE id = ?`,
      [
        String(firstName).trim(),
        String(lastName).trim(),
        String(email).trim().toLowerCase(),
        String(studentId).trim(),
        String(department).trim(),
        String(academicYear || '').trim(),
        String(semester || '').trim(),
        notificationPrefs.dueWithin24Hours ? 1 : 0,
        notificationPrefs.dueWithin3Days ? 1 : 0,
        notificationPrefs.dueWithin7Days ? 1 : 0,
        notificationPrefs.emailCriticalOnly ? 1 : 0,
        req.user.id
      ]
    );
    return res.json({ success: true });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already in use by another account.' });
    }
    throw err;
  }
});

router.put('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !inRangeLength(newPassword, 8, 32)) {
    return res.status(400).json({ message: 'New password must be 8 to 32 characters.' });
  }

  const pool = getPool();
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);
  return res.json({ success: true });
});

module.exports = router;