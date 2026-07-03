/* ============================================
  TASKMASTER — App Logic
  Iteration 3: Analytics, Notifications, Export, Reporting
  Authors: Rehan Ahmed (23i-2551), Taha Khan (23i-2647)
  ============================================ */

// ============ PERSISTENCE ============
const DB_KEY = 'taskmaster_db';
const DEFAULT_NOTIFICATION_PREFS = {
  dueWithin24Hours: true,
  dueWithin3Days: true,
  dueWithin7Days: true,
  emailCriticalOnly: false
};

function getDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : { users: [], currentUser: null };
  } catch { return { users: [], currentUser: null }; }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getCurrentUser() {
  const db = getDB();
  if (!db.currentUser) return null;
  return db.users.find(u => u.email === db.currentUser) || null;
}

function getCourses() {
  const user = getCurrentUser();
  return user ? (user.courses || []) : [];
}

function saveCourses(courses) {
  const db = getDB();
  const idx = db.users.findIndex(u => u.email === db.currentUser);
  if (idx !== -1) { db.users[idx].courses = courses; saveDB(db); }
}

function getTasks() {
  const user = getCurrentUser();
  return user ? (user.tasks || []) : [];
}

function saveTasks(tasks) {
  const db = getDB();
  const idx = db.users.findIndex(u => u.email === db.currentUser);
  if (idx !== -1) { db.users[idx].tasks = tasks; saveDB(db); }
}

function getNotificationPrefs() {
  const user = getCurrentUser();
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notificationPrefs || {}) };
}

function persistCurrentUser(patch) {
  const db = getDB();
  const idx = db.users.findIndex(u => u.email === db.currentUser);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...patch };
  saveDB(db);
  return db.users[idx];
}

function normalizeUserRecord(user) {
  if (!user) return user;
  return {
    ...user,
    courses: Array.isArray(user.courses) ? user.courses : [],
    tasks: Array.isArray(user.tasks) ? user.tasks : [],
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, ...(user.notificationPrefs || {}) }
  };
}

function ensureCurrentUserDefaults() {
  const db = getDB();
  if (!db.currentUser) return null;
  const idx = db.users.findIndex(u => u.email === db.currentUser);
  if (idx === -1) return null;
  const normalized = normalizeUserRecord(db.users[idx]);
  const changed = JSON.stringify(normalized) !== JSON.stringify(db.users[idx]);
  if (changed) {
    db.users[idx] = normalized;
    saveDB(db);
  }
  return db.users[idx];
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (user) { bootApp(user); } else { showPage('auth'); }

  document.getElementById('color-picker')?.addEventListener('click', e => {
    const opt = e.target.closest('.color-opt');
    if (!opt) return;
    document.querySelectorAll('.color-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
  });

  // Close search dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#global-search-wrap')) {
      document.getElementById('search-dropdown')?.classList.add('hidden');
    }
    if (!e.target.closest('#notif-btn') && !e.target.closest('#notif-panel')) {
      document.getElementById('notif-panel')?.classList.add('hidden');
    }
  });
});

// ============ AUTH ============
function switchForm(form) {
  document.querySelectorAll('.auth-card').forEach(c => c.classList.remove('active'));
  document.getElementById('form-' + form).classList.add('active');
}

function showForgot() { switchForm('forgot'); }

function togglePass(id, el) {
  const input = document.getElementById(id);
  if (input.type === 'password') { input.type = 'text'; el.textContent = 'Hide'; }
  else { input.type = 'password'; el.textContent = 'Show'; }
}

function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.classList.add('hidden');
  if (!email || !password) return showError(errEl, 'Please fill in all fields.');
  if (!isValidEmail(email)) return showError(errEl, 'Please enter a valid email address.');

  const db = getDB();

  if (email === 'demo@university.edu' && password === 'demo123') {
    let user = db.users.find(u => u.email === email);
    if (!user) {
      user = {
        email, password: 'demo123',
        fname: 'Rehan', lname: 'Ahmed',
        year: '2nd Year', semester: 'Spring 2026',
        department: 'Computer Science', sid: '23i-2551',
        courses: [], tasks: [],
        notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
    }
    user = normalizeUserRecord(user);
    db.currentUser = email;
    saveDB(db);
    bootApp(user);
    return;
  }

  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) return showError(errEl, 'Invalid email or password. Try demo@university.edu / demo123');
  const normalizedUser = normalizeUserRecord(user);
  if (JSON.stringify(normalizedUser) !== JSON.stringify(user)) {
    const idx = db.users.findIndex(u => u.email === email);
    if (idx !== -1) db.users[idx] = normalizedUser;
  }
  db.currentUser = email;
  saveDB(db);
  bootApp(normalizedUser);
}

function handleRegister() {
  const fname    = document.getElementById('reg-fname').value.trim();
  const lname    = document.getElementById('reg-lname').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const year     = document.getElementById('reg-year').value;
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('reg-error');
  errEl.classList.add('hidden');

  if (!fname || !lname || !email || !year || !password) return showError(errEl, 'Please fill in all fields.');
  if (!isValidEmail(email)) return showError(errEl, 'Please enter a valid email address.');
  if (password.length < 8 || password.length > 32) return showError(errEl, 'Password must be between 8 and 32 characters.');

  const db = getDB();
  if (db.users.find(u => u.email === email)) return showError(errEl, 'An account with this email already exists.');

  const user = {
    email, password, fname, lname,
    year, semester: 'Spring 2026',
    department: '', sid: '',
    courses: [], tasks: [],
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  db.currentUser = email;
  saveDB(db);
  showToast('Account created! Welcome to TaskMaster.', 'success');
  bootApp(user);
}

function handleForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email || !isValidEmail(email)) { showToast('Please enter a valid email.', 'error'); return; }
  document.getElementById('forgot-msg').classList.remove('hidden');
  showToast('Reset link sent! (Demo mode)', 'success');
}

function handleLogout() {
  const db = getDB();
  db.currentUser = null;
  saveDB(db);
  location.reload();
}

// ============ BOOT ============
function bootApp(user) {
  showPage('app');
  const normalizedUser = ensureCurrentUserDefaults() || normalizeUserRecord(user);
  populateUI(normalizedUser);
  refreshDashboard();
  buildNotifications();
  renderAnalytics();
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
}

