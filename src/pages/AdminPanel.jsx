import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Download, Trash2, Edit3, X, Check, LogOut, Shield, CheckCircle, XCircle } from 'lucide-react';
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

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin-login');
    };

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <Shield size={24} />
                    <h2>Admin <span>Panel</span></h2>
                </div>

                <nav className="sidebar-nav">
                    <a href="#" className="nav-item active">
                        <Users size={20} />
                        <span>Students</span>
                    </a>
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
                    <h1>User Management</h1>
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={handleDownloadCSV}>
                            <Download size={18} /> Download CSV
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                            <UserPlus size={18} /> Add Student
                        </button>
                    </div>
                </header>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

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
            </main>
        </div>
    );
};

export default AdminPanel;
