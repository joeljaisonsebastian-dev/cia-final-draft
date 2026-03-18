import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudentPortal.css';
import { BookOpen, GraduationCap, Settings, Bell, Search, Download, FileText, LogOut, Menu, X, FileQuestion, Clock, Play, AlertCircle, Sun, Moon, User, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import TakeAssessment from '../components/TakeAssessment';

const StudentPortal = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [assessments, setAssessments] = useState([]);
    const [pastAssessments, setPastAssessments] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [takingExam, setTakingExam] = useState(null);
    const [loadingAsmt, setLoadingAsmt] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [settingsMsg, setSettingsMsg] = useState({ type: '', text: '' });
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [theme, setTheme] = useState('dark');
    const [notes, setNotes] = useState([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [asmtSubTab, setAsmtSubTab] = useState('active');
    const [viewSubmission, setViewSubmission] = useState(null);
    const [requestModal, setRequestModal] = useState(null); // { assessment, type }
    const [requestReason, setRequestReason] = useState('');
    const [requestMsg, setRequestMsg] = useState('');
    const [requestLoading, setRequestLoading] = useState(false);
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
        fetchPastAssessments();
        fetchMyRequests();
        fetchNotifications();
        fetchNotes();
        // Apply stored theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        document.body.setAttribute('data-theme', savedTheme);
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && takingExam) {
                setTabSwitches(prev => prev + 1);
                // Notify the backend immediately
                fetch(`/api/assessments/tab-switch/${takingExam._id}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(err => console.error('Failed to notify tab switch'));
                
                alert('⚠️ Warning: Tab switching is monitored. This activity has been reported to your teacher.');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [takingExam, token]);

    const fetchNotes = async () => {
        setLoadingNotes(true);
        try {
            const res = await fetch('/api/student/notes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setNotes(data);
        } catch (err) {
            console.error('Failed to load notes');
        } finally {
            setLoadingNotes(false);
        }
    };

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

    const fetchPastAssessments = async () => {
        try {
            const res = await fetch('/api/student/my-assessments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setPastAssessments(data);
        } catch (err) {
            console.error('Failed to load past assessments');
        }
    };

    const fetchMyRequests = async () => {
        try {
            const res = await fetch('/api/student/my-requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setMyRequests(data);
        } catch (err) {
            console.error('Failed to load requests');
        }
    };

    const handleSubmitRequest = async () => {
        if (!requestReason.trim()) { setRequestMsg('Please enter a reason.'); return; }
        setRequestLoading(true);
        setRequestMsg('');
        try {
            const res = await fetch('/api/student/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    assessmentId: requestModal.assessment._id,
                    type: requestModal.type,
                    reason: requestReason
                })
            });
            const data = await res.json();
            if (res.ok) {
                setRequestMsg('✅ Request submitted! You will be notified when reviewed.');
                setRequestReason('');
                fetchMyRequests();
            } else {
                setRequestMsg('❌ ' + (data.message || 'Failed to submit'));
            }
        } catch (err) {
            setRequestMsg('❌ Network error');
        } finally {
            setRequestLoading(false);
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
                body: JSON.stringify({ ...submissionData, tabSwitches })
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
        if (type === 'note') return '📜';
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
                    <button onClick={() => { setActiveTab('notes'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'notes' ? 'active' : ''}`}>
                        <FileText size={20} />
                        <span>Study Notes</span>
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
                                            <div key={n._id} className={`notif-item ${n.isRead ? 'read' : 'unread'}`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => {
                                                    setShowNotifPanel(false);
                                                    if (n.type === 'assessment') { setActiveTab('assessments'); setAsmtSubTab('active'); }
                                                    else if (n.type === 'system') { setActiveTab('assessments'); setAsmtSubTab('requests'); }
                                                    else if (n.type === 'file') { setActiveTab('dashboard'); }
                                                    else if (n.type === 'note') { setActiveTab('notes'); }
                                                    else { setActiveTab('assessments'); }
                                                }}
                                            >
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
                                <p>Take exams, view past submissions, and submit requests.</p>
                            </div>

                            {/* Sub-tabs */}
                            <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
                                {['active','past','requests'].map(tab => (
                                    <button key={tab} onClick={() => setAsmtSubTab(tab)}
                                        style={{
                                            padding:'8px 18px', borderRadius:'20px', border:'none', cursor:'pointer', fontWeight:600, fontSize:'0.9rem',
                                            background: asmtSubTab === tab ? 'linear-gradient(135deg,#6366f1,#38bdf8)' : 'rgba(255,255,255,0.07)',
                                            color: asmtSubTab === tab ? '#fff' : 'rgba(255,255,255,0.65)'
                                        }}>
                                        {tab === 'active' ? '📝 Active' : tab === 'past' ? '📂 Past Submissions' : '🔄 My Requests'}
                                    </button>
                                ))}
                            </div>

                            {/* Active Exams */}
                            {asmtSubTab === 'active' && (
                                loadingAsmt ? <div className="loading-state">Loading assessments...</div>
                                : assessments.length === 0 ? (
                                    <div className="empty-state"><FileQuestion size={48} /><p>No active assessments at the moment.</p></div>
                                ) : (
                                    <div className="assessments-grid">
                                        {assessments.map((asmt) => {
                                            const submission = asmt.submissions?.find(s => s.student?.toString() === user._id || s.student === user._id);
                                            const isFinished = submission && submission.status !== 'started';
                                            const showResults = asmt.status === 'results_published';
                                            return (
                                                <div key={asmt._id} className={`assessment-card ${showResults ? 'published' : ''}`}>
                                                    <div className="asmt-header">
                                                        <span className={`asmt-status ${isFinished ? 'closed' : 'active'}`}>{isFinished ? 'Submitted' : 'Active'}</span>
                                                        {showResults && <span className="asmt-status active">Results Out</span>}
                                                        <span className="asmt-date">{new Date(asmt.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <h3>{asmt.title}</h3>
                                                    <p>{asmt.description || 'No description provided.'}</p>
                                                    <div className="asmt-stats">
                                                        <div className="asmt-stat"><Clock size={16} /><span>{asmt.duration} Mins</span></div>
                                                        <div className="asmt-stat"><span>{asmt.totalMarks} Marks</span></div>
                                                    </div>
                                                    <div className="asmt-footer">
                                                        {isFinished ? (
                                                            <button className="btn-disabled" disabled><CheckCircle size={16} /> Submission Received</button>
                                                        ) : (
                                                            <button className="btn-start" onClick={() => handleStartExam(asmt._id)}><Play size={16} /> Start Exam</button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}

                            {/* Past Submissions */}
                            {asmtSubTab === 'past' && (
                                pastAssessments.length === 0 ? (
                                    <div className="empty-state"><FileQuestion size={48} /><p>No past assessments found.</p></div>
                                ) : (
                                    <div className="assessments-grid">
                                        {pastAssessments.map((asmt) => {
                                            const sub = asmt.mySubmission;
                                            const totalObtained = sub?.answers?.reduce((a, x) => a + (x.marksObtained || 0), 0) ?? null;
                                            const showResults = asmt.status === 'results_published';
                                            return (
                                                <div key={asmt._id} className="assessment-card" style={{ border: showResults ? '1px solid #6366f1' : undefined }}>
                                                    <div className="asmt-header">
                                                        <span className={`asmt-status ${sub ? 'closed' : 'active'}`}>{sub ? 'Submitted' : 'Not Attempted'}</span>
                                                        {showResults && <span className="asmt-status active">Results Out</span>}
                                                        <span className="asmt-date">{new Date(asmt.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <h3>{asmt.title}</h3>
                                                    <p style={{ opacity:0.6 }}>{asmt.course} • {asmt.totalMarks} marks • {asmt.duration} mins</p>
                                                    {showResults && sub && totalObtained !== null && (
                                                        <div style={{ margin:'8px 0', padding:'8px 12px', background:'rgba(99,102,241,0.15)', borderRadius:'8px', fontSize:'0.95rem' }}>
                                                            Score: <strong>{totalObtained} / {asmt.totalMarks}</strong>
                                                        </div>
                                                    )}
                                                    <div className="asmt-footer" style={{ gap:'8px', flexWrap:'wrap' }}>
                                                        {sub && (
                                                            <button className="btn-view-results" style={{ flexShrink:0 }} onClick={() => setViewSubmission({ asmt, sub })}>
                                                                👁 View Details
                                                            </button>
                                                        )}
                                                        {sub && (
                                                            <button onClick={() => { setRequestModal({ assessment: asmt, type:'re-evaluation' }); setRequestMsg(''); setRequestReason(''); }}
                                                                style={{ padding:'8px 14px', borderRadius:'8px', border:'1px solid rgba(245,158,11,0.5)', background:'rgba(245,158,11,0.1)', color:'#f59e0b', cursor:'pointer', fontSize:'0.85rem', fontWeight:600 }}>
                                                                📋 Re-Evaluation
                                                            </button>
                                                        )}
                                                        {sub && (
                                                            <button onClick={() => { setRequestModal({ assessment: asmt, type:'re-attempt' }); setRequestMsg(''); setRequestReason(''); }}
                                                                style={{ padding:'8px 14px', borderRadius:'8px', border:'1px solid rgba(99,102,241,0.5)', background:'rgba(99,102,241,0.1)', color:'#a5b4fc', cursor:'pointer', fontSize:'0.85rem', fontWeight:600 }}>
                                                                🔄 Re-Attempt
                                                            </button>
                                                        )}
                                                        {!sub && <span style={{ opacity:0.5, fontSize:'0.85rem' }}>Not submitted</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}

                            {/* My Requests */}
                            {asmtSubTab === 'requests' && (
                                myRequests.length === 0 ? (
                                    <div className="empty-state"><FileQuestion size={48} /><p>No requests submitted yet.</p></div>
                                ) : (
                                    <div className="table-card">
                                        <table className="students-table">
                                            <thead><tr><th>Assessment</th><th>Type</th><th>Reason</th><th>Status</th><th>Admin Note</th><th>Date</th></tr></thead>
                                            <tbody>
                                                {myRequests.map(r => (
                                                    <tr key={r._id}>
                                                        <td style={{ fontWeight:600 }}>{r.assessment?.title || '—'}</td>
                                                        <td><span style={{ textTransform:'capitalize', color: r.type==='re-attempt'?'#a5b4fc':'#f59e0b' }}>{r.type}</span></td>
                                                        <td style={{ maxWidth:'200px', opacity:0.8 }}>{r.reason}</td>
                                                        <td><span className={`status-pill ${r.status === 'approved' ? 'active' : r.status === 'rejected' ? 'closed' : ''}`} style={{ padding:'4px 10px' }}>{r.status}</span></td>
                                                        <td style={{ opacity:0.7 }}>{r.adminNote || '—'}</td>
                                                        <td style={{ opacity:0.6 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}

                            {/* Submission Detail Modal */}
                            {viewSubmission && (
                                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
                                    <div style={{ background:'var(--bg-card,#1e293b)', borderRadius:'16px', padding:'28px', maxWidth:'600px', width:'100%', maxHeight:'80vh', overflowY:'auto', border:'1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                                            <h2 style={{ margin:0 }}>📝 {viewSubmission.asmt.title}</h2>
                                            <button onClick={() => setViewSubmission(null)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:'1.5rem' }}>✕</button>
                                        </div>
                                        <p style={{ opacity:0.6, marginBottom:'16px' }}>Submitted: {new Date(viewSubmission.sub.submittedAt).toLocaleString()} • Tab switches: {viewSubmission.sub.tabSwitches || 0}</p>
                                        {viewSubmission.asmt.status === 'results_published' && (
                                            <div style={{ padding:'12px 16px', background:'rgba(99,102,241,0.15)', borderRadius:'10px', marginBottom:'16px', fontSize:'1.1rem' }}>
                                                Total Score: <strong>{viewSubmission.sub.answers?.reduce((a,x) => a+(x.marksObtained||0),0)} / {viewSubmission.asmt.totalMarks}</strong>
                                            </div>
                                        )}
                                        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                                            {viewSubmission.sub.answers?.map((ans, i) => (
                                                <div key={i} style={{ padding:'12px', background:'rgba(255,255,255,0.05)', borderRadius:'10px' }}>
                                                    <p style={{ margin:'0 0 6px', fontWeight:600, opacity:0.9 }}>Q{i+1}: {viewSubmission.asmt.questions?.[i]?.questionText || '—'}</p>
                                                    <p style={{ margin:'0 0 4px', color:'#38bdf8' }}>Your answer: {ans.answerText || '(no answer)'}</p>
                                                    {viewSubmission.asmt.status === 'results_published' && (
                                                        <p style={{ margin:0, color: ans.marksObtained > 0 ? '#4ade80' : '#f87171' }}>Marks: {ans.marksObtained ?? 0} / {viewSubmission.asmt.questions?.[i]?.marks || '?'}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Request Modal */}
                            {requestModal && (
                                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
                                    <div style={{ background:'var(--bg-card,#1e293b)', borderRadius:'16px', padding:'28px', maxWidth:'480px', width:'100%', border:'1px solid rgba(255,255,255,0.1)' }}>
                                        <h2 style={{ margin:'0 0 8px' }}>{requestModal.type === 're-attempt' ? '🔄 Request Re-Attempt' : '📋 Request Re-Evaluation'}</h2>
                                        <p style={{ opacity:0.6, marginBottom:'16px' }}>Assessment: <strong>{requestModal.assessment.title}</strong></p>
                                        <p style={{ opacity:0.7, fontSize:'0.9rem', marginBottom:'16px' }}>
                                            {requestModal.type === 're-attempt'
                                                ? 'Re-attempt allows you to retake the exam. Your existing submission will be removed if approved.'
                                                : 'Re-evaluation requests the teacher to review grading of your existing submission.'}
                                        </p>
                                        <textarea
                                            placeholder="Please provide a reason for your request..."
                                            value={requestReason}
                                            onChange={e => setRequestReason(e.target.value)}
                                            rows={4}
                                            style={{ width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.07)', color:'#fff', fontSize:'0.95rem', resize:'vertical', boxSizing:'border-box' }}
                                        />
                                        {requestMsg && <p style={{ marginTop:'8px', color: requestMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{requestMsg}</p>}
                                        <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
                                            <button onClick={handleSubmitRequest} disabled={requestLoading}
                                                style={{ flex:1, padding:'12px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#6366f1,#38bdf8)', color:'#fff', fontWeight:700, cursor:'pointer' }}>
                                                {requestLoading ? 'Submitting...' : 'Submit Request'}
                                            </button>
                                            <button onClick={() => setRequestModal(null)}
                                                style={{ padding:'12px 16px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.2)', background:'transparent', color:'#fff', cursor:'pointer' }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {takingExam && (
                                <TakeAssessment assessment={takingExam} onComplete={handleSubmitExam} onCancel={() => setTakingExam(null)} />
                            )}
                        </div>
                    ) : activeTab === 'notes' ? (
                        <div className="notes-section">
                            <div className="section-header">
                                <h1>Study Notes</h1>
                                <p>Essential materials shared by your teachers.</p>
                            </div>

                            {loadingNotes ? (
                                <div className="loading-state">Syncing notes...</div>
                            ) : notes.length === 0 ? (
                                <div className="empty-state">
                                    <FileText size={48} />
                                    <p>No study notes available yet.</p>
                                </div>
                            ) : (
                                <div className="notes-grid">
                                    {notes.map(note => (
                                        <div key={note._id} className="note-card">
                                            <div className="note-card-header">
                                                <span className="note-course">{note.course || 'Shared'}</span>
                                                <span className="note-date">{new Date(note.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <h3>{note.title}</h3>
                                            <div className="note-content">
                                                {note.content}
                                            </div>
                                            <div className="note-footer">
                                                <span className="note-teacher">Shared by {note.teacher?.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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

                            {/* Recent Study Notes on Dashboard */}
                            <div className="activity-section" style={{ marginTop: '2rem' }}>
                                <h2>Recent Study Notes</h2>
                                <div className="activity-card">
                                    {loadingNotes ? (
                                        <div className="empty-state"><p>Loading notes...</p></div>
                                    ) : notes.length === 0 ? (
                                        <div className="empty-state"><p>No study notes shared yet.</p></div>
                                    ) : (
                                        <div className="notes-list-dashboard">
                                            {notes.slice(0, 3).map((note) => (
                                                <div key={note._id} className="note-item-dashboard" onClick={() => setActiveTab('notes')}>
                                                    <div className="note-icon">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="note-info">
                                                        <span className="note-title-dash">{note.title}</span>
                                                        <span className="note-teacher-dash">By {note.teacher?.name} • {new Date(note.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <ArrowRight size={16} className="arrow-dash" />
                                                </div>
                                            ))}
                                            {notes.length > 3 && (
                                                <button className="view-all-btn" onClick={() => setActiveTab('notes')}>
                                                    View All Notes
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : activeTab === 'courses' ? (
                        <div className="courses-section">
                            <div className="section-header">
                                <h1>Academic Performance</h1>
                                <p>Progress report across all subjects.</p>
                            </div>
                            
                            <div className="table-card" style={{ background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: '16px' }}>
                                <table className="students-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <tr>
                                            <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-muted)' }}>Subject</th>
                                            <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-muted)' }}>Marks (%)</th>
                                            <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-muted)' }}>Attendance (%)</th>
                                            <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-muted)' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { name: 'Python', key: 'python' },
                                            { name: 'Data Structures', key: 'dataStructures' },
                                            { name: 'DBMS', key: 'dbms' },
                                            { name: 'Web Development', key: 'webDev' },
                                            { name: 'Computer Networks', key: 'networks' }
                                        ].map(course => {
                                            const data = user.academicData?.[course.key] || { marks: 0, attendance: 0 };
                                            return (
                                                <tr key={course.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '15px', fontWeight: 600 }}>{course.name}</td>
                                                    <td style={{ padding: '15px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                                                                <div style={{ width: `${data.marks}%`, height: '100%', background: '#38bdf8', borderRadius: '3px' }}></div>
                                                            </div>
                                                            <span>{data.marks}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '15px' }}>{data.attendance}%</td>
                                                    <td style={{ padding: '15px' }}>
                                                        <span className={`status-pill ${data.attendance >= 75 ? 'active' : 'closed'}`} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                                                            {data.attendance >= 75 ? 'On Track' : 'Low Att.'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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

export default StudentPortal;
