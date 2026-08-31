// ============================================
// TaskFlow – Personal Task Dashboard
// Vanilla JS + LocalStorage
// ============================================

// ----- State -----
let tasks = JSON.parse(localStorage.getItem('taskflow-tasks')) || [];
let currentFilter = 'all';
let currentPriorityFilter = 'all';
let editingId = null;

// ----- DOM Elements -----
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search');
const priorityFilter = document.getElementById('priority-filter');
const themeToggle = document.getElementById('theme-toggle');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const cancelEditBtn = document.getElementById('cancel-edit');

// ----- Helpers -----
function saveTasks() {
  localStorage.setItem('taskflow-tasks', JSON.stringify(tasks));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return due < today;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString(undefined, options);
}

// ----- Stats -----
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById('total-count').textContent = total;
  document.getElementById('active-count').textContent = active;
  document.getElementById('completed-count').textContent = completed;
  document.getElementById('progress-fill').style.width = percent + '%';
  document.getElementById('progress-text').textContent = percent + '% complete';
}

// ----- Render -----
function renderTasks() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  let filtered = tasks.filter(task => {
    // Status filter
    const matchStatus =
      currentFilter === 'all' ||
      (currentFilter === 'active' && !task.completed) ||
      (currentFilter === 'completed' && task.completed);

    // Priority filter
    const matchPriority =
      currentPriorityFilter === 'all' || task.priority === currentPriorityFilter;

    // Search
    const matchSearch =
      !searchTerm ||
      task.title.toLowerCase().includes(searchTerm) ||
      (task.category && task.category.toLowerCase().includes(searchTerm));

    return matchStatus && matchPriority && matchSearch;
  });

  // Sort: incomplete first, then by priority (high > medium > low), then by due date
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
    if (a.due && b.due) return new Date(a.due) - new Date(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });

  // Empty state
  if (filtered.length === 0) {
    taskList.innerHTML = '';
    emptyState.classList.remove('hidden');
    if (tasks.length > 0) {
      emptyState.querySelector('h3').textContent = 'No matching tasks';
      emptyState.querySelector('p').textContent = 'Try changing filters or search term.';
    } else {
      emptyState.querySelector('h3').textContent = 'No tasks yet';
      emptyState.querySelector('p').textContent = 'Add your first task above to get started!';
    }
  } else {
    emptyState.classList.add('hidden');
    taskList.innerHTML = filtered.map(task => {
      const overdueClass = isOverdue(task.due) && !task.completed ? 'overdue' : '';
      return `
        <li class="task-item ${task.completed ? 'completed' : ''} ${overdueClass}" data-id="${task.id}">
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark complete">
          <div class="task-content">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-meta">
              <span class="priority-badge ${task.priority}">${task.priority}</span>
              ${task.category ? `<span class="category-tag">${escapeHtml(task.category)}</span>` : ''}
              ${task.due ? `<span class="due-date">📅 ${formatDate(task.due)}</span>` : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="edit-btn" title="Edit task" aria-label="Edit">✏️</button>
            <button class="delete-btn" title="Delete task" aria-label="Delete">🗑️</button>
          </div>
        </li>
      `;
    }).join('');
  }

  updateStats();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ----- Add Task -----
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('task-title').value.trim();
  if (!title) return;

  const newTask = {
    id: generateId(),
    title,
    priority: document.getElementById('task-priority').value,
    category: document.getElementById('task-category').value.trim(),
    due: document.getElementById('task-due').value,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  saveTasks();
  renderTasks();
  taskForm.reset();
  document.getElementById('task-title').focus();
});

// ----- Task List Interactions (event delegation) -----
taskList.addEventListener('click', (e) => {
  const item = e.target.closest('.task-item');
  if (!item) return;

  const id = item.dataset.id;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  // Toggle complete
  if (e.target.classList.contains('task-checkbox')) {
    task.completed = e.target.checked;
    saveTasks();
    renderTasks();
    return;
  }

  // Delete
  if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
    if (confirm(`Delete "${task.title}"?`)) {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderTasks();
    }
    return;
  }

  // Edit
  if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
    openEditModal(task);
  }
});

// ----- Edit Modal -----
function openEditModal(task) {
  editingId = task.id;
  document.getElementById('edit-title').value = task.title;
  document.getElementById('edit-priority').value = task.priority;
  document.getElementById('edit-category').value = task.category || '';
  document.getElementById('edit-due').value = task.due || '';
  editModal.classList.remove('hidden');
  document.getElementById('edit-title').focus();
}

function closeEditModal() {
  editModal.classList.add('hidden');
  editingId = null;
}

editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!editingId) return;

  const task = tasks.find(t => t.id === editingId);
  if (!task) return;

  task.title = document.getElementById('edit-title').value.trim();
  task.priority = document.getElementById('edit-priority').value;
  task.category = document.getElementById('edit-category').value.trim();
  task.due = document.getElementById('edit-due').value;

  saveTasks();
  renderTasks();
  closeEditModal();
});

cancelEditBtn.addEventListener('click', closeEditModal);

// Close modal on backdrop click
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
    closeEditModal();
  }
});

// ----- Filters -----
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.filter-btn.active').classList.remove('active');
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

priorityFilter.addEventListener('change', () => {
  currentPriorityFilter = priorityFilter.value;
  renderTasks();
});

searchInput.addEventListener('input', renderTasks);

// ----- Theme -----
function initTheme() {
  const saved = localStorage.getItem('taskflow-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('taskflow-theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// ----- Init -----
initTheme();
renderTasks();
