const express = require('express');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { inRangeLength, isCreditHours } = require('../utils/validators');

const router = express.Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, code, name, instructor, credits, semester, schedule_text AS schedule, color, created_at AS createdAt
     FROM courses WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.id]
  );
  return res.json({ courses: rows });
});

router.post('/', async (req, res) => {
  const {
    code,
    name,
    instructor = '',
    credits = null,
    semester = 'Spring 2026',
    schedule = '',
    color = '#E84855'
  } = req.body || {};

  if (!inRangeLength(code, 3, 10)) {
    return res.status(400).json({ message: 'Course code must be 3 to 10 characters.' });
  }
  if (!inRangeLength(name, 3, 80)) {
    return res.status(400).json({ message: 'Course name must be 3 to 80 characters.' });
  }
  if (credits !== null && credits !== '' && !isCreditHours(credits)) {
    return res.status(400).json({ message: 'Credit hours must be between 1 and 6.' });
  }

  const pool = getPool();
  try {
    const [result] = await pool.query(
      `INSERT INTO courses
       (user_id, code, name, instructor, credits, semester, schedule_text, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        String(code).trim().toUpperCase(),
        String(name).trim(),
        String(instructor).trim(),
        credits === '' || credits === null ? null : Number(credits),
        String(semester).trim(),
        String(schedule).trim(),
        String(color).trim()
      ]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Course code already exists for this user.' });
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const {
    code,
    name,
    instructor = '',
    credits = null,
    semester = 'Spring 2026',
    schedule = '',
    color = '#E84855'
  } = req.body || {};

  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid course id.' });
  if (!inRangeLength(code, 3, 10) || !inRangeLength(name, 3, 80)) {
    return res.status(400).json({ message: 'Invalid course payload.' });
  }
  if (credits !== null && credits !== '' && !isCreditHours(credits)) {
    return res.status(400).json({ message: 'Credit hours must be between 1 and 6.' });
  }

  const pool = getPool();
  const [result] = await pool.query(
    `UPDATE courses
     SET code = ?, name = ?, instructor = ?, credits = ?, semester = ?, schedule_text = ?, color = ?
     WHERE id = ? AND user_id = ?`,
    [
      String(code).trim().toUpperCase(),
      String(name).trim(),
      String(instructor).trim(),
      credits === '' || credits === null ? null : Number(credits),
      String(semester).trim(),
      String(schedule).trim(),
      String(color).trim(),
      id,
      req.user.id
    ]
  );
  if (!result.affectedRows) {
    return res.status(404).json({ message: 'Course not found.' });
  }
  return res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid course id.' });

  const pool = getPool();
  const [result] = await pool.query('DELETE FROM courses WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!result.affectedRows) {
    return res.status(404).json({ message: 'Course not found.' });
  }
  return res.json({ success: true });
});

module.exports = router;