function populateUI(user) {
  const initials = ((user.fname?.[0] || '') + (user.lname?.[0] || '')).toUpperCase();
  document.getElementById('sidebar-name').textContent = user.fname + ' ' + user.lname;
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('topbar-avatar').textContent = initials;
  document.getElementById('profile-avatar-display').textContent = initials;
  document.getElementById('profile-name-display').textContent = user.fname + ' ' + user.lname;
  document.getElementById('profile-email-display').textContent = user.email;
  document.getElementById('profile-year-badge').textContent = user.year || '—';
  document.getElementById('profile-sem-badge').textContent = user.semester || 'Spring 2026';
  document.getElementById('p-fname').value = user.fname;
  document.getElementById('p-lname').value = user.lname;
  document.getElementById('p-email').value = user.email;
  document.getElementById('p-sid').value = user.sid || '';
  document.getElementById('p-dept').value = user.department || '';
  setSelectByText('p-year', user.year);
  setSelectByText('p-semester', user.semester);
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(user.notificationPrefs || {}) };
  setCheckbox('pref-24h', prefs.dueWithin24Hours);
  setCheckbox('pref-3days', prefs.dueWithin3Days);
  setCheckbox('pref-7days', prefs.dueWithin7Days);
  setCheckbox('pref-email-critical', prefs.emailCriticalOnly);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-greeting').textContent = `${greet}, ${user.fname}!`;
  const semInline = document.getElementById('dash-semester-inline');
  if (semInline) semInline.textContent = user.semester || 'Spring 2026';
}

function setCheckbox(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = !!checked;
}

function setSelectByText(id, text) {
  const sel = document.getElementById(id);
  if (!sel || !text) return;
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].text === text || sel.options[i].value === text) { sel.selectedIndex = i; break; }
  }
}

// ============ NAVIGATION ============
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + name)?.classList.add('active');
  document.getElementById('nav-' + name)?.classList.add('active');

  const titles = { dashboard: 'Dashboard', courses: 'My Courses', tasks: 'Tasks', calendar: 'Calendar', profile: 'Profile', analytics: 'Analytics' };
  document.getElementById('breadcrumb').textContent = titles[name] || name;

  if (name === 'dashboard') refreshDashboard();
  if (name === 'courses')   renderCourses();
  if (name === 'tasks')     { populateCourseFilter(); applyTaskFilters(); }
  if (name === 'calendar')  renderCalendar();
  if (name === 'profile')   refreshProfile();
  if (name === 'analytics') renderAnalytics();

  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebar-overlay').style.display = 'none';
  }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (window.innerWidth <= 768) {
    const open = sb.classList.toggle('mobile-open');
    ov.style.display = open ? 'block' : 'none';
  } else {
    const collapsed = sb.classList.toggle('collapsed');
    document.querySelector('.main-content').classList.toggle('full', collapsed);
  }
}

