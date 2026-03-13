import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './TeacherPortal.css';
import { BookOpen, Users, BarChart3, Settings, Bell, Search, Upload, Trash2, FileText, LogOut, Menu, X, FileQuestion, Plus, Clock, Play } from 'lucide-react';
import CreateAssessment from '../components/CreateAssessment';

const TeacherPortal = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [assessments, setAssessments] = useState([]);
    const [loadingAssessments, setLoadingAssessments] = useState(false);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
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
        fetchAssessments();
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            const res = await fetch('/api/teacher/students', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setStudents(data);
        } catch (err) {
            console.error('Failed to load students');
        } finally {
            setLoadingStudents(false);
        }
    };

    const fetchAssessments = async () => {
        setLoadingAssessments(true);
        try {
            const res = await fetch('/api/assessments/teacher', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setAssessments(data);
        } catch (err) {
            console.error('Failed to load assessments');
        } finally {
            setLoadingAssessments(false);
        }
    };

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

    const handleSaveAssessment = async (assessmentData) => {
        try {
            const res = await fetch('/api/assessments', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(assessmentData)
            });
            if (!res.ok) throw new Error('Failed to save assessment');
            setSuccess('Assessment created successfully!');
            setShowCreateModal(false);
            fetchAssessments();
        } catch (err) {
            setError(err.message);
        }
    };

    const handlePublish = async (id) => {
        try {
            const res = await fetch(`/api/assessments/publish/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to publish');
            setSuccess('Assessment published!');
            fetchAssessments();
        } catch (err) {
            setError(err.message);
        }
    };

    const handlePublishResults = async (id) => {
        try {
            const res = await fetch(`/api/assessments/publish-results/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to publish results');
            setSuccess('Results published to students!');
            fetchAssessments();
        } catch (err) {
            setError(err.message);
        }
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
                        onClick={() => { setActiveTab('classes'); setMobileMenuOpen(false); }}
                        className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`}
                    >
                        <Users size={20} />
                        <span>My Classes</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
                        className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                    >
                        <BarChart3 size={20} />
                        <span>Analytics</span>
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
                    <div className="mobile-logo-text">
                        CIA <span>Portal</span>
                    </div>
                    <div className="search-bar">
                        <Search size={20} className="search-icon" />
                        <input type="text" placeholder="Search students, assignments..." />
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
                                <div>
                                    <h1>Assessments</h1>
                                    <p>Create and manage your exams and assignments.</p>
                                </div>
                                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                    <Plus size={18} /> Create New
                                </button>
                            </div>

                            {error && <div className="alert alert-error">{error}</div>}
                            {success && <div className="alert alert-success">{success}</div>}

                            {loadingAssessments ? (
                                <div className="loading-state">Loading assessments...</div>
                            ) : assessments.length === 0 ? (
                                <div className="empty-state">
                                    <FileQuestion size={48} />
                                    <p>No assessments created yet. Start by creating your first one!</p>
                                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                        Create Assessment
                                    </button>
                                </div>
                            ) : (
                                <div className="assessments-grid">
                                    {assessments.map((asmt) => (
                                        <div key={asmt._id} className="assessment-card">
                                            <div className="asmt-header">
                                                <span className={`asmt-status ${asmt.status}`}>{asmt.status}</span>
                                                <span className="asmt-date">{new Date(asmt.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <h3>{asmt.title}</h3>
                                            <p>{asmt.description || 'No description provided.'}</p>
                                            <div className="asmt-stats">
                                                <div className="asmt-stat">
                                                    <FileQuestion size={16} />
                                                    <span>{asmt.questions.length} Questions</span>
                                                </div>
                                                <div className="asmt-stat">
                                                    <Clock size={16} />
                                                    <span>{asmt.duration} Mins</span>
                                                </div>
                                            </div>
                                            <div className="asmt-footer">
                                                <span className="asmt-marks">{asmt.totalMarks} Marks</span>
                                                <div className="asmt-actions">
                                                    {asmt.status === 'draft' && (
                                                        <button className="btn-small btn-publish" onClick={() => handlePublish(asmt._id)}>
                                                            Publish
                                                        </button>
                                                    )}
                                                    {asmt.status === 'published' && (
                                                        <button className="btn-small btn-publish" onClick={() => handlePublishResults(asmt._id)}>
                                                            Publish Results
                                                        </button>
                                                    )}
                                                    <button className="btn-small btn-view">View Results</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showCreateModal && (
                                <CreateAssessment 
                                    onSave={handleSaveAssessment} 
                                    onCancel={() => setShowCreateModal(false)} 
                                />
                            )}
                        </div>
                    ) : activeTab === 'dashboard' ? (
                        <>
                            {/* ... existing dashboard content ... */}
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
                                    <h3>Active Assessments</h3>
                                    <div className="stat-value">{assessments.filter(a => a.status === 'published').length}</div>
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
                        </>
                     ) : activeTab === 'classes' ? (
                        <div className="classes-section">
                            <div className="section-header">
                                <div>
                                    <h1>My Classes</h1>
                                    <p>View and manage students in your assigned groups.</p>
                                </div>
                            </div>

                            {loadingStudents ? (
                                <div className="loading-state">Loading students...</div>
                            ) : students.length === 0 ? (
                                <div className="empty-state">
                                    <Users size={48} />
                                    <p>No students found in the database.</p>
                                </div>
                            ) : (
                                <div className="students-table-container">
                                    <table className="portal-table">
                                        <thead>
                                            <tr>
                                                <th>Reg No</th>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Overall Attendance</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map(student => {
                                                const att = student.academicData ? Math.round((
                                                    student.academicData.python.attendance + 
                                                    student.academicData.dataStructures.attendance + 
                                                    student.academicData.dbms.attendance +
                                                    student.academicData.webDev.attendance +
                                                    student.academicData.networks.attendance
                                                ) / 5) : 0;
                                                return (
                                                    <tr key={student._id}>
                                                        <td className="reg-no">{student.regNumber || 'N/A'}</td>
                                                        <td className="student-name">
                                                            <div className="name-cell">
                                                                <div className="avatar-small">{student.name.charAt(0)}</div>
                                                                {student.name}
                                                            </div>
                                                        </td>
                                                        <td>{student.email}</td>
                                                        <td>
                                                            <div className="attendance-bar-container">
                                                                <div className="attendance-bar-bg">
                                                                    <div className="attendance-bar" style={{ width: `${att}%`, backgroundColor: att > 75 ? '#22c55e' : att > 50 ? '#eab308' : '#ef4444' }}></div>
                                                                </div>
                                                                <span>{att}%</span>
                                                            </div>
                                                        </td>
                                                        <td><span className={`status-pill ${student.status}`}>{student.status}</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'analytics' ? (
                        <div className="analytics-section">
                            <div className="section-header">
                                <div>
                                    <h1>Academic Analytics</h1>
                                    <p>Performance overview of all students across subjects.</p>
                                </div>
                            </div>

                            <div className="analytics-grid">
                                {['python', 'dataStructures', 'dbms', 'webDev', 'networks'].map(subject => {
                                    const avgMarks = students.length > 0 ? Math.round(students.reduce((acc, s) => acc + (s.academicData?.[subject]?.marks || 0), 0) / students.length) : 0;
                                    const avgAtt = students.length > 0 ? Math.round(students.reduce((acc, s) => acc + (s.academicData?.[subject]?.attendance || 0), 0) / students.length) : 0;
                                    const subjectLabel = subject.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                    
                                    return (
                                        <div key={subject} className="analytics-card">
                                            <h3>{subjectLabel}</h3>
                                            <div className="analytics-stats">
                                                <div className="anal-stat">
                                                    <span className="label">Avg Marks</span>
                                                    <div className="bar-bg"><div className="bar-fill" style={{ width: `${avgMarks}%` }}></div></div>
                                                    <span className="value">{avgMarks}/100</span>
                                                </div>
                                                <div className="anal-stat">
                                                    <span className="label">Avg Attendance</span>
                                                    <div className="bar-bg"><div className="bar-fill att" style={{ width: `${avgAtt}%` }}></div></div>
                                                    <span className="value">{avgAtt}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="performance-summary">
                                <h2>Class Overview</h2>
                                <div className="summary-cards">
                                    <div className="sum-card">
                                        <div className="val">{students.length}</div>
                                        <label>Total Students</label>
                                    </div>
                                    <div className="sum-card">
                                        <div className="val">{students.filter(s => {
                                            const avg = s.academicData ? (s.academicData.python.marks + s.academicData.dataStructures.marks + s.academicData.dbms.marks + s.academicData.webDev.marks + s.academicData.networks.marks) / 5 : 0;
                                            return avg > 75;
                                        }).length}</div>
                                        <label>Above 75% Marks</label>
                                    </div>
                                    <div className="sum-card">
                                        <div className="val">{Math.round(students.reduce((acc, s) => {
                                             const att = s.academicData ? (s.academicData.python.attendance + s.academicData.dataStructures.attendance + s.academicData.dbms.attendance + s.academicData.webDev.attendance + s.academicData.networks.attendance) / 5 : 0;
                                             return acc + att;
                                        }, 0) / (students.length || 1))}%</div>
                                        <label>Class Attendance Avg</label>
                                    </div>
                                </div>
                            </div>
                        </div>
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

export default TeacherPortal;
