import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './TeacherPortal.css';
import { BookOpen, Users, BarChart3, Settings, Bell, Search, Upload, Trash2, FileText, LogOut } from 'lucide-react';

const TeacherPortal = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (!token || user.role !== 'teacher') {
            navigate('/login?role=teacher');
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
                navigate('/login?role=teacher');
                return;
            }
            const data = await res.json();
            setFiles(data);
        } catch (err) {
            setError('Failed to load files');
        }
    };

    const handleUpload = async (fileToUpload) => {
        if (!fileToUpload) return;

        // Check 50 MB limit
        if (fileToUpload.size > 50 * 1024 * 1024) {
            setError('File size exceeds 50 MB limit');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        const formData = new FormData();
        formData.append('file', fileToUpload);

        try {
            const res = await fetch('/api/files/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setSuccess(`"${fileToUpload.name}" uploaded successfully!`);
            fetchFiles();
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this file?')) return;
        setError('');
        setSuccess('');

        try {
            const res = await fetch(`/api/files/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message);
            }

            setSuccess('File deleted');
            fetchFiles();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
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

    return (
        <div className="portal-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>CIA <span>Portal</span></h2>
                </div>

                <nav className="sidebar-nav">
                    <a href="#" className="nav-item active">
                        <BookOpen size={20} />
                        <span>Dashboard</span>
                    </a>
                    <a href="#" className="nav-item">
                        <Users size={20} />
                        <span>My Classes</span>
                    </a>
                    <a href="#" className="nav-item">
                        <BarChart3 size={20} />
                        <span>Analytics</span>
                    </a>
                    <a href="#" className="nav-item">
                        <Settings size={20} />
                        <span>Settings</span>
                    </a>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="avatar">{user.name ? user.name.charAt(0).toUpperCase() : 'T'}</div>
                        <div className="details">
                            <span className="name">{user.name || 'Teacher'}</span>
                            <span className="role">Teacher</span>
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
                    <div className="search-bar">
                        <Search size={20} className="search-icon" />
                        <input type="text" placeholder="Search students, assignments..." />
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
                        <h1>Welcome back, {user.name || 'Teacher'}!</h1>
                        <p>Upload files for your students and manage your resources.</p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    {/* Upload area */}
                    <div
                        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={40} />
                        <h3>{uploading ? 'Uploading...' : 'Drop a file here or click to browse'}</h3>
                        <p>Max file size: 50 MB</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileInput}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h3>Files Uploaded</h3>
                            <div className="stat-value">{files.length}</div>
                        </div>
                        <div className="stat-card">
                            <h3>Total Size</h3>
                            <div className="stat-value">{formatSize(files.reduce((a, f) => a + f.size, 0))}</div>
                        </div>
                    </div>

                    {/* Files list */}
                    <div className="activity-section">
                        <h2>Uploaded Files</h2>
                        <div className="activity-card">
                            {files.length === 0 ? (
                                <div className="empty-state">
                                    <p>No files uploaded yet. Upload your first file above!</p>
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
                                                </span>
                                            </div>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDelete(file._id)}
                                                title="Delete file"
                                            >
                                                <Trash2 size={16} />
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

export default TeacherPortal;