// ============ DASHBOARD ============
function refreshDashboard() {
  const courses = getCourses();
  const tasks   = getTasks();
  const user    = getCurrentUser();
  const today   = todayStr();

  const completed = tasks.filter(t => t.status === 'completed').length;
  const pending   = tasks.filter(t => t.status !== 'completed').length;
  const overdue   = tasks.filter(t => t.status !== 'completed' && t.dueDate < today).length;

  document.getElementById('dash-courses').textContent   = courses.length;
  document.getElementById('dash-completed').textContent = completed;
  document.getElementById('dash-pending').textContent   = pending;
  document.getElementById('dash-overdue').textContent   = overdue;

  // Nav badges
  const taskBadge   = document.getElementById('nav-tasks-count');
  const courseBadge = document.getElementById('nav-courses-count');
  if (taskBadge)   taskBadge.textContent   = tasks.filter(t => t.status !== 'completed').length;
  if (courseBadge) courseBadge.textContent = courses.length;

  // Due soon banner
  const banner = document.getElementById('due-soon-banner');
  const dueSoonTasks = tasks.filter(t => {
    if (t.status === 'completed') return false;
    const diff = daysDiff(today, t.dueDate);
    return diff >= 0 && diff <= 1;
  });
  if (dueSoonTasks.length > 0) {
    banner.classList.remove('hidden');
    const todayTasks = dueSoonTasks.filter(t => t.dueDate === today);
    document.getElementById('due-soon-text').textContent =
      todayTasks.length > 0
        ? `${todayTasks.length} task(s) due today! Stay on top of your deadlines.`
        : `${dueSoonTasks.length} task(s) due tomorrow. Plan ahead!`;
  } else {
    banner.classList.add('hidden');
  }

  // Upcoming tasks
  const upcoming = tasks
    .filter(t => t.status !== 'completed')
    .sort((a,b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const upEl = document.getElementById('dash-upcoming-list');
  if (upcoming.length === 0) {
    upEl.innerHTML = '<div class="empty-state sm"><p>No pending tasks. <a href="#" onclick="openTaskModal()">Add a task →</a></p></div>';
  } else {
    upEl.innerHTML = upcoming.map(t => {
      const course = getCourses().find(c => c.id === t.courseId);
      const color  = course?.color || '#9898A4';
      const dueClass = getDueBadgeClass(t.dueDate);
      const dueLabel = getDueLabel(t.dueDate);
      return `
        <div class="upcoming-item" onclick="openEditTask('${t.id}')">
          <div class="upcoming-dot" style="background:${color}"></div>
          <div class="upcoming-info">
            <div class="upcoming-title">${escHtml(t.title)}</div>
            <div class="upcoming-meta">${escHtml(course?.code || 'No Course')} · ${escHtml(t.type)}</div>
          </div>
          <div class="upcoming-due ${dueClass}">${dueLabel}</div>
        </div>`;
    }).join('');
  }

  // Course progress
  const progressEl = document.getElementById('dash-progress-list');
  if (courses.length === 0) {
    progressEl.innerHTML = '<div class="empty-state sm"><p>No courses yet. <a href="#" onclick="showView(\'courses\')">Add courses →</a></p></div>';
  } else {
    progressEl.innerHTML = courses.map(c => {
      const courseTasks = tasks.filter(t => t.courseId === c.id);
      const done  = courseTasks.filter(t => t.status === 'completed').length;
      const total = courseTasks.length;
      const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
      return `
        <div class="progress-item">
          <div class="progress-header">
            <span class="progress-name">${escHtml(c.name)}</span>
            <span class="progress-pct">${done}/${total} tasks (${pct}%)</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width:${pct}%;background:${c.color}"></div>
          </div>
        </div>`;
    }).join('');
  }
}

// ============ TASKS ============
let editingTaskId    = null;
let currentTaskView  = 'list';
let activePreset     = 'all';

function populateCourseFilter() {
  const sel = document.getElementById('filter-course');
  const courses = getCourses();
  const current = sel.value;
  sel.innerHTML = '<option value="">All Courses</option>' +
    courses.map(c => `<option value="${c.id}"${c.id === current ? ' selected' : ''}>${escHtml(c.code)} — ${escHtml(c.name)}</option>`).join('');
}

function setPreset(preset, el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activePreset = preset;
  // Reset dropdowns
  document.getElementById('filter-course').value   = '';
  document.getElementById('filter-priority').value = '';
  document.getElementById('filter-type').value     = '';
  document.getElementById('filter-status').value   = '';
  document.getElementById('task-search').value     = '';
  applyTaskFilters();
}

function resetTaskFilters() {
  document.getElementById('filter-course').value   = '';
  document.getElementById('filter-priority').value = '';
  document.getElementById('filter-type').value     = '';
  document.getElementById('filter-status').value   = '';
  document.getElementById('task-search').value     = '';
  activePreset = 'all';
  document.querySelectorAll('.filter-chip').forEach((c,i) => c.classList.toggle('active', i === 0));
  applyTaskFilters();
}

function applyTaskFilters() {
  const search   = document.getElementById('task-search')?.value.toLowerCase() || '';
  const courseId = document.getElementById('filter-course')?.value || '';
  const priority = document.getElementById('filter-priority')?.value || '';
  const type     = document.getElementById('filter-type')?.value || '';
  const status   = document.getElementById('filter-status')?.value || '';
  const fromDate = document.getElementById('filter-date-from')?.value || '';
  const toDate   = document.getElementById('filter-date-to')?.value || '';
  const today    = todayStr();

  let tasks = getTasks();

  // Preset filter
  if (activePreset === 'due-today')     tasks = tasks.filter(t => t.dueDate === today && t.status !== 'completed');
  if (activePreset === 'due-week')      tasks = tasks.filter(t => { const d = daysDiff(today, t.dueDate); return d >= 0 && d <= 7 && t.status !== 'completed'; });
  if (activePreset === 'high-priority') tasks = tasks.filter(t => t.priority === 'High' && t.status !== 'completed');
  if (activePreset === 'overdue')       tasks = tasks.filter(t => t.dueDate < today && t.status !== 'completed');

  // Dropdown filters
  if (courseId) tasks = tasks.filter(t => t.courseId === courseId);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  if (type)     tasks = tasks.filter(t => t.type === type);
  if (status === 'pending')   tasks = tasks.filter(t => t.status === 'pending');
  if (status === 'inprogress') tasks = tasks.filter(t => t.status === 'inprogress');
  if (status === 'completed') tasks = tasks.filter(t => t.status === 'completed');
  if (status === 'overdue')   tasks = tasks.filter(t => t.status !== 'completed' && t.dueDate < today);
  if (fromDate) tasks = tasks.filter(t => t.dueDate >= fromDate);
  if (toDate)   tasks = tasks.filter(t => t.dueDate <= toDate);

  // Search
  if (search) tasks = tasks.filter(t =>
    t.title.toLowerCase().includes(search) ||
    (t.description || '').toLowerCase().includes(search)
  );

  // Sort: overdue first, then by date
  tasks.sort((a,b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  if (currentTaskView === 'list') renderTaskList(tasks);
  else renderTaskBoard(tasks);
}

function switchTaskView(view) {
  currentTaskView = view;
  document.getElementById('task-list-view').style.display  = view === 'list'  ? 'block' : 'none';
  document.getElementById('task-board-view').style.display = view === 'board' ? 'block' : 'none';
  document.getElementById('toggle-list').classList.toggle('active',  view === 'list');
  document.getElementById('toggle-board').classList.toggle('active', view === 'board');
  applyTaskFilters();
}

// ---- List View ----
function renderTaskList(tasks) {
  const container = document.getElementById('task-list-container');
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
        <h3>No tasks found</h3>
        <p>Try adjusting your filters or add a new task</p>
        <button class="btn-primary sm" onclick="openTaskModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Task
        </button>
      </div>`;
    return;
  }

  const today = todayStr();

  // Group by due date proximity
  const groups = { overdue: [], today: [], upcoming: [], inprogress: [], completed: [] };
  tasks.forEach(t => {
    if (t.status === 'completed') groups.completed.push(t);
    else if (t.status === 'inprogress') groups.inprogress.push(t);
    else if (t.dueDate < today)   groups.overdue.push(t);
    else if (t.dueDate === today)  groups.today.push(t);
    else                          groups.upcoming.push(t);
  });

  const renderGroup = (label, list) => {
    if (list.length === 0) return '';
    return `
      <div class="task-list-group">
        <div class="task-group-label">${label} (${list.length})</div>
        ${list.map(t => renderTaskRow(t)).join('')}
      </div>`;
  };

  container.innerHTML =
    renderGroup('Overdue', groups.overdue) +
    renderGroup('Due Today', groups.today) +
    renderGroup('Upcoming', groups.upcoming) +
    renderGroup('In Progress', groups.inprogress) +
    renderGroup('Completed', groups.completed);
}

function renderTaskRow(t) {
  const course  = getCourses().find(c => c.id === t.courseId);
  const color   = course?.color || '#9898A4';
  const today   = todayStr();
  const isOver  = t.status !== 'completed' && t.dueDate < today;
  const checked = t.status === 'completed';
  const dueClass = getDueBadgeClass(t.dueDate, t.status);
  const dueLabel = getDueLabel(t.dueDate, t.status);

  return `
    <div class="task-row ${checked ? 'completed' : ''} ${isOver ? 'overdue-row' : ''}" id="trow-${t.id}">
      <button class="task-check-btn ${checked ? 'checked' : ''}" onclick="toggleTaskComplete('${t.id}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <div class="task-color-bar" style="background:${color}"></div>
      <div class="task-info">
        <div class="task-title-text">${escHtml(t.title)}</div>
        <div class="task-meta-row">
          <span class="task-meta-tag">${escHtml(course?.code || 'No Course')}</span>
          <span class="type-badge">${escHtml(t.type)}</span>
          <span class="priority-badge ${t.priority}">${t.priority}</span>
        </div>
      </div>
      <div class="task-due-badge ${dueClass}">${dueLabel}</div>
      <div class="task-row-actions">
        <button class="task-action-btn" onclick="openEditTask('${t.id}')">Edit</button>
        <button class="task-action-btn danger" onclick="openDeleteItem('task','${t.id}',\`${escHtml(t.title)}\`)">Del</button>
      </div>
    </div>`;
}

// ---- Board View ----
function renderTaskBoard(tasks) {
  const today = todayStr();
  const groups = { pending: [], inprogress: [], completed: [] };
  tasks.forEach(t => {
    if (t.status === 'completed')  groups.completed.push(t);
    else if (t.status === 'inprogress') groups.inprogress.push(t);
    else groups.pending.push(t);
  });

  const renderCard = (t) => {
    const course = getCourses().find(c => c.id === t.courseId);
    const color  = course?.color || '#9898A4';
    const dueClass = getDueBadgeClass(t.dueDate, t.status);
    const dueLabel = getDueLabel(t.dueDate, t.status);
    return `
      <div class="board-card" onclick="openEditTask('${t.id}')">
        <div class="board-card-color" style="background:${color}"></div>
        <div class="board-card-top">
          <div class="board-card-title">${escHtml(t.title)}</div>
        </div>
        <div class="board-card-meta">
          <span class="type-badge">${escHtml(t.type)}</span>
          <span class="priority-badge ${t.priority}">${t.priority}</span>
          <span class="task-due-badge ${dueClass}" style="font-size:10px">${dueLabel}</span>
        </div>
      </div>`;
  };

  document.getElementById('board-pending').innerHTML       = groups.pending.map(renderCard).join('') || '<div style="padding:10px;font-size:12px;color:var(--text3);text-align:center">No tasks</div>';
  document.getElementById('board-inprogress').innerHTML    = groups.inprogress.map(renderCard).join('') || '<div style="padding:10px;font-size:12px;color:var(--text3);text-align:center">No tasks</div>';
  document.getElementById('board-completed-col').innerHTML = groups.completed.map(renderCard).join('') || '<div style="padding:10px;font-size:12px;color:var(--text3);text-align:center">No tasks</div>';
  document.getElementById('board-pending-count').textContent    = groups.pending.length;
  document.getElementById('board-inprogress-count').textContent = groups.inprogress.length;
  document.getElementById('board-completed-count').textContent  = groups.completed.length;
}

// ---- Task Modal ----
function openTaskModal() {
  editingTaskId = null;
  document.getElementById('task-modal-title').textContent  = 'Add New Task';
  document.getElementById('task-modal-submit').textContent = 'Add Task';
  clearTaskForm();
  populateTaskCourseSelect();
  // Default due date = today
  document.getElementById('t-due').value = todayStr();
  document.getElementById('task-modal').classList.remove('hidden');
}

function openEditTask(id) {
  const task = getTasks().find(t => t.id === id);
  if (!task) return;
  editingTaskId = id;
  document.getElementById('task-modal-title').textContent  = 'Edit Task';
  document.getElementById('task-modal-submit').textContent = 'Save Changes';
  populateTaskCourseSelect(task.courseId);

  document.getElementById('t-title').value   = task.title;
  document.getElementById('t-desc').value    = task.description || '';
  document.getElementById('t-due').value     = task.dueDate;
  setSelectByText('t-type',     task.type);
  setSelectByText('t-priority', task.priority);
  setSelectByText('t-status',   task.status);

  document.getElementById('task-modal-error').classList.add('hidden');
  document.getElementById('task-modal').classList.remove('hidden');
}

function populateTaskCourseSelect(selectedId = '') {
  const sel = document.getElementById('t-course');
  const courses = getCourses();
  sel.innerHTML = '<option value="">-- Select Course --</option>' +
    courses.map(c => `<option value="${c.id}"${c.id === selectedId ? ' selected' : ''}>${escHtml(c.code)} — ${escHtml(c.name)}</option>`).join('');
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.add('hidden');
  editingTaskId = null;
  clearTaskForm();
}

function clearTaskForm() {
  ['t-title','t-desc','t-due'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  setSelectByText('t-type',     'Assignment');
  setSelectByText('t-priority', 'Medium');
  setSelectByText('t-status',   'pending');
  const errEl = document.getElementById('task-modal-error');
  if (errEl) errEl.classList.add('hidden');
}

function saveTask() {
  const title    = document.getElementById('t-title').value.trim();
  const desc     = document.getElementById('t-desc').value.trim();
  const courseId = document.getElementById('t-course').value;
  const type     = document.getElementById('t-type').value;
  const dueDate  = document.getElementById('t-due').value;
  const priority = document.getElementById('t-priority').value;
  const status   = document.getElementById('t-status').value;
  const errEl    = document.getElementById('task-modal-error');

  errEl.classList.add('hidden');
  if (!title)   return showError(errEl, 'Task title is required.');
  if (title.length < 3 || title.length > 80) return showError(errEl, 'Task title must be between 3 and 80 characters.');
  if (!courseId) return showError(errEl, 'Please select a course.');
  if (!dueDate) return showError(errEl, 'Due date is required.');

  let tasks = getTasks();

  if (editingTaskId) {
    const idx = tasks.findIndex(t => t.id === editingTaskId);
    if (idx !== -1) tasks[idx] = { ...tasks[idx], title, description: desc, courseId, type, dueDate, priority, status };
    saveTasks(tasks);
    closeTaskModal();
    applyTaskFilters();
    refreshDashboard();
    buildNotifications();
    renderAnalytics();
    showToast('Task updated successfully!', 'success');
  } else {
    const task = {
      id: Date.now().toString(), title, description: desc, courseId, type, dueDate, priority,
      status: status || 'pending', createdAt: new Date().toISOString()
    };
    tasks.push(task);
    saveTasks(tasks);
    closeTaskModal();
    applyTaskFilters();
    refreshDashboard();
    buildNotifications();
    renderAnalytics();
    showToast('Task added successfully!', 'success');
  }
}

function toggleTaskComplete(id) {
  let tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  tasks[idx].status = tasks[idx].status === 'completed' ? 'pending' : 'completed';
  saveTasks(tasks);
  applyTaskFilters();
  refreshDashboard();
  buildNotifications();
  renderAnalytics();
  showToast(tasks[idx].status === 'completed' ? 'Task marked complete!' : 'Task reopened.', 'success');
}

// ============ GLOBAL SEARCH ============
function handleGlobalSearch(query) {
  const dd = document.getElementById('search-dropdown');
  if (!query.trim()) { dd.classList.add('hidden'); return; }

  const tasks   = getTasks();
  const courses = getCourses();
  const q = query.toLowerCase();

  const results = tasks
    .filter(t => t.title.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q))
    .slice(0, 8);

  if (results.length === 0) {
    dd.innerHTML = `<div class="search-no-results">No tasks found for "${escHtml(query)}"</div>`;
  } else {
    dd.innerHTML = results.map(t => {
      const course = courses.find(c => c.id === t.courseId);
      const color  = course?.color || '#9898A4';
      return `
        <div class="search-result-item" onclick="handleSearchClick('${t.id}')">
          <div class="search-result-dot" style="background:${color}"></div>
          <div>
            <div class="search-result-title">${escHtml(t.title)}</div>
            <div class="search-result-meta">${escHtml(course?.code || '—')} · Due ${formatDate(t.dueDate)} · ${t.priority}</div>
          </div>
        </div>`;
    }).join('');
  }
  dd.classList.remove('hidden');
}

function handleSearchClick(taskId) {
  document.getElementById('search-dropdown').classList.add('hidden');
  document.getElementById('global-search').value = '';
  showView('tasks');
  setTimeout(() => openEditTask(taskId), 100);
}

// ============ NOTIFICATIONS ============
function buildNotifications() {
  const tasks = getTasks();
  const today = todayStr();
  const notifs = [];
  const prefs = getNotificationPrefs();

  tasks.forEach(t => {
    if (t.status === 'completed') return;
    const diff = daysDiff(today, t.dueDate);
    const course = getCourses().find(c => c.id === t.courseId);
    const cname = course?.code || 'Unknown';

    if (diff < 0) {
      notifs.push({ type: 'overdue', text: `<strong>${escHtml(t.title)}</strong> (${cname}) is overdue by ${Math.abs(diff)} day(s).` });
    } else if (diff === 0 && prefs.dueWithin24Hours) {
      notifs.push({ type: 'due-soon', text: `<strong>${escHtml(t.title)}</strong> (${cname}) is due today!` });
    } else if (diff <= 1 && prefs.dueWithin24Hours) {
      notifs.push({ type: 'due-soon', text: `<strong>${escHtml(t.title)}</strong> (${cname}) is due within 24 hours.` });
    } else if (diff <= 3 && prefs.dueWithin3Days) {
      notifs.push({ type: 'due-soon', text: `<strong>${escHtml(t.title)}</strong> (${cname}) is due in ${diff} day(s).` });
    } else if (diff <= 7 && prefs.dueWithin7Days) {
      notifs.push({ type: 'info', text: `<strong>${escHtml(t.title)}</strong> (${cname}) is due within a week.` });
    }
  });

  const listEl = document.getElementById('notif-list');
  const dot    = document.getElementById('notif-dot');

  if (notifs.length === 0) {
    listEl.innerHTML = '<div class="notif-empty">No notifications. You\'re all caught up!</div>';
    dot.classList.remove('visible');
  } else {
    dot.classList.add('visible');
    listEl.innerHTML = notifs.map(n => `
      <div class="notif-item">
        <div class="notif-item-icon ${n.type}">
          ${n.type === 'overdue'
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
          }
        </div>
        <div class="notif-item-text">${n.text}</div>
      </div>`).join('');
  }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  panel.classList.toggle('hidden');
}

function clearAllNotifs() {
  document.getElementById('notif-list').innerHTML = '<div class="notif-empty">No notifications. You\'re all caught up!</div>';
  document.getElementById('notif-dot').classList.remove('visible');
  document.getElementById('notif-panel').classList.add('hidden');
}

// ============ CALENDAR ============
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

function renderCalendar() {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-title').textContent = `${monthNames[calMonth]} ${calYear}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = todayStr();
  const tasks = getTasks();

  let html = '';

  // Padding cells for previous month
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-cell other-month"><div class="cal-day-num">${prevDays - i}</div></div>`;
  }

  // Current month cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayTasks = tasks.filter(t => t.dueDate === dateStr);
    const isToday  = dateStr === today;
    const hasTasks = dayTasks.length > 0;

    const dotHtml = dayTasks.slice(0,3).map(t => {
      const course = getCourses().find(c => c.id === t.courseId);
      const color  = course?.color || '#9898A4';
      return `<div class="cal-task-dot" style="background:${color}">${escHtml(t.title)}</div>`;
    }).join('');

    const more = dayTasks.length > 3 ? `<div class="cal-more">+${dayTasks.length - 3} more</div>` : '';

    html += `
      <div class="cal-cell${isToday ? ' today-cell' : ''}${hasTasks ? ' has-tasks' : ''}" onclick="showCalDay('${dateStr}')">
        <div class="cal-day-num">${d}</div>
        <div class="cal-task-dots">${dotHtml}</div>
        ${more}
      </div>`;
  }

  // Fill remaining cells
  const total = firstDay + daysInMonth;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-cell other-month"><div class="cal-day-num">${d}</div></div>`;
  }

  document.getElementById('cal-grid').innerHTML = html;
  document.getElementById('cal-day-detail').classList.add('hidden');
}

function renderAnalytics() {
  const tasks = getTasks();
  const courses = getCourses();
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const overdue = tasks.filter(t => t.status !== 'completed' && t.dueDate < todayStr()).length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const productivityScore = total ? Math.max(0, Math.min(100, Math.round(((completed + pending) / total) * 100) - overdue * 5)) : 0;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('analytics-total-tasks', total);
  setText('analytics-completed', completed);
  setText('analytics-completion-rate', `${completionRate}%`);
  setText('analytics-overdue', overdue);
  setText('analytics-courses', `${courses.length} courses`);
  setText('analytics-productivity', `${productivityScore}%`);

  const priorityCounts = ['High', 'Medium', 'Low'].map(priority => ({
    label: priority,
    value: tasks.filter(t => t.priority === priority).length,
    color: priority === 'High' ? 'var(--accent)' : priority === 'Medium' ? 'var(--orange)' : 'var(--blue)'
  }));

  const typeLabels = ['Assignment', 'Quiz', 'Project', 'Exam', 'Lab', 'Other'];
  const typeCounts = typeLabels.map(type => ({ label: type, value: tasks.filter(t => t.type === type).length }));

  const weekData = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = formatDateKey(date);
    weekData.push({
      label: shortWeekday(date),
      value: tasks.filter(t => t.dueDate === dateStr && t.status !== 'completed').length
    });
  }

  const courseData = courses.map(course => {
    const courseTasks = tasks.filter(t => t.courseId === course.id);
    const done = courseTasks.filter(t => t.status === 'completed').length;
    return {
      code: course.code,
      name: course.name,
      color: course.color,
      total: courseTasks.length,
      done,
      pct: courseTasks.length ? Math.round((done / courseTasks.length) * 100) : 0
    };
  }).sort((a, b) => b.pct - a.pct);

  renderAnalyticsBars('analytics-priority-list', priorityCounts, 'No tasks yet.', true);
  renderAnalyticsBars('analytics-type-list', typeCounts, 'No task types yet.');
  renderAnalyticsBars('analytics-week-list', weekData, 'No upcoming workload.');
  renderAnalyticsCourses(courseData);

  const courseMsg = document.getElementById('analytics-course-summary');
  if (courseMsg) {
    courseMsg.textContent = courses.length
      ? `Your strongest course is ${courseData[0]?.code || 'n/a'} at ${courseData[0]?.pct || 0}% completion.`
      : 'Add courses to see course completion analytics.';
  }
}

