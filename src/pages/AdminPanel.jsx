import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Download, Trash2, Edit3, X, Check, LogOut, Shield, CheckCircle, XCircle, Menu, BarChart3, Settings, Bell } from 'lucide-react';
import './AdminPanel.css';

const AdminPanel = () => {
    const [students, setStudents] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newStudent, setNewStudent] = useState({ name: '', email: '' });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ name: '', email: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('students');
    const navigate = useNavigate();

    const token = localStorage.getItem('adminToken');

    useEffect(() => {
        if (!token) {
            navigate('/admin-login');
            return;
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [studentsRes, pendingRes] = await Promise.all([
                fetch('/api/admin/students', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/pending', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (studentsRes.status === 401 || studentsRes.status === 403) {
                localStorage.removeItem('adminToken');
                navigate('/admin-login');
                return;
            }

            const studentsData = await studentsRes.json();
            const pendingData = await pendingRes.json();

            setStudents(studentsData);
            setPendingUsers(pendingData);
        } catch (err) {
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        setError('');
        setSuccess('');
        try {
            const res = await fetch(`/api/admin/approve/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to approve user');
            setSuccess('User approved successfully!');
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Delete this pending signup entirely?')) return;
        setError('');
        setSuccess('');
        try {
            const res = await fetch(`/api/admin/reject/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to reject user');
            setSuccess('User rejected successfully!');
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newStudent)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message);

            setSuccess(`Student added! Generated password: ${data.generatedPassword}`);
            setNewStudent({ name: '', email: '' });
            setShowAddForm(false);
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteStudent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this student?')) return;
        setError('');
        setSuccess('');

        try {
            const res = await fetch(`/api/admin/students/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message);
            }

            setSuccess('Student deleted successfully');
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEditStart = (student) => {
        setEditingId(student._id);
        setEditData({ name: student.name, email: student.email });
    };

    const handleEditSave = async (id) => {
        setError('');
        setSuccess('');

        try {
            const res = await fetch(`/api/admin/students/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setSuccess('Student updated successfully');
            setEditingId(null);
            fetchData();
        } catch (err) {
            setError(err.message);
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
            setError(err.message);
        }
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError('');
        setSuccess('');
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

            setSuccess(data.message);
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            e.target.value = ''; // Reset input
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
            setError(err.message);
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
            setError(err.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin-login');
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
        <div className="admin-layout">
            {/* Mobile Overlay */}
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
                    <button
                        onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }}
                        className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
                    >
                        <Users size={20} />
                        <span>Students</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('teachers'); setMobileMenuOpen(false); }}
                        className={`nav-item ${activeTab === 'teachers' ? 'active' : ''}`}
                    >
                        <Shield size={20} />
                        <span>Teachers</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
                        className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                    >
                        <BarChart3 size={20} />
                        <span>Analytics</span>
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
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="mobile-logo-text admin-logo">
                        Admin <span>Panel</span>
                    </div>
                    <h1 className="desktop-header-title">
                        {activeTab === 'students' ? 'User Management' :
                            activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Management'}
                    </h1>
                    <div className="header-actions">
                        <label className="btn btn-secondary desktop-only" style={{ cursor: 'pointer' }}>
                            <Upload size={18} /> Import
                            <input type="file" accept=".csv, .xlsx" onChange={handleImportFile} style={{ display: 'none' }} />
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
                        <button className="btn btn-primary desktop-only" onClick={() => setShowAddForm(!showAddForm)}>
                            <UserPlus size={18} /> Add Student
                        </button>
                        
                        {/* Mobile & Desktop Actions */}
                        <button className="icon-btn bell-btn" style={{ position: 'relative', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.6)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Bell size={20} />
                            <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0a0a1a' }}>0</span>
                        </button>
                        
                        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {activeTab === 'students' ? (
                    <>
                        {/* Pending Approvals Table */}
                        {pendingUsers.length > 0 && (
                            <div className="table-card" style={{ marginBottom: "2rem", border: "1px solid #f59e0b" }}>
                                <div style={{ padding: "16px 20px", background: "rgba(245, 158, 11, 0.1)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Shield size={20} color="#f59e0b" />
                                    <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#f59e0b" }}>Pending Approvals (Signups)</h3>
                                </div>
                                <table className="students-table">
                                    <thead>
                                        <tr>
                                            <th>Role</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Date Applied</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingUsers.map(user => (
                                            <tr key={user._id}>
                                                <td style={{ textTransform: 'capitalize' }}>{user.role}</td>
                                                <td>{user.name}</td>
                                                <td>{user.email}</td>
                                                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                                <td className="actions-cell">
                                                    <button className="icon-btn save" onClick={() => handleApprove(user._id)} title="Approve">
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button className="icon-btn delete" onClick={() => handleReject(user._id)} title="Reject">
                                                        <XCircle size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Add Student Form */}
                        {showAddForm && (
                            <div className="add-form-card">
                                <h3>Add New Student Directly (Active by default)</h3>
                                <form onSubmit={handleAddStudent}>
                                    <div className="form-row">
                                        <input
                                            type="text"
                                            placeholder="Student name"
                                            value={newStudent.name}
                                            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                            required
                                        />
                                        <input
                                            type="email"
                                            placeholder="Student email"
                                            value={newStudent.email}
                                            onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                            required
                                        />
                                        <button type="submit" className="btn btn-primary">Add</button>
                                        <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                                <p className="form-hint">A password will be auto-generated for the student and saved to the CSV.</p>
                            </div>
                        )}

                        {/* Active Students Table */}
                        <div className="table-card">
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Active Students</h3>
                            </div>
                            {loading ? (
                                <div className="loading-state">Loading actual students...</div>
                            ) : students.length === 0 ? (
                                <div className="empty-state">
                                    <Users size={48} />
                                    <p>No active students yet.</p>
                                </div>
                            ) : (
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
                                        {students.map((student, index) => (
                                            <tr key={student._id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    {editingId === student._id ? (
                                                        <input
                                                            type="text"
                                                            value={editData.name}
                                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                            className="edit-input"
                                                        />
                                                    ) : (
                                                        student.name
                                                    )}
                                                </td>
                                                <td>
                                                    {editingId === student._id ? (
                                                        <input
                                                            type="email"
                                                            value={editData.email}
                                                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                                            className="edit-input"
                                                        />
                                                    ) : (
                                                        student.email
                                                    )}
                                                </td>
                                                <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                                                <td className="actions-cell">
                                                    {editingId === student._id ? (
                                                        <>
                                                            <button className="icon-btn save" onClick={() => handleEditSave(student._id)} title="Save">
                                                                <Check size={16} />
                                                            </button>
                                                            <button className="icon-btn cancel" onClick={() => setEditingId(null)} title="Cancel">
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="icon-btn edit" onClick={() => handleEditStart(student)} title="Edit">
                                                                <Edit3 size={16} />
                                                            </button>
                                                            <div className="export-dropdown">
                                                                <button className="icon-btn" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }} title="Export User">
                                                                    <Download size={16} />
                                                                </button>
                                                                <div className="dropdown-content">
                                                                    <button onClick={() => handleExportUser(student._id, student.name, 'csv')}>As CSV</button>
                                                                    <button onClick={() => handleExportUser(student._id, student.name, 'xlsx')}>As Excel</button>
                                                                </div>
                                                            </div>
                                                            <button className="icon-btn delete" onClick={() => handleDeleteStudent(student._id)} title="Delete">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="empty-state" style={{ padding: '60px', opacity: 0.6 }}>
                        <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management</h2>
                        <p>This section is currently under development. Please check back later.</p>
                    </div>
                )}
            </main >
        </div >
    );
};

export default AdminPanel;
