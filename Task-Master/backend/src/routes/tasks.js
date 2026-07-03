const express = require('express');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { inRangeLength } = require('../utils/validators');

const router = express.Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const pool = getPool();
  const where = ['t.user_id = ?'];
  const params = [req.user.id];

  if (req.query.courseId) {
    where.push('t.course_id = ?');
    params.push(Number(req.query.courseId));
  }
  if (req.query.priority) {
    where.push('t.priority = ?');
    params.push(req.query.priority);
  }
  if (req.query.type) {
    where.push('t.task_type = ?');
    params.push(req.query.type);
  }
  if (req.query.status) {
    where.push('t.status = ?');
    params.push(req.query.status);
  }
  if (req.query.fromDate) {
    where.push('t.due_date >= ?');
    params.push(req.query.fromDate);
  }
  if (req.query.toDate) {
    where.push('t.due_date <= ?');
    params.push(req.query.toDate);
  }

  const [rows] = await pool.query(
    `SELECT
      t.id,
      t.course_id AS courseId,
      t.title,
      t.description,
      DATE_FORMAT(t.due_date, '%Y-%m-%d') AS dueDate,
      t.priority,
      t.task_type AS type,
      t.status,
      t.created_at AS createdAt
     FROM tasks t
     WHERE ${where.join(' AND ')}
     ORDER BY t.due_date ASC, t.created_at DESC`,
    params
  );

  return res.json({ tasks: rows });
});

router.post('/', async (req, res) => {
  const {
    courseId,
    title,
    description = '',
    dueDate,
    priority = 'Medium',
    type = 'Assignment',
    status = 'pending'
  } = req.body || {};

  if (!Number.isInteger(Number(courseId))) {
    return res.status(400).json({ message: 'Valid courseId is required.' });
  }
  if (!inRangeLength(title, 3, 80)) {
    return res.status(400).json({ message: 'Task title must be 3 to 80 characters.' });
  }
  if (!dueDate) {
    return res.status(400).json({ message: 'Due date is required.' });
  }

  const pool = getPool();
  const [courseRows] = await pool.query('SELECT id FROM courses WHERE id = ? AND user_id = ?', [Number(courseId), req.user.id]);
  if (!courseRows.length) {
    return res.status(404).json({ message: 'Course not found for this user.' });
  }

  const [result] = await pool.query(
    `INSERT INTO tasks
     (user_id, course_id, title, description, due_date, priority, task_type, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, Number(courseId), String(title).trim(), String(description).trim(), dueDate, priority, type, status]
  );

  return res.status(201).json({ id: result.insertId });
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const {
    courseId,
    title,
    description = '',
    dueDate,
    priority = 'Medium',
    type = 'Assignment',
    status = 'pending'
  } = req.body || {};

  if (!Number.isInteger(id) || !Number.isInteger(Number(courseId))) {
    return res.status(400).json({ message: 'Invalid task id or courseId.' });
  }
  if (!inRangeLength(title, 3, 80) || !dueDate) {
    return res.status(400).json({ message: 'Invalid task payload.' });
  }

  const pool = getPool();
  const [result] = await pool.query(
    `UPDATE tasks
     SET course_id = ?, title = ?, description = ?, due_date = ?, priority = ?, task_type = ?, status = ?
     WHERE id = ? AND user_id = ?`,
    [Number(courseId), String(title).trim(), String(description).trim(), dueDate, priority, type, status, id, req.user.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  return res.json({ success: true });
});

router.patch('/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!Number.isInteger(id) || !['pending', 'inprogress', 'completed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status update payload.' });
  }

  const pool = getPool();
  const [result] = await pool.query('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?', [status, id, req.user.id]);
  if (!result.affectedRows) {
    return res.status(404).json({ message: 'Task not found.' });
  }
  return res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid task id.' });

  const pool = getPool();
  const [result] = await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!result.affectedRows) {
    return res.status(404).json({ message: 'Task not found.' });
  }
  return res.json({ success: true });
});

module.exports = router;