function renderAnalyticsBars(containerId, items, emptyMessage, showValue = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!items.length || items.every(item => item.value === 0)) {
    container.innerHTML = `<div class="empty-state sm"><p>${emptyMessage}</p></div>`;
    return;
  }

  const max = Math.max(...items.map(item => item.value), 1);
  container.innerHTML = items.map(item => {
    const percent = Math.max(8, Math.round((item.value / max) * 100));
    return `
      <div class="analytics-bar-item">
        <div class="analytics-bar-head">
          <span>${escHtml(item.label)}</span>
          <span>${showValue ? item.value : item.value}</span>
        </div>
        <div class="analytics-bar-track">
          <div class="analytics-bar-fill" style="width:${percent}%;${item.color ? `background:${item.color};` : ''}"></div>
        </div>
      </div>`;
  }).join('');
}

function renderAnalyticsCourses(items) {
  const container = document.getElementById('analytics-course-list');
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state sm"><p>Add courses to view course completion analytics.</p></div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="analytics-course-item">
      <div class="analytics-course-top">
        <div>
          <div class="analytics-course-code">${escHtml(item.code)}</div>
          <div class="analytics-course-name">${escHtml(item.name)}</div>
        </div>
        <div class="analytics-course-pct">${item.pct}%</div>
      </div>
      <div class="analytics-bar-track">
        <div class="analytics-bar-fill" style="width:${Math.max(item.pct, 8)}%;background:${item.color || 'var(--accent)'}"></div>
      </div>
      <div class="analytics-course-meta">${item.done}/${item.total} tasks completed</div>
    </div>
  `).join('');
}

function exportTaskData(format = 'json') {
  const user = getCurrentUser();
  if (!user) return;
  const tasks = getTasks();
  const courses = getCourses();

  if (format === 'csv') {
    const rows = [['Task Title', 'Course', 'Type', 'Priority', 'Status', 'Due Date', 'Description']];
    tasks.forEach(task => {
      const course = courses.find(c => c.id === task.courseId);
      rows.push([
        task.title,
        course?.code || '',
        task.type || '',
        task.priority || '',
        task.status || '',
        task.dueDate || '',
        task.description || ''
      ]);
    });
    downloadTextFile(`TaskMaster_${user.email}_tasks.csv`, rows.map(row => row.map(csvEscape).join(',')).join('\n'), 'text/csv');
    showToast('CSV export downloaded.', 'success');
    return;
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      name: `${user.fname || ''} ${user.lname || ''}`.trim(),
      email: user.email,
      semester: user.semester,
      academicYear: user.year
    },
    courses,
    tasks,
    summary: {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      overdueTasks: tasks.filter(t => t.status !== 'completed' && t.dueDate < todayStr()).length
    }
  };
  downloadTextFile(`TaskMaster_${user.email}_backup.json`, JSON.stringify(payload, null, 2), 'application/json');
  showToast('JSON backup downloaded.', 'success');
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

function showCalDay(dateStr) {
  // Deselect all, select clicked
  document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected-cell'));
  const clickedCell = event?.target?.closest('.cal-cell');
  if (clickedCell) clickedCell.classList.add('selected-cell');

  const tasks  = getTasks().filter(t => t.dueDate === dateStr);
  const detail = document.getElementById('cal-day-detail');
  const today  = todayStr();

  document.getElementById('cal-detail-title').textContent = `Tasks for ${formatDate(dateStr)}`;

  if (tasks.length === 0) {
    document.getElementById('cal-detail-list').innerHTML = '<p style="font-size:13px;color:var(--text3);padding:8px 0">No tasks on this day.</p>';
  } else {
    document.getElementById('cal-detail-list').innerHTML = tasks.map(t => {
      const course = getCourses().find(c => c.id === t.courseId);
      const color  = course?.color || '#9898A4';
      return `
        <div class="cal-detail-item" onclick="openEditTask('${t.id}')">
          <div class="cal-detail-dot" style="background:${color}"></div>
          <div class="cal-detail-title">${escHtml(t.title)}</div>
          <div class="cal-detail-badges">
            <span class="priority-badge ${t.priority}">${t.priority}</span>
            <span class="type-badge">${escHtml(t.type)}</span>
          </div>
          ${t.status === 'completed' ? '<span style="font-size:11px;color:var(--green)">✓ Done</span>' : ''}
        </div>`;
    }).join('');
  }
  detail.classList.remove('hidden');
}

// ============ COURSES (from Iteration 1, preserved) ============
let currentFilter    = 'all';
let editingCourseId  = null;
let deletingId       = null;
let deletingType     = null;

function renderCourses(filter) {
  if (filter !== undefined) currentFilter = filter;
  let courses = getCourses();
  if (currentFilter !== 'all') courses = courses.filter(c => c.semester === currentFilter);

  const grid    = document.getElementById('courses-grid');
  const emptyEl = document.getElementById('courses-empty');

  if (courses.length === 0) {
    grid.innerHTML = '';
    emptyEl.style.display = '';
    grid.appendChild(emptyEl);
    return;
  }

  if (emptyEl.parentNode === grid) emptyEl.style.display = 'none';

  grid.innerHTML = courses.map(c => {
    const courseTasks = getTasks().filter(t => t.courseId === c.id);
    const done = courseTasks.filter(t => t.status === 'completed').length;
    return `
      <div class="course-card" id="card-${c.id}">
        <div class="course-card-bar" style="background:${c.color}"></div>
        <div class="course-card-body">
          <div class="course-card-header">
            <span class="course-code-badge" style="background:${c.color}22;color:${c.color}">${escHtml(c.code)}</span>
            <div class="course-actions">
              <button class="course-action-btn" onclick="openEditCourse('${c.id}')">Edit</button>
              <button class="course-action-btn danger" onclick="openDeleteItem('course','${c.id}',\`${escHtml(c.name)}\`)">Delete</button>
            </div>
          </div>
          <div class="course-name">${escHtml(c.name)}</div>
          <div class="course-instructor">
            ${c.instructor
              ? `<svg class="course-instructor-icon" width="12" height="12" style="display:inline;margin-right:5px;vertical-align:-1px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>${escHtml(c.instructor)}`
              : `<span style="color:var(--text3);font-size:12px">No instructor added</span>`}
          </div>
          <div class="course-meta">
            <span class="meta-tag"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escHtml(c.semester)}</span>
            ${c.schedule ? `<span class="meta-tag"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${escHtml(c.schedule)}</span>` : ''}
            ${c.credits  ? `<span class="meta-tag">${escHtml(String(c.credits))} cr</span>` : ''}
            <span class="meta-tag">${done}/${courseTasks.length} tasks</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function filterCourses(filter, el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderCourses(filter);
}

