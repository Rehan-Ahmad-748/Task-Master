const express = require('express');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/summary', async (req, res) => {
  const pool = getPool();
  const userId = req.user.id;

  const [[totals]] = await pool.query(
    `SELECT
      COUNT(*) AS totalTasks,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedTasks,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingTasks,
      SUM(CASE WHEN status != 'completed' AND due_date < CURDATE() THEN 1 ELSE 0 END) AS overdueTasks
     FROM tasks WHERE user_id = ?`,
    [userId]
  );

  const [priorityMix] = await pool.query(
    `SELECT priority AS label, COUNT(*) AS value
     FROM tasks WHERE user_id = ? GROUP BY priority`,
    [userId]
  );

  const [typeMix] = await pool.query(
    `SELECT task_type AS label, COUNT(*) AS value
     FROM tasks WHERE user_id = ? GROUP BY task_type`,
    [userId]
  );

  const [courseProgress] = await pool.query(
    `SELECT
      c.code,
      c.name,
      c.color,
      COUNT(t.id) AS total,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS done
     FROM courses c
     LEFT JOIN tasks t ON t.course_id = c.id AND t.user_id = c.user_id
     WHERE c.user_id = ?
     GROUP BY c.id
     ORDER BY c.code ASC`,
    [userId]
  );

  return res.json({
    totals: {
      totalTasks: Number(totals.totalTasks || 0),
      completedTasks: Number(totals.completedTasks || 0),
      pendingTasks: Number(totals.pendingTasks || 0),
      overdueTasks: Number(totals.overdueTasks || 0)
    },
    priorityMix,
    typeMix,
    courseProgress: courseProgress.map(item => ({
      ...item,
      total: Number(item.total || 0),
      done: Number(item.done || 0)
    }))
  });
});

module.exports = router;