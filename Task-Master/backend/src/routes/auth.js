const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { isEmail, inRangeLength } = require('../utils/validators');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

router.post('/register', async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    academicYear,
    semester = 'Spring 2026'
  } = req.body || {};

  if (!inRangeLength(firstName, 2, 80) || !inRangeLength(lastName, 2, 80)) {
    return res.status(400).json({ message: 'First and last name must be 2 to 80 characters.' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ message: 'Valid email is required.' });
  }
  if (!inRangeLength(password, 8, 32)) {
    return res.status(400).json({ message: 'Password must be 8 to 32 characters.' });
  }
  if (!academicYear) {
    return res.status(400).json({ message: 'Academic year is required.' });
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const [existsRows] = await conn.query('SELECT id FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
    if (existsRows.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [insertResult] = await conn.query(
      `INSERT INTO users
       (first_name, last_name, email, password_hash, academic_year, semester)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [firstName.trim(), lastName.trim(), String(email).trim().toLowerCase(), passwordHash, academicYear, semester]
    );

    const user = {
      id: insertResult.insertId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: String(email).trim().toLowerCase(),
      academicYear,
      semester
    };

    return res.status(201).json({ token: signToken(user), user });
  } finally {
    conn.release();
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!isEmail(email) || !password) {
    return res.status(400).json({ message: 'Valid email and password are required.' });
  }

  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
  if (rows.length === 0) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const row = rows[0];
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const user = {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    academicYear: row.academic_year,
    semester: row.semester,
    department: row.department,
    studentId: row.student_id,
    notificationPrefs: {
      dueWithin24Hours: !!row.prefs_due_24h,
      dueWithin3Days: !!row.prefs_due_3d,
      dueWithin7Days: !!row.prefs_due_7d,
      emailCriticalOnly: !!row.prefs_email_critical
    }
  };

  return res.json({ token: signToken(user), user });
});

router.get('/me', authRequired, async (req, res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const row = rows[0];
  return res.json({
    user: {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      academicYear: row.academic_year,
      semester: row.semester,
      department: row.department,
      studentId: row.student_id,
      notificationPrefs: {
        dueWithin24Hours: !!row.prefs_due_24h,
        dueWithin3Days: !!row.prefs_due_3d,
        dueWithin7Days: !!row.prefs_due_7d,
        emailCriticalOnly: !!row.prefs_email_critical
      }
    }
  });
});

module.exports = router;