// ---- Course Modal ----
function openCourseModal() {
  editingCourseId = null;
  document.getElementById('modal-title').textContent = 'Add New Course';
  document.getElementById('modal-submit-btn').textContent = 'Add Course';
  clearCourseForm();
  document.getElementById('course-modal').classList.remove('hidden');
}

function openEditCourse(id) {
  const course = getCourses().find(c => c.id === id);
  if (!course) return;
  editingCourseId = id;
  document.getElementById('modal-title').textContent = 'Edit Course';
  document.getElementById('modal-submit-btn').textContent = 'Save Changes';
  document.getElementById('c-code').value       = course.code;
  document.getElementById('c-name').value       = course.name;
  document.getElementById('c-instructor').value = course.instructor || '';
  document.getElementById('c-credits').value    = course.credits || '';
  document.getElementById('c-schedule').value   = course.schedule || '';
  setSelectByText('c-semester', course.semester);
  document.querySelectorAll('.color-opt').forEach(o => o.classList.toggle('selected', o.dataset.color === course.color));
  document.getElementById('course-modal-error').classList.add('hidden');
  document.getElementById('course-modal').classList.remove('hidden');
}

function closeCourseModal() {
  document.getElementById('course-modal').classList.add('hidden');
  editingCourseId = null;
  clearCourseForm();
}

