import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudentPortal.css';
import { BookOpen, GraduationCap, Settings, Bell, Search, Download, FileText, LogOut, Menu, X, FileQuestion, Clock, Play, AlertCircle, Sun, Moon, User, Lock, CheckCircle } from 'lucide-react';
import TakeAssessment from '../components/TakeAssessment';

const StudentPortal = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [assessments, setAssessments] = useState([]);
    const [takingExam, setTakingExam] = useState(null);
    const [loadingAsmt, setLoadingAsmt] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [settingsMsg, setSettingsMsg] = useState({ type: '', text: '' });
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [theme, setTheme] = useState('dark');
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (!token || user.role !== 'student') {
            navigate('/login?role=student');
            return;
        }
        fetchFiles();
        fetchAssessments();
        fetchNotifications();
        // Apply stored theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        document.body.setAttribute('data-theme', savedTheme);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/user/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setNotifications(data);
        } catch (err) {
            console.error('Failed to fetch notifications');
        }
    };

    const markAllRead = async () => {
        const unread = notifications.filter(n => !n.isRead);
        await Promise.all(unread.map(n =>
            fetch(`/api/user/notifications/${n._id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ));
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    };

    const fetchAssessments = async () => {
        setLoadingAsmt(true);
        try {
            const res = await fetch('/api/assessments/student', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setAssessments(data);
        } catch (err) {
            console.error('Failed to load assessments');
        } finally {
            setLoadingAsmt(false);
        }
    };

    const fetchFiles = async () => {
        try {
            const res = await fetch('/api/files', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                localStorage.removeItem('token');
                navigate('/login?role=student');
                return;
            }
            const data = await res.json();
            setFiles(data);
        } catch (err) {
            setError('Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (fileId, fileName) => {
        try {
            const res = await fetch(`/api/files/download/${fileId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
        }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

    const handleStartExam = async (id) => {
        try {
            const res = await fetch(`/api/assessments/student/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setTakingExam(data);
                try {
                    if (document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen();
                    }
                } catch (e) {}
            } else {
                alert(data.message || 'Could not start exam');
            }
        } catch (err) {
            alert('Error starting exam');
        }
    };

    const handleSubmitExam = async (submissionData) => {
        try {
            const res = await fetch(`/api/assessments/submit/${takingExam._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(submissionData)
            });
            if (res.ok) {
                alert('Exam submitted successfully!');
                setTakingExam(null);
                fetchAssessments();
                if (document.fullscreenElement) document.exitFullscreen();
            } else {
                const data = await res.json();
                alert(data.message || 'Submission failed');
            }
        } catch (err) {
            alert('Error submitting exam');
        }
    };

    const handleRequestName = async (e) => {
        e.preventDefault();
        setSettingsMsg({ type: '', text: '' });
        try {
            const res = await fetch('/api/user/request-name', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ newName })
            });
            const data = await res.json();
            if (res.ok) {
                setSettingsMsg({ type: 'success', text: 'Name change request submitted! Awaiting admin approval.' });
                setNewName('');
            } else {
                setSettingsMsg({ type: 'error', text: data.message });
            }
        } catch (err) {
            setSettingsMsg({ type: 'error', text: 'Request failed' });
        }
    };

    const handleRequestPassword = async (e) => {
        e.preventDefault();
        setSettingsMsg({ type: '', text: '' });
        try {
            const res = await fetch('/api/user/request-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                setSettingsMsg({ type: 'success', text: 'Password change request submitted! Awaiting admin approval.' });
                setNewPassword('');
            } else {
                setSettingsMsg({ type: 'error', text: data.message });
            }
        } catch (err) {
            setSettingsMsg({ type: 'error', text: 'Request failed' });
        }
    };

    const handleToggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        try {
            await fetch('/api/user/theme', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ theme: newTheme })
            });
        } catch (err) {
            console.error('Failed to save theme preference');
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getNotifIcon = (type) => {
        if (type === 'assessment') return '📝';
        if (type === 'file') return '📁';
        if (type === 'submission') return '✅';
        return '🔔';
    };

    return (
        <div className="portal-layout">
            {mobileMenuOpen && (
                <div className="mobile-overlay" onClick={toggleMobileMenu}></div>
            )}

            <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>CIA <span>Portal</span></h2>
                    <button className="close-menu-btn" onClick={toggleMobileMenu}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <button onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
                        <BookOpen size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button onClick={() => { setActiveTab('courses'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`}>
                        <GraduationCap size={20} />
                        <span>My Courses</span>
                    </button>
                    <button onClick={() => { setActiveTab('assessments'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'assessments' ? 'active' : ''}`}>
                        <FileQuestion size={20} />
                        <span>Assessments</span>
                    </button>
                    <button onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}>
                        <Settings size={20} />
                        <span>Settings</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="avatar student-avatar">{user.name ? user.name.charAt(0).toUpperCase() : 'S'}</div>
                        <div className="details">
                            <span className="name">{user.name || 'Student'}</span>
                            <span className="role">Student</span>
                        </div>
                    </div>
                    <button className="logout-sidebar-btn" onClick={handleLogout}>
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            <main className="portal-main">
                <header className="portal-header">
                    <div className="mobile-logo-text">CIA <span>Portal</span></div>
                    <div className="search-bar">
                        <Search size={20} className="search-icon" />
                        <input type="text" placeholder="Search courses, files..." />
                    </div>
                    <div className="header-actions">
                        <div style={{ position: 'relative' }}>
                            <button
                                className="icon-btn"
                                onClick={() => { setShowNotifPanel(!showNotifPanel); if (!showNotifPanel) markAllRead(); fetchNotifications(); }}
                                id="notif-bell-btn"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>

                            {showNotifPanel && (
                                <div className="notif-panel" id="notif-panel">
                                    <div className="notif-panel-header">
                                        <span>Notifications</span>
                                        <button onClick={() => setShowNotifPanel(false)}><X size={16} /></button>
                                    </div>
                                    <div className="notif-list">
                                        {notifications.length === 0 ? (
                                            <div className="notif-empty">No notifications yet</div>
                                        ) : notifications.map(n => (
                                            <div key={n._id} className={`notif-item ${n.isRead ? 'read' : 'unread'}`}>
                                                <span className="notif-icon">{getNotifIcon(n.type)}</span>
                                                <div className="notif-body">
                                                    <p className="notif-title">{n.title}</p>
                                                    <p className="notif-msg">{n.message}</p>
                                                    <span className="notif-time">{new Date(n.createdAt).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                <div className="dashboard-content">
                    {activeTab === 'assessments' ? (
                        <div className="assessments-section">
                            <div className="section-header">
                                <h1>Assessments</h1>
                                <p>View and take exams assigned to you.</p>
                            </div>

                            {loadingAsmt ? (
                                <div className="loading-state">Loading assessments...</div>
                            ) : assessments.length === 0 ? (
                                <div className="empty-state">
                                    <FileQuestion size={48} />
                                    <p>No active assessments at the moment.</p>
                                </div>
                            ) : (
                                <div className="assessments-grid">
                                    {assessments.map((asmt) => (
                                        <div key={asmt._id} className="assessment-card">
                                            <div className="asmt-header">
                                                <span className={`asmt-status active`}>Active</span>
                                                <span className="asmt-date">{new Date(asmt.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <h3>{asmt.title}</h3>
                                            <p>{asmt.description || 'No description.'}</p>
                                            <div className="asmt-stats">
                                                <div className="asmt-stat">
                                                    <Clock size={16} />
                                                    <span>{asmt.duration} Mins</span>
                                                </div>
                                                <div className="asmt-stat">
                                                    <span>{asmt.totalMarks} Marks</span>
                                                </div>
                                            </div>
                                            <div className="asmt-footer">
                                                <button className="btn-start" onClick={() => handleStartExam(asmt._id)}>
                                                    <Play size={16} /> Start Exam
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {takingExam && (
                                <TakeAssessment
                                    assessment={takingExam}
                                    onComplete={handleSubmitExam}
                                    onCancel={() => setTakingExam(null)}
                                />
                            )}
                        </div>
                    ) : activeTab === 'settings' ? (
                        <div className="settings-section">
                            <div className="section-header">
                                <div>
                                    <h1>Settings</h1>
                                    <p>Manage your profile and preferences.</p>
                                </div>
                            </div>

                            {settingsMsg.text && (
                                <div className={`alert ${settingsMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                                    {settingsMsg.text}
                                </div>
                            )}

                            <div className="settings-grid">
                                {/* Theme */}
                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <div className="settings-icon-wrap">
                                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                                        </div>
                                        <div>
                                            <h3>Interface Theme</h3>
                                            <p>Switch between dark and light mode</p>
                                        </div>
                                    </div>
                                    <div className="theme-toggle-row">
                                        <span>{theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                                        <button
                                            className={`toggle-switch ${theme === 'dark' ? 'on' : 'off'}`}
                                            onClick={handleToggleTheme}
                                            id="theme-toggle-btn"
                                        >
                                            <span className="toggle-thumb"></span>
                                        </button>
                                    </div>
                                </div>

                                {/* Name Change Request */}
                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <div className="settings-icon-wrap">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h3>Change Display Name</h3>
                                            <p>Request a name change (requires admin approval)</p>
                                        </div>
                                    </div>
                                    <form onSubmit={handleRequestName} className="settings-form">
                                        <input
                                            type="text"
                                            placeholder="Enter new name"
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            required
                                            id="new-name-input"
                                        />
                                        <button type="submit" className="btn btn-primary" id="request-name-btn">
                                            <CheckCircle size={16} /> Submit Request
                                        </button>
                                    </form>
                                </div>

                                {/* Password Change Request */}
                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <div className="settings-icon-wrap">
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <h3>Change Password</h3>
                                            <p>Request a password change (requires admin approval)</p>
                                        </div>
                                    </div>
                                    <form onSubmit={handleRequestPassword} className="settings-form">
                                        <input
                                            type="password"
                                            placeholder="Enter new password (min 4 chars)"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            required
                                            minLength={4}
                                            id="new-password-input"
                                        />
                                        <button type="submit" className="btn btn-primary" id="request-password-btn">
                                            <CheckCircle size={16} /> Submit Request
                                        </button>
                                    </form>
                                </div>

                                {/* Account Info */}
                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <div className="settings-icon-wrap info">
                                            <AlertCircle size={20} />
                                        </div>
                                        <div>
                                            <h3>Account Information</h3>
                                            <p>Your current profile details</p>
                                        </div>
                                    </div>
                                    <div className="account-info-rows">
                                        <div className="info-row">
                                            <span className="info-label">Name</span>
                                            <span className="info-value">{user.name || 'N/A'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Email</span>
                                            <span className="info-value">{user.email || 'N/A'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Role</span>
                                            <span className="info-value" style={{ textTransform: 'capitalize' }}>{user.role || 'Student'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'dashboard' ? (
                        <>
                            <div className="dashboard-header">
                                <h1>Welcome back, {user.name || 'Student'}!</h1>
                                <p>Browse and download files shared by your teachers.</p>
                            </div>

                            {error && <div className="alert alert-error">{error}</div>}

                            {/* Stats */}
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h3>Upcoming Exams</h3>
                                    <div className="stat-value">{assessments.length}</div>
                                    <span className="stat-trend neutral">Don't forget to study!</span>
                                </div>
                                <div className="stat-card">
                                    <h3>Available Files</h3>
                                    <div className="stat-value">{files.length}</div>
                                    <span className="stat-trend neutral">From your teachers</span>
                                </div>
                                {user.academicData && (
                                    <div className="stat-card">
                                        <h3>Attendance Avg</h3>
                                        <div className="stat-value">
                                            {Math.round((
                                                user.academicData.python.attendance +
                                                user.academicData.dataStructures.attendance +
                                                user.academicData.dbms.attendance +
                                                user.academicData.webDev.attendance +
                                                user.academicData.networks.attendance
                                            ) / 5)}%
                                        </div>
                                        <span className="stat-trend high">On track</span>
                                    </div>
                                )}
                            </div>

                            {/* Files list */}
                            <div className="activity-section">
                                <h2>Shared Files</h2>
                                <div className="activity-card">
                                    {loading ? (
                                        <div className="empty-state"><p>Loading files...</p></div>
                                    ) : files.length === 0 ? (
                                        <div className="empty-state"><p>No files shared by teachers yet.</p></div>
                                    ) : (
                                        <div className="files-list">
                                            {files.map((file) => (
                                                <div key={file._id} className="file-item">
                                                    <div className="file-icon">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="file-info">
                                                        <span className="file-name">{file.originalName}</span>
                                                        <span className="file-meta">
                                                            {formatSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                                                            {file.uploadedBy && ` • by ${file.uploadedBy.name}`}
                                                        </span>
                                                    </div>
                                                    <button
                                                        className="download-btn"
                                                        onClick={() => handleDownload(file._id, file.originalName)}
                                                        title="Download file"
                                                    >
                                                        <Download size={16} />
                                                        <span>Download</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state" style={{ padding: '60px', opacity: 0.6 }}>
                            <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h2>
                            <p>This section is currently under development. Please check back later.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentPortal;
