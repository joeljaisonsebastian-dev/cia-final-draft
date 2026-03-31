import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Download, Trash2, Edit3, X, Check, LogOut, Shield, CheckCircle, XCircle, Menu, BarChart3, Settings, Bell, Upload, BookOpen, AlertCircle, FileQuestion } from 'lucide-react';
import './AdminPanel.css';

const AdminPanel = () => {
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [pendingChanges, setPendingChanges] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [assessmentRequests, setAssessmentRequests] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [courses, setCourses] = useState([
        { id: 1, name: 'Python', students: 0 },
        { id: 2, name: 'Data Structures', students: 0 },
        { id: 3, name: 'DBMS', students: 0 },
        { id: 4, name: 'Web Development', students: 0 },
        { id: 5, name: 'Computer Networks', students: 0 }
    ]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [addRole, setAddRole] = useState('student');
    const [newUser, setNewUser] = useState({ name: '', email: '', username: '', password: '' });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ name: '', email: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('students');
    const [theme, setTheme] = useState('dark');
    const navigate = useNavigate();

    const token = localStorage.getItem('adminToken');

    useEffect(() => {
        if (!token) {
            navigate('/admin-login');
            return;
        }
        fetchData();
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        document.body.setAttribute('data-theme', savedTheme);
    }, []);

    const fetchData = async () => {
        const headers = { 'Authorization': `Bearer ${token}` };

        const safeJson = async (res) => {
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('adminToken');
                navigate('/admin-login');
                return null;
            }
            if (!res.ok) return [];
            try { return await res.json(); } catch { return []; }
        };

        try {
            const [sRes, tRes, pRes, cRes, aRes] = await Promise.allSettled([
                fetch('/api/admin/students', { headers }),
                fetch('/api/admin/teachers', { headers }),
                fetch('/api/admin/pending',  { headers }),
                fetch('/api/admin/pending-changes', { headers }),
                fetch('/api/assessments/teacher', { headers }),
                fetch('/api/admin/admins', { headers })
            ]);

            const studentsData = sRes.status === 'fulfilled' ? await safeJson(sRes.value) : [];
            const teachersData = tRes.status === 'fulfilled' ? await safeJson(tRes.value) : [];
            const pendingData  = pRes.status === 'fulfilled' ? await safeJson(pRes.value) : [];
            const changesData  = cRes.status === 'fulfilled' ? await safeJson(cRes.value) : [];
            const asmtData     = aRes.status === 'fulfilled' ? await safeJson(aRes.value) : [];
            const adminsData   = adminsRes.status === 'fulfilled' ? await safeJson(adminsRes.value) : [];

            if (studentsData !== null) setStudents(studentsData);
            if (teachersData !== null) setTeachers(teachersData);
            if (pendingData  !== null) setPendingUsers(pendingData);
            if (changesData  !== null) setPendingChanges(changesData);
            if (asmtData     !== null) setAssessments(asmtData);
            if (adminsData   !== null) setAdmins(adminsData);

            if (sRes.status === 'rejected') setError('Some data could not be loaded.');

            // Also fetch assessment requests
            try {
                const rRes = await fetch('/api/admin/assessment-requests', { headers });
                const rData = await rRes.json();
                if (rRes.ok) setAssessmentRequests(rData);
            } catch (e) {}

        } catch (err) {
            setError('Connection error. Is the backend server running?');
        } finally {
            setLoading(false);
        }
    };

    const showMsg = (type, text) => {
        if (type === 'success') setSuccess(text);
        else setError(text);
        setSuccess(type === 'success' ? text : '');
        setError(type === 'error' ? text : '');
        setTimeout(() => { setSuccess(''); setError(''); }, 4000);
    };

    const handleApprove = async (id) => {
        try {
            const res = await fetch(`/api/admin/approve/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to approve user');
            showMsg('success', 'User approved successfully!');
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Delete this pending signup entirely?')) return;
        try {
            const res = await fetch(`/api/admin/reject/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to reject user');
            showMsg('success', 'User rejected successfully!');
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        let endpoint = '';
        if (addRole === 'teacher') endpoint = '/api/admin/teachers';
        else if (addRole === 'admin') endpoint = '/api/admin/admins';
        else endpoint = '/api/admin/students';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const msg = addRole === 'admin'
                ? 'Admin created successfully!'
                : `${addRole.charAt(0).toUpperCase() + addRole.slice(1)} added! Generated password: ${data.generatedPassword}`;

            showMsg('success', msg);
            setNewUser({ name: '', email: '', username: '', password: '' });
            setShowAddForm(false);
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleDeleteAdmin = async (id) => {
        if (!window.confirm('Remove this administrator?')) return;
        try {
            const res = await fetch(`/api/admin/admins/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
            showMsg('success', 'Admin removed successfully');
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleDeleteStudent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this student?')) return;
        try {
            const res = await fetch(`/api/admin/students/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
            showMsg('success', 'Student deleted successfully');
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleDeleteTeacher = async (id) => {
        if (!window.confirm('Are you sure you want to delete this teacher?')) return;
        try {
            const res = await fetch(`/api/admin/teachers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
            showMsg('success', 'Teacher deleted successfully');
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleEditStart = (user) => {
        setEditingId(user._id);
        setEditData({ name: user.name, email: user.email });
    };

    const handleEditSave = async (id, role) => {
        const endpoint = role === 'teacher' ? `/api/admin/teachers/${id}` : `/api/admin/students/${id}`;
        try {
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(editData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            showMsg('success', 'Updated successfully');
            setEditingId(null);
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleApproveChange = async (userId, field) => {
        try {
            const res = await fetch(`/api/admin/approve-change/${userId}/${field}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to approve change');
            showMsg('success', `${field} change approved and applied!`);
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleRejectChange = async (userId, field) => {
        try {
            const res = await fetch(`/api/admin/reject-change/${userId}/${field}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to reject change');
            showMsg('success', `${field} change rejected`);
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleDeleteAssessmentByAdmin = async (id) => {
        if (!window.confirm('Are you sure you want to delete this assessment? This will also remove student submissions.')) return;
        try {
            const res = await fetch(`/api/assessments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete assessment');
            showMsg('success', 'Assessment deleted by Admin');
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleDownloadCSV = async () => {
        try {
            const res = await fetch('/api/admin/students/csv', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to download CSV');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'users_credentials.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/admin/import', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            showMsg('success', data.message);
            fetchData();
        } catch (err) {
            showMsg('error', err.message);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleExportData = async (type) => {
        try {
            const res = await fetch(`/api/admin/export/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to export data');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_export_${new Date().toISOString().split('T')[0]}.${type}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleExportUser = async (id, name, type) => {
        try {
            const res = await fetch(`/api/admin/export-user/${id}/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to export user data');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name.replace(/\s+/g, '_')}_data.${type}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleToggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin-login');
    };

    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
    const totalPending = pendingUsers.length + pendingChanges.length;

    const renderUserTable = (list, role) => (
        <table className="students-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Date Added</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {list.map((u, idx) => (
                    <tr key={u._id}>
                        <td>{idx + 1}</td>
                        <td>
                            {editingId === u._id ? (
                                <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="edit-input" />
                            ) : u.name}
                        </td>
                        <td>
                            {editingId === u._id ? (
                                <input type="email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} className="edit-input" />
                            ) : u.email}
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="actions-cell">
                            {editingId === u._id ? (
                                <>
                                    <button className="icon-btn save" onClick={() => handleEditSave(u._id, role)} title="Save"><Check size={16} /></button>
                                    <button className="icon-btn cancel" onClick={() => setEditingId(null)} title="Cancel"><X size={16} /></button>
                                </>
                            ) : (
                                <>
                                    <button className="icon-btn edit" onClick={() => handleEditStart(u)} title="Edit"><Edit3 size={16} /></button>
                                    <div className="export-dropdown">
                                        <button className="icon-btn" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }} title="Export User"><Download size={16} /></button>
                                        <div className="dropdown-content">
                                            <button onClick={() => handleExportUser(u._id, u.name, 'csv')}>As CSV</button>
                                            <button onClick={() => handleExportUser(u._id, u.name, 'xlsx')}>As Excel</button>
                                        </div>
                                    </div>
                                    <button className="icon-btn delete" onClick={() => role === 'teacher' ? handleDeleteTeacher(u._id) : handleDeleteStudent(u._id)} title="Delete"><Trash2 size={16} /></button>
                                </>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <div className="admin-layout">
            {mobileMenuOpen && (
                <div className="mobile-overlay" onClick={toggleMobileMenu}></div>
            )}

            {/* Sidebar */}
            <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <Shield size={24} />
                    <h2>Admin <span>Panel</span></h2>
                    <button className="close-menu-btn" onClick={toggleMobileMenu}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <button onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}>
                        <Users size={20} />
                        <span>Students</span>
                    </button>
                    <button onClick={() => { setActiveTab('teachers'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'teachers' ? 'active' : ''}`}>
                        <BookOpen size={20} />
                        <span>Teachers</span>
                    </button>
                    <button onClick={() => { setActiveTab('approvals'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'approvals' ? 'active' : ''}`}>
                        <Shield size={20} />
                        <span>Approvals {totalPending > 0 && <span className="nav-badge">{totalPending}</span>}</span>
                    </button>
                    <button onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}>
                        <BarChart3 size={20} />
                        <span>Analytics</span>
                    </button>
                    <button onClick={() => { setActiveTab('assessments'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'assessments' ? 'active' : ''}`}>
                        <FileQuestion size={20} />
                        <span>Assessments</span>
                    </button>
                    <button onClick={() => { setActiveTab('requests'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`}>
                        <AlertCircle size={20} />
                        <span>Requests {assessmentRequests.filter(r => r.status === 'pending').length > 0 && <span className="nav-badge">{assessmentRequests.filter(r => r.status === 'pending').length}</span>}</span>
                    </button>
                    <button onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}>
                        <Settings size={20} />
                        <span>Settings</span>
                    </button>
                    <button onClick={() => { setActiveTab('admins'); setMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'admins' ? 'active' : ''}`}>
                        <Shield size={20} />
                        <span>Administrators</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="mobile-logo-text admin-logo">Admin <span>Panel</span></div>
                    <h1 className="desktop-header-title">
                        {activeTab === 'students' ? 'Student Management' :
                         activeTab === 'teachers' ? 'Teacher Management' :
                         activeTab === 'approvals' ? 'Approvals & Requests' :
                         activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Management'}
                    </h1>
                    <div className="header-actions">
                        <label className="btn btn-secondary desktop-only" style={{ cursor: 'pointer' }}>
                            <Upload size={18} /> Import
                            <input type="file" accept=".csv,.xlsx" onChange={handleImportFile} style={{ display: 'none' }} />
                        </label>
                        <div className="export-dropdown desktop-only">
                            <button className="btn btn-secondary">
                                <Download size={18} /> Export
                            </button>
                            <div className="dropdown-content">
                                <button onClick={() => handleExportData('csv')}>As CSV</button>
                                <button onClick={() => handleExportData('xlsx')}>As Excel</button>
                            </div>
                        </div>
                        <button className="btn btn-primary desktop-only" onClick={() => { 
                            setShowAddForm(!showAddForm); 
                            setAddRole(activeTab === 'teachers' ? 'teacher' : activeTab === 'admins' ? 'admin' : 'student'); 
                        }}>
                            <Users size={18} /> Add {activeTab === 'teachers' ? 'Teacher' : activeTab === 'admins' ? 'Administrator' : 'Student'}
                        </button>

                        <button className="icon-btn bell-btn" style={{ position: 'relative', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Bell size={20} />
                            {totalPending > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0a0a1a' }}>{totalPending}</span>}
                        </button>

                        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {/* Add User Form */}
                {showAddForm && (
                    <div className="add-form-card">
                        <h3>Add New {addRole.charAt(0).toUpperCase() + addRole.slice(1)}</h3>
                        <form onSubmit={handleAddUser}>
                            <div className="form-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                                <select value={addRole} onChange={e => setAddRole(e.target.value)} className="role-select">
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Administrator</option>
                                </select>
                                <input type="text" placeholder="Full name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                                <input type="email" placeholder="Email address" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                                {addRole === 'admin' && (
                                    <>
                                        <input type="text" placeholder="Username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
                                        <input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                                    </>
                                )}
                                <button type="submit" className="btn btn-primary">Add</button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
                            </div>
                        </form>
                        <p className="form-hint">{addRole === 'admin' ? 'Fill in all details to create a new administrator.' : 'A password will be auto-generated and saved to the CSV.'}</p>
                    </div>
                )}

                {activeTab === 'students' ? (
                    <>
                        <div className="table-card">
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Active Students ({students.length})</h3>
                            </div>
                            {loading ? (
                                <div className="loading-state">Loading students...</div>
                            ) : students.length === 0 ? (
                                <div className="empty-state"><Users size={48} /><p>No active students yet.</p></div>
                            ) : renderUserTable(students, 'student')}
                        </div>
                    </>
                ) : activeTab === 'teachers' ? (
                    <div className="table-card">
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Active Teachers ({teachers.length})</h3>
                        </div>
                        {loading ? (
                            <div className="loading-state">Loading teachers...</div>
                        ) : teachers.length === 0 ? (
                            <div className="empty-state"><BookOpen size={48} /><p>No teachers found.</p></div>
                        ) : renderUserTable(teachers, 'teacher')}
                    </div>
                ) : activeTab === 'approvals' ? (
                    <div>
                        {/* Pending Signups */}
                        {pendingUsers.length > 0 && (
                            <div className="table-card" style={{ marginBottom: '2rem', border: '1px solid #f59e0b' }}>
                                <div style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Shield size={20} color="#f59e0b" />
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f59e0b' }}>Pending Signups ({pendingUsers.length})</h3>
                                </div>
                                <table className="students-table">
                                    <thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Date Applied</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {pendingUsers.map(u => (
                                            <tr key={u._id}>
                                                <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                                                <td>{u.name}</td>
                                                <td>{u.email}</td>
                                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                                <td className="actions-cell">
                                                    <button className="icon-btn save" onClick={() => handleApprove(u._id)} title="Approve"><CheckCircle size={16} /></button>
                                                    <button className="icon-btn delete" onClick={() => handleReject(u._id)} title="Reject"><XCircle size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pending Profile Changes */}
                        <div className="table-card" style={{ border: pendingChanges.length > 0 ? '1px solid #6366f1' : undefined }}>
                            <div style={{ padding: '16px 20px', background: pendingChanges.length > 0 ? 'rgba(99,102,241,0.1)' : undefined, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={20} color={pendingChanges.length > 0 ? '#6366f1' : 'rgba(255,255,255,0.5)'} />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: pendingChanges.length > 0 ? '#6366f1' : undefined }}>Pending Profile Change Requests ({pendingChanges.length})</h3>
                            </div>
                            {pendingChanges.length === 0 ? (
                                <div className="empty-state" style={{ padding: '30px' }}>
                                    <p>No pending profile changes.</p>
                                </div>
                            ) : (
                                <table className="students-table">
                                    <thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Requested Name</th><th>Requested Password</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {pendingChanges.map(u => (
                                            <tr key={u._id}>
                                                <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                                                <td>{u.name}</td>
                                                <td>{u.email}</td>
                                                <td>
                                                    {u.pendingChanges?.name ? (
                                                        <span style={{ color: '#f59e0b' }}>{u.pendingChanges.name}</span>
                                                    ) : <span style={{ opacity: 0.4 }}>—</span>}
                                                </td>
                                                <td>
                                                    {u.pendingChanges?.password ? (
                                                        <span style={{ color: '#f59e0b' }}>••••••••</span>
                                                    ) : <span style={{ opacity: 0.4 }}>—</span>}
                                                </td>
                                                <td className="actions-cell" style={{ flexWrap: 'wrap', gap: '4px' }}>
                                                    {u.pendingChanges?.name && (
                                                        <>
                                                            <button className="btn-small btn-publish" onClick={() => handleApproveChange(u._id, 'name')} title="Approve name change">✓ Name</button>
                                                            <button className="btn-small" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={() => handleRejectChange(u._id, 'name')} title="Reject name change">✗ Name</button>
                                                        </>
                                                    )}
                                                    {u.pendingChanges?.password && (
                                                        <>
                                                            <button className="btn-small btn-publish" onClick={() => handleApproveChange(u._id, 'password')} title="Approve password change">✓ Pass</button>
                                                            <button className="btn-small" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={() => handleRejectChange(u._id, 'password')} title="Reject password change">✗ Pass</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'assessments' ? (
                    <div className="table-card">
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Global Assessments ({assessments.length})</h3>
                        </div>
                        {loading ? (
                            <div className="loading-state">Loading assessments...</div>
                        ) : assessments.length === 0 ? (
                            <div className="empty-state"><FileQuestion size={48} /><p>No assessments found.</p></div>
                        ) : (
                            <table className="students-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Created By</th>
                                        <th>Status</th>
                                        <th>Questions</th>
                                        <th>Submissions</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assessments.map(a => (
                                        <tr key={a._id}>
                                            <td style={{ fontWeight: 600 }}>{a.title}</td>
                                            <td>{a.teacher?.name || 'Unknown'}</td>
                                            <td><span className={`status-pill ${a.status}`}>{a.status}</span></td>
                                            <td>{a.questions?.length || 0}</td>
                                            <td>{a.submissions?.length || 0}</td>
                                            <td className="actions-cell">
                                                <button className="icon-btn delete" onClick={() => handleDeleteAssessmentByAdmin(a._id)} title="Delete Assessment">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : activeTab === 'requests' ? (
                    <div className="table-card">
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Student Assessment Requests ({assessmentRequests.length})</h3>
                        </div>
                        {assessmentRequests.length === 0 ? (
                            <div className="empty-state"><AlertCircle size={48} /><p>No assessment requests yet.</p></div>
                        ) : (
                            <table className="students-table">
                                <thead>
                                    <tr><th>Student</th><th>Assessment</th><th>Type</th><th>Reason</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {assessmentRequests.map(r => (
                                        <tr key={r._id}>
                                            <td><strong>{r.student?.name}</strong><br/><span style={{opacity:0.6,fontSize:'0.8rem'}}>{r.student?.email}</span></td>
                                            <td>{r.assessment?.title}</td>
                                            <td><span style={{ textTransform:'capitalize', color: r.type==='re-attempt'?'#a5b4fc':'#f59e0b', fontWeight:600 }}>{r.type}</span></td>
                                            <td style={{ maxWidth:'180px', fontSize:'0.85rem', opacity:0.8 }}>{r.reason}</td>
                                            <td><span className={`status-pill ${r.status === 'approved' ? 'active' : r.status === 'rejected' ? 'closed' : ''}`} style={{ padding:'4px 10px' }}>{r.status}</span></td>
                                            <td style={{ opacity:0.6, fontSize:'0.85rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                                            <td className="actions-cell">
                                                {r.status === 'pending' && (
                                                    <>
                                                        <button className="icon-btn save" title="Approve" onClick={async () => {
                                                            const res = await fetch(`/api/admin/assessment-requests/${r._id}/approve`, { method:'PUT', headers:{ 'Authorization':`Bearer ${token}` } });
                                                            if (res.ok) { showMsg('success','Request approved'); fetchData(); }
                                                            else showMsg('error','Failed to approve');
                                                        }}><CheckCircle size={16} /></button>
                                                        <button className="icon-btn delete" title="Reject" onClick={async () => {
                                                            const res = await fetch(`/api/admin/assessment-requests/${r._id}/reject`, { method:'PUT', headers:{ 'Authorization':`Bearer ${token}` } });
                                                            if (res.ok) { showMsg('success','Request rejected'); fetchData(); }
                                                            else showMsg('error','Failed to reject');
                                                        }}><XCircle size={16} /></button>
                                                    </>
                                                )}
                                                {r.status !== 'pending' && <span style={{opacity:0.5,fontSize:'0.8rem'}}>Resolved</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : activeTab === 'admins' ? (
                    <div className="table-card">
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Administrator Accounts ({admins.length})</h3>
                        </div>
                        {loading ? (
                            <div className="loading-state">Loading admins...</div>
                        ) : admins.length === 0 ? (
                            <div className="empty-state"><Shield size={48} /><p>No administrators found.</p></div>
                        ) : (
                            <table className="students-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Username / Email</th>
                                        <th>Date Added</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.map((admin, idx) => (
                                        <tr key={admin._id}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{admin.name}</strong></td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{admin.username || 'root'}</span>
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{admin.email}</span>
                                                </div>
                                            </td>
                                            <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                                            <td className="actions-cell">
                                                <button 
                                                    className="icon-btn delete" 
                                                    onClick={() => handleDeleteAdmin(admin._id)} 
                                                    title="Remove Admin"
                                                    disabled={admin._id === JSON.parse(localStorage.getItem('adminUser') || '{}')._id}
                                                    style={admin._id === JSON.parse(localStorage.getItem('adminUser') || '{}')._id ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : activeTab === 'analytics' ? (
                    <div className="analytics-summary-cards">
                        <div className="sum-card-admin">
                            <div className="sum-val">{students.length}</div>
                            <div className="sum-label">Total Students</div>
                        </div>
                        <div className="sum-card-admin">
                            <div className="sum-val">{teachers.length}</div>
                            <div className="sum-label">Total Teachers</div>
                        </div>
                        <div className="sum-card-admin">
                            <div className="sum-val">{admins.length}</div>
                            <div className="sum-label">Total Admins</div>
                        </div>
                        <div className="sum-card-admin">
                            <div className="sum-val">{pendingUsers.length}</div>
                            <div className="sum-label">Pending Signups</div>
                        </div>
                        <div className="sum-card-admin">
                            <div className="sum-val">{assessments.length}</div>
                            <div className="sum-label">Total Assessments</div>
                        </div>
                    </div>
                ) : (
                    <div className="settings-section-admin" style={{ padding: '20px' }}>
                        <div className="settings-card" style={{ maxWidth: '400px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>Theme Mode</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', opacity: 0.6 }}>Switch between dark and light</p>
                                </div>
                                <button
                                    className={`toggle-switch ${theme === 'dark' ? 'on' : 'off'}`}
                                    onClick={handleToggleTheme}
                                >
                                    <span className="toggle-thumb"></span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminPanel;