function clearCourseForm() {
  ['c-code','c-name','c-instructor','c-credits','c-schedule'].forEach(id => { document.getElementById(id).value = ''; });
  setSelectByText('c-semester', 'Spring 2026');
  document.querySelectorAll('.color-opt').forEach((o, i) => o.classList.toggle('selected', i === 0));
  document.getElementById('course-modal-error').classList.add('hidden');
}

function saveCourse() {
  const code       = document.getElementById('c-code').value.trim().toUpperCase();
  const name       = document.getElementById('c-name').value.trim();
  const instructor = document.getElementById('c-instructor').value.trim();
  const credits    = document.getElementById('c-credits').value;
  const schedule   = document.getElementById('c-schedule').value.trim();
  const semester   = document.getElementById('c-semester').value;
  const color      = document.querySelector('.color-opt.selected')?.dataset.color || '#E84855';
  const errEl      = document.getElementById('course-modal-error');
  errEl.classList.add('hidden');

  if (!code) return showError(errEl, 'Course code is required.');
  if (code.length < 3 || code.length > 10) return showError(errEl, 'Course code must be between 3 and 10 characters.');
  if (!name) return showError(errEl, 'Course name is required.');
  if (name.length < 3 || name.length > 80) return showError(errEl, 'Course name must be between 3 and 80 characters.');
  if (credits && (Number(credits) < 1 || Number(credits) > 6)) return showError(errEl, 'Credit hours must be between 1 and 6.');

  let courses = getCourses();

  if (editingCourseId) {
    const idx = courses.findIndex(c => c.id === editingCourseId);
    if (idx !== -1) courses[idx] = { ...courses[idx], code, name, instructor, credits, schedule, semester, color };
    saveCourses(courses);
    closeCourseModal();
    renderCourses();
    refreshDashboard();
    renderAnalytics();
    showToast('Course updated!', 'success');
  } else {
    if (courses.find(c => c.code === code)) return showError(errEl, `Course "${code}" already exists.`);
    courses.push({ id: Date.now().toString(), code, name, instructor, credits, schedule, semester, color, createdAt: new Date().toISOString() });
    saveCourses(courses);
    closeCourseModal();
    renderCourses();
    refreshDashboard();
    renderAnalytics();
    showToast('Course added!', 'success');
  }
}

