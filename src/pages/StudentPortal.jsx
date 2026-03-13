import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudentPortal.css';
import { BookOpen, Calendar, GraduationCap, Settings, Bell, Search, Download, FileText, LogOut, Menu, X, FileQuestion, Clock, Play, AlertCircle, PlayCircle } from 'lucide-react';
import TakeAssessment from '../components/TakeAssessment';

const StudentPortal = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [assessments, setAssessments] = useState([]);
    const [takingExam, setTakingExam] = useState(null); // Current exam object being taken
    const [loadingAsmt, setLoadingAsmt] = useState(false);
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
    }, []);

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

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
        <div className="portal-layout">
            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div className="mobile-overlay" onClick={toggleMobileMenu}></div>
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>CIA <span>Portal</span></h2>
                    <button className="close-menu-btn" onClick={toggleMobileMenu}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <button
                        onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    >
                        <BookOpen size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('courses'); setMobileMenuOpen(false); }}
                        className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`}
                    >
                        <GraduationCap size={20} />
                        <span>My Courses</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('schedule'); setMobileMenuOpen(false); }}
                        className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
                    >
                        <Calendar size={20} />
                        <span>Schedule</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('assessments'); setMobileMenuOpen(false); }}
                        className={`nav-item ${activeTab === 'assessments' ? 'active' : ''}`}
                    >
                        <FileQuestion size={20} />
                        <span>Assessments</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    >
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

            {/* Main Content */}
            <main className="portal-main">
                <header className="portal-header">
                    <div className="mobile-logo-text">
                        CIA <span>Portal</span>
                    </div>
                    <div className="search-bar">
                        <Search size={20} className="search-icon" />
                        <input type="text" placeholder="Search courses, files..." />
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn">
                            <Bell size={20} />
                            <span className="notification-badge">{files.length}</span>
                        </button>
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
                    ) : activeTab === 'dashboard' ? (
                        <>
                            {/* ... previous content ... */}
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
                            </div>

                            {/* Files list */}
                            <div className="activity-section">
                                <h2>Shared Files</h2>
                                <div className="activity-card">
                                    {loading ? (
                                        <div className="empty-state">
                                            <p>Loading files...</p>
                                        </div>
                                    ) : files.length === 0 ? (
                                        <div className="empty-state">
                                            <p>No files shared by teachers yet.</p>
                                        </div>
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
