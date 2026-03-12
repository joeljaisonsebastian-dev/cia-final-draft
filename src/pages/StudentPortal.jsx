import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudentPortal.css';
import { BookOpen, Calendar, GraduationCap, Settings, Bell, Search, Download, FileText, LogOut, Menu, X } from 'lucide-react';

const StudentPortal = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (!token || user.role !== 'student') {
            navigate('/login?role=student');
            return;
        }
        fetchFiles();
    }, []);

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
                    <a href="#" className="nav-item active">
                        <BookOpen size={20} />
                        <span>Dashboard</span>
                    </a>
                    <a href="#" className="nav-item">
                        <GraduationCap size={20} />
                        <span>My Courses</span>
                    </a>
                    <a href="#" className="nav-item">
                        <Calendar size={20} />
                        <span>Schedule</span>
                    </a>
                    <a href="#" className="nav-item">
                        <Settings size={20} />
                        <span>Settings</span>
                    </a>
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
                    <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
                        <Menu size={24} />
                    </button>
                    <div className="search-bar">
                        <Search size={20} className="search-icon" />
                        <input type="text" placeholder="Search courses, files..." />
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn">
                            <Bell size={20} />
                            <span className="notification-badge">{files.length}</span>
                        </button>
                    </div>
                </header>

                <div className="dashboard-content">
                    <div className="dashboard-header">
                        <h1>Welcome back, {user.name || 'Student'}!</h1>
                        <p>Browse and download files shared by your teachers.</p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h3>Available Files</h3>
                            <div className="stat-value">{files.length}</div>
                            <span className="stat-trend neutral">From your teachers</span>
                        </div>
                        <div className="stat-card">
                            <h3>Total Size</h3>
                            <div className="stat-value">{formatSize(files.reduce((a, f) => a + f.size, 0))}</div>
                            <span className="stat-trend neutral">All shared files</span>
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
                </div>
            </main>
        </div>
    );
};

export default StudentPortal;