// ---- Unified Delete ----
function openDeleteItem(type, id, name) {
  deletingType = type;
  deletingId   = id;
  document.getElementById('delete-modal-title').textContent = type === 'task' ? 'Delete Task' : 'Delete Course';
  document.getElementById('delete-item-name').textContent   = name;
  document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
  deletingId = null; deletingType = null;
}

function confirmDelete() {
  if (!deletingId) return;
  if (deletingType === 'task') {
    saveTasks(getTasks().filter(t => t.id !== deletingId));
    closeDeleteModal();
    applyTaskFilters();
    refreshDashboard();
    buildNotifications();
    renderAnalytics();
    showToast('Task deleted.', 'success');
  } else if (deletingType === 'course') {
    saveCourses(getCourses().filter(c => c.id !== deletingId));
    // Also remove tasks for this course
    saveTasks(getTasks().filter(t => t.courseId !== deletingId));
    closeDeleteModal();
    renderCourses();
    refreshDashboard();
    renderAnalytics();
    showToast('Course and its tasks deleted.', 'success');
  }
}

// ============ PROFILE ============
let profileEditMode = false;

function refreshProfile() {
  const tasks = getTasks();
  const total = tasks.length;
  const done  = tasks.filter(t => t.status === 'completed').length;
  const pct   = total > 0 ? Math.round((done/total)*100) : 0;
  document.getElementById('p-courses').textContent    = getCourses().length;
  document.getElementById('p-tasks-total').textContent = total;
  document.getElementById('p-progress').textContent   = pct + '%';
}

