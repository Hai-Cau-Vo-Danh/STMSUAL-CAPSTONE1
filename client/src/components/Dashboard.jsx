import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { BsCheckCircleFill, BsCircle, BsFire, BsTrophy, BsClock, BsCalendar3, BsPlus, BsTrash } from 'react-icons/bs';
import { IoTrendingUp, IoFlash, IoClose } from 'react-icons/io5';

// --- (CODE MỚI) IMPORT ---
import { useTranslation } from 'react-i18next';
// --- KẾT THÚC CODE MỚI ---

const Dashboard = () => {
  // --- (CODE MỚI) GỌI HOOK ---
  const { t, i18n } = useTranslation(); // Thêm i18n để lấy ngôn ngữ
  // --- KẾT THÚC CODE MỚI ---

  const [currentTime, setCurrentTime] = useState(new Date());
  const [username, setUsername] = useState("User"); // Đổi tên mặc định

  useEffect(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const userData = JSON.parse(userString);
        setUsername(userData.username);
      }
    } catch (e) {
      console.error("Lỗi khi đọc user từ localStorage:", e);
    }
  }, []);

  // Tasks state management (Dữ liệu mẫu)
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Hoàn thành bài tập React', deadline: '2 giờ', priority: 'high', completed: false },
    { id: 2, title: 'Đọc tài liệu NodeJS', deadline: 'Hôm nay', priority: 'medium', completed: false },
    { id: 3, title: 'Review code dự án', deadline: 'Mai', priority: 'low', completed: true }, // 1 completed
  ]);

  // Modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    deadline: '',
    priority: 'medium'
  });

  // Mock data - Dữ liệu demo
  const stats = {
    tasksCompleted: tasks.filter(t => t.completed).length,
    totalTasks: tasks.length,
    studyStreak: 7,
    pomodoroSessions: 8,
    weeklyGoal: 40,
    currentWeek: 28
  };

  const upcomingTasks = tasks.filter(t => !t.completed);

  // Mock hoạt động
  const recentActivities = [
    { id: 1, text: 'Hoàn thành 4 Pomodoro sessions', time: '10 phút trước', icon: '✅' },
    { id: 2, text: 'Tham gia Study Room "Web Dev"', time: '1 giờ trước', icon: '📚' },
    { id: 3, text: 'Đạt mốc 7 ngày học liên tục', time: '2 giờ trước', icon: '🔥' },
  ];

  // (Đã xóa mảng quote cố định, giờ dùng t())

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.tasksCompleted / stats.totalTasks) * 100) : 0;
  const weeklyProgress = Math.round((stats.currentWeek / stats.weeklyGoal) * 100);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  // Task handlers (Giữ nguyên)
  const handleToggleTask = (taskId) => { setTasks(tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task)); };
  const handleDeleteTask = (taskId) => { setTasks(tasks.filter(task => task.id !== taskId)); };
  const handleCreateTask = () => { /* ... (Logic tạo task mẫu) ... */ 
      if (newTask.title.trim() && newTask.deadline.trim()) {
      const task = {
        id: Date.now(),
        title: newTask.title,
        deadline: newTask.deadline,
        priority: newTask.priority,
        completed: false
      };
      setTasks([task, ...tasks]); // Thêm vào đầu danh sách
      setNewTask({ title: '', deadline: '', priority: 'medium' });
      setShowTaskModal(false);
    }
  };
  const handleOpenTaskModal = () => { setShowTaskModal(true); };
  const handleCloseTaskModal = () => { 
    setShowTaskModal(false); 
    setNewTask({ title: '', deadline: '', priority: 'medium' }); // Reset form
  };

  return (
    <div className="dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="welcome-section">
          {/* --- (ĐÃ SỬA) DÙNG t() --- */}
          {/* Truyền biến username vào key 'dashboard.welcome' */}
          <h1 className="welcome-title">{t('dashboard.welcome', { username: username })}</h1>
          <p className="welcome-subtitle">{t('dashboard.quote')}</p>
        </div>
        <div className="date-info">
          <BsCalendar3 className="calendar-icon" />
          {/* --- (ĐÃ SỬA) DÙNG i18n.language --- */}
          <span>{currentTime.toLocaleDateString(i18n.language, { // Dùng ngôn ngữ hiện tại
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {/* Tasks Completion */}
        <div className="stat-card tasks-card">
          <div className="stat-header">
            <div className="stat-icon tasks-icon"><BsCheckCircleFill /></div>
            <span className="stat-label">{t('dashboard.statToday')}</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{t('dashboard.tasksCompleted', { completed: stats.tasksCompleted, total: stats.totalTasks })}</div>
            <div className="progress-bar">
              <div className="progress-fill tasks-progress" style={{ width: `${completionRate}%` }}></div>
            </div>
            <span className="stat-subtitle">{t('dashboard.percentComplete', { rate: completionRate })}</span>
          </div>
        </div>

        {/* Study Streak */}
        <div className="stat-card streak-card">
          <div className="stat-header">
            <div className="stat-icon streak-icon"><BsFire /></div>
            <span className="stat-label">{t('dashboard.statStreak')}</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{t('dashboard.streakDays', { count: stats.studyStreak })}</div>
            <div className="streak-indicator">
              {[...Array(7)].map((_, i) => (<div key={i} className={`streak-day ${i < stats.studyStreak ? 'active' : ''}`} />))}
            </div>
            <span className="stat-subtitle">{t('dashboard.streakSubtitle')}</span>
          </div>
        </div>

        {/* Pomodoro Sessions */}
        <div className="stat-card pomodoro-card">
          <div className="stat-header">
            <div className="stat-icon pomodoro-icon"><BsClock /></div>
            <span className="stat-label">{t('dashboard.statPomodoro')}</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{t('dashboard.pomoSessions', { count: stats.pomodoroSessions })}</div>
            <div className="pomodoro-time">
              <IoFlash className="flash-icon" />
              <span>{t('dashboard.pomoMinutes', { minutes: stats.pomodoroSessions * 25 })}</span>
            </div>
            <span className="stat-subtitle">{t('dashboard.pomoTomatoes', { count: stats.pomodoroSessions * 2 })}</span>
          </div>
        </div>

        {/* Weekly Goal */}
        <div className="stat-card goal-card">
          <div className="stat-header">
            <div className="stat-icon goal-icon"><BsTrophy /></div>
            <span className="stat-label">{t('dashboard.statGoal')}</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{t('dashboard.goalHours', { current: stats.currentWeek, goal: stats.weeklyGoal })}</div>
            <div className="progress-bar">
              <div className="progress-fill goal-progress" style={{ width: `${weeklyProgress}%` }}></div>
            </div>
            <span className="stat-subtitle">{t('dashboard.goalPercent', { rate: weeklyProgress })}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Upcoming Tasks */}
        <div className="content-card tasks-list-card">
          <div className="card-header">
            <h3 className="card-title"><IoTrendingUp className="title-icon" /> {t('dashboard.upcomingTasks')}</h3>
            <button className="view-all-btn">{t('dashboard.viewAll')}</button>
          </div>
          <div className="tasks-list">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className="task-checkbox" onClick={() => handleToggleTask(task.id)}>
                    {task.completed ? <BsCheckCircleFill className="checkbox-checked" /> : <BsCircle className="checkbox-unchecked" />}
                  </div>
                  <div className="task-info">
                    <p className="task-title">{task.title}</p>
                    <div className="task-meta">
                      <span className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}>
                        {/* Dùng t() để dịch High/Medium/Low */}
                        {t(`dashboard.modalPriority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`, task.priority)}
                      </span>
                      <span className="task-deadline"><BsClock /> {task.deadline}</span>
                    </div>
                  </div>
                  <button className="delete-task-btn" onClick={() => handleDeleteTask(task.id)}><BsTrash /></button>
                </div>
              ))
            ) : (
              <div className="empty-tasks"><p>{t('dashboard.noTasks')}</p></div>
            )}
          </div>
          <button className="add-task-btn" onClick={handleOpenTaskModal}>
            <BsPlus className="plus-icon" /> {t('dashboard.addTask')}
          </button>
        </div>

        {/* Recent Activities */}
        <div className="content-card activities-card">
          <div className="card-header">
            <h3 className="card-title"><IoFlash className="title-icon" /> {t('dashboard.recentActivity')}</h3>
          </div>
          <div className="activities-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">{activity.icon}</div>
                <div className="activity-info">
                  {/* (Dữ liệu hoạt động mẫu chưa được dịch, bạn có thể dịch nếu muốn) */}
                  <p className="activity-text">{activity.text}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3 className="section-title">{t('dashboard.quickActions')}</h3>
        <div className="actions-grid">
          <button className="action-btn pomodoro-action"><BsClock className="action-icon" /> <span>{t('dashboard.actionPomo')}</span></button>
          <button className="action-btn task-action" onClick={handleOpenTaskModal}><BsCheckCircleFill className="action-icon" /> <span>{t('dashboard.actionTask')}</span></button>
          <button className="action-btn study-action"><BsFire className="action-icon" /> <span>{t('dashboard.actionRoom')}</span></button>
          <button className="action-btn ai-action"><IoFlash className="action-icon" /> <span>{t('dashboard.actionAI')}</span></button>
        </div>
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={handleCloseTaskModal}>
          <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('dashboard.modalCreateTitle')}</h3>
              <button className="close-modal-btn" onClick={handleCloseTaskModal}><IoClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="task-title">{t('dashboard.modalTaskName')}</label>
                <input id="task-title" type="text" className="form-input" placeholder={t('dashboard.modalTaskNamePlaceholder')} value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} autoFocus />
              </div>
              <div className="form-group">
                <label htmlFor="task-deadline">{t('dashboard.modalDeadline')}</label>
                <input id="task-deadline" type="text" className="form-input" placeholder={t('dashboard.modalDeadlinePlaceholder')} value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="task-priority">{t('dashboard.modalPriority')}</label>
                <div className="priority-options">
                  <button className={`priority-btn ${newTask.priority === 'high' ? 'active' : ''}`} style={{ borderColor: '#ef4444', color: newTask.priority === 'high' ? '#fff' : '#ef4444', backgroundColor: newTask.priority === 'high' ? '#ef4444' : 'transparent' }} onClick={() => setNewTask({ ...newTask, priority: 'high' })}>
                    {t('dashboard.modalPriorityHigh')}
                  </button>
                  <button className={`priority-btn ${newTask.priority === 'medium' ? 'active' : ''}`} style={{ borderColor: '#f59e0b', color: newTask.priority === 'medium' ? '#fff' : '#f59e0b', backgroundColor: newTask.priority === 'medium' ? '#f59e0b' : 'transparent' }} onClick={() => setNewTask({ ...newTask, priority: 'medium' })}>
                    {t('dashboard.modalPriorityMedium')}
                  </button>
                  <button className={`priority-btn ${newTask.priority === 'low' ? 'active' : ''}`} style={{ borderColor: '#10b981', color: newTask.priority === 'low' ? '#fff' : '#10b981', backgroundColor: newTask.priority === 'low' ? '#10b981' : 'transparent' }} onClick={() => setNewTask({ ...newTask, priority: 'low' })}>
                    {t('dashboard.modalPriorityLow')}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseTaskModal}>{t('dashboard.modalCancel')}</button>
              <button className="btn-create" onClick={handleCreateTask} disabled={!newTask.title.trim() || !newTask.deadline.trim()}>
                {t('dashboard.modalCreate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;