CREATE DATABASE IF NOT EXISTS taskmaster;
USE taskmaster;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  academic_year VARCHAR(30) NOT NULL,
  semester VARCHAR(30) DEFAULT 'Spring 2026',
  department VARCHAR(120) DEFAULT '',
  student_id VARCHAR(40) DEFAULT '',
  prefs_due_24h TINYINT(1) DEFAULT 1,
  prefs_due_3d TINYINT(1) DEFAULT 1,
  prefs_due_7d TINYINT(1) DEFAULT 1,
  prefs_email_critical TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(80) NOT NULL,
  instructor VARCHAR(120) DEFAULT '',
  credits TINYINT UNSIGNED DEFAULT NULL,
  semester VARCHAR(30) DEFAULT 'Spring 2026',
  schedule_text VARCHAR(120) DEFAULT '',
  color VARCHAR(20) DEFAULT '#E84855',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_course_code (user_id, code),
  CONSTRAINT fk_courses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(80) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
  task_type ENUM('Assignment', 'Quiz', 'Project', 'Exam', 'Lab', 'Other') DEFAULT 'Assignment',
  status ENUM('pending', 'inprogress', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_priority ON tasks(user_id, priority);