function toggleProfileEdit() {
  profileEditMode = !profileEditMode;
  const inputs    = document.querySelectorAll('.profile-input, .pref-option input[type="checkbox"]');
  const actionsEl = document.getElementById('profile-actions');
  const passSection = document.getElementById('password-section');
  const editBtn   = document.getElementById('profile-edit-btn');
  inputs.forEach(inp => inp.disabled = !profileEditMode);
  actionsEl.style.display   = profileEditMode ? 'flex' : 'none';
  passSection.style.display = profileEditMode ? 'block' : 'none';
  editBtn.innerHTML = profileEditMode
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Editing…`
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Edit Profile`;
}

function cancelProfileEdit() {
  const user = getCurrentUser();
  if (user) populateUI(user);
  profileEditMode = false;
  document.querySelectorAll('.profile-input, .pref-option input[type="checkbox"]').forEach(inp => inp.disabled = true);
  document.getElementById('profile-actions').style.display  = 'none';
  document.getElementById('password-section').style.display = 'none';
  document.getElementById('profile-edit-btn').innerHTML =
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Edit Profile`;
}

function saveProfile() {
  const fname    = document.getElementById('p-fname').value.trim();
  const lname    = document.getElementById('p-lname').value.trim();
  const email    = document.getElementById('p-email').value.trim();
  const sid      = document.getElementById('p-sid').value.trim();
  const dept     = document.getElementById('p-dept').value.trim();
  const year     = document.getElementById('p-year').value;
  const semester = document.getElementById('p-semester').value;
  const newPass  = document.getElementById('p-new-pass').value;
  const curPass  = document.getElementById('p-cur-pass').value;
  const notificationPrefs = {
    dueWithin24Hours: document.getElementById('pref-24h')?.checked ?? true,
    dueWithin3Days: document.getElementById('pref-3days')?.checked ?? true,
    dueWithin7Days: document.getElementById('pref-7days')?.checked ?? true,
    emailCriticalOnly: document.getElementById('pref-email-critical')?.checked ?? false
  };

  if (!fname || !email) { showToast('Name and email are required.', 'error'); return; }

  const db  = getDB();
  const idx = db.users.findIndex(u => u.email === db.currentUser);
  if (idx === -1) return;

  if (newPass) {
    if (!curPass) { showToast('Enter your current password to change it.', 'error'); return; }
    if (db.users[idx].password !== curPass) { showToast('Current password is incorrect.', 'error'); return; }
    if (newPass.length < 8 || newPass.length > 32) { showToast('New password must be 8 to 32 characters.', 'error'); return; }
    db.users[idx].password = newPass;
  }

  db.users[idx] = { ...db.users[idx], fname, lname, email, sid, department: dept, year, semester, notificationPrefs };
  db.currentUser = email;
  saveDB(db);
  populateUI(db.users[idx]);
  cancelProfileEdit();
  showToast('Profile saved!', 'success');
}

function shortWeekday(date) {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ============ DATE UTILITIES ============
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function daysDiff(from, to) {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to   + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function formatDate(str) {
  if (!str) return '—';
  const [y,m,d] = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
}

function getDueBadgeClass(dueDate, status = 'pending') {
  if (status === 'completed') return 'normal';
  const today = todayStr();
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  if (daysDiff(today, dueDate) <= 3) return 'soon';
  return 'normal';
}

function getDueLabel(dueDate, status = 'pending') {
  if (status === 'completed') return '✓ Done';
  const today = todayStr();
  if (dueDate < today) return `${Math.abs(daysDiff(dueDate, today))}d overdue`;
  if (dueDate === today) return 'Due today';
  const d = daysDiff(today, dueDate);
  if (d === 1) return 'Tomorrow';
  if (d <= 7) return `${d}d left`;
  return formatDate(dueDate);
}

// ============ GENERAL UTILITIES ============
function showError(el, msg) {
  el.innerHTML = msg;
  el.classList.remove('hidden');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast${type ? ' ' + type : ''}`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

// Modal overlay clicks to close
document.getElementById('task-modal').addEventListener('click',   function(e) { if (e.target === this) closeTaskModal(); });
document.getElementById('course-modal').addEventListener('click', function(e) { if (e.target === this) closeCourseModal(); });
document.getElementById('delete-modal').addEventListener('click', function(e) { if (e.target === this) closeDeleteModal(); });

// ESC key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeTaskModal(); closeCourseModal(); closeDeleteModal(); }
});