import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Users, GraduationCap, Shield, ArrowRight, User } from 'lucide-react';
import './LoginPage.css';

const LoginPage = () => {
    const [activeRole, setActiveRole] = useState('student');
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const role = queryParams.get('role');
        if (role === 'teacher' || role === 'student' || role === 'admin') {
            console.log('Setting active role from URL:', role);
            setActiveRole(role);
        }
    }, [location.search]);

    const handleRoleChange = (role) => {
        console.log('Manually changing role to:', role);
        setActiveRole(role);
        setError('');
        setIsSignup(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (activeRole === 'admin') {
                // Admin login
                const res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: adminUsername, password: adminPassword })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Login failed');
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminUser', JSON.stringify(data));
                navigate('/admin');
            } else {
                // Student / Teacher login or signup
                const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
                const body = isSignup
                    ? { name, email, password, role: activeRole }
                    : { email, password };

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();

                if (!res.ok) {
                    if (res.status === 403) throw new Error(data.message || 'Account pending approval.');
                    throw new Error(data.message || 'Authentication failed');
                }

                if (res.status === 202) {
                    alert(data.message);
                    setIsSignup(false);
                    setPassword('');
                    return;
                }

                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data));

                if (data.role === 'teacher') {
                    navigate('/teacher-portal');
                } else {
                    navigate('/student-portal');
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { key: 'student', label: 'Student', icon: GraduationCap, color: '#a855f7' },
        { key: 'teacher', label: 'Teacher', icon: Users, color: '#6366f1' },
        { key: 'admin', label: 'Admin', icon: Shield, color: '#f59e0b' },
    ];

    return (
        <div className="login-page">
            <div className="login-bg">
                <div className="login-blob lb-1"></div>
                <div className="login-blob lb-2"></div>
                <div className="login-blob lb-3"></div>
                <div className="login-grid-bg"></div>
            </div>

            <div className="login-card">
                <div className="login-header">
                    <h2>Welcome to <span>CIA Portal</span></h2>
                    <p>
                        {activeRole === 'admin'
                            ? 'Enter administrator credentials'
                            : isSignup
                                ? 'Create your account'
                                : 'Sign in to continue to your dashboard'}
                    </p>
                </div>

                {/* Role selector */}
                <div className="role-tabs">
                    {roles.map(({ key, label, icon: Icon, color }) => (
                        <button
                            key={key}
                            className={`role-tab ${activeRole === key ? 'active' : ''}`}
                            onClick={() => handleRoleChange(key)}
                            type="button"
                            style={activeRole === key ? { '--tab-color': color } : {}}
                        >
                            <Icon size={17} />
                            <span>{label}</span>
                        </button>
                    ))}
                    <div
                        className="tab-indicator"
                        style={{
                            left: `${roles.findIndex(r => r.key === activeRole) * (100 / 3)}%`,
                            width: `${100 / 3}%`,
                            '--indicator-color': roles.find(r => r.key === activeRole)?.color,
                        }}
                    />
                </div>

                {error && <div className="login-error">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    {activeRole === 'admin' ? (
                        <>
                            {/* Admin form */}
                            <div className="form-group">
                                <label htmlFor="admin-username">Username</label>
                                <div className="input-wrapper">
                                    <User size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        id="admin-username"
                                        placeholder="Enter admin username"
                                        value={adminUsername}
                                        onChange={(e) => setAdminUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="admin-password">Password</label>
                                <div className="input-wrapper">
                                    <Lock size={18} className="input-icon" />
                                    <input
                                        type="password"
                                        id="admin-password"
                                        placeholder="Enter admin password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Student / Teacher form */}
                            {isSignup && (
                                <div className="form-group">
                                    <label htmlFor="name">Full Name</label>
                                    <div className="input-wrapper">
                                        <User size={18} className="input-icon" />
                                        <input
                                            type="text"
                                            id="name"
                                            placeholder="Enter your full name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <div className="input-wrapper">
                                    <Mail size={18} className="input-icon" />
                                    <input
                                        type="email"
                                        id="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <div className="input-wrapper">
                                    <Lock size={18} className="input-icon" />
                                    <input
                                        type="password"
                                        id="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {!isSignup && (
                                <div className="form-options">
                                    <label className="remember-me">
                                        <input type="checkbox" />
                                        <span>Remember me</span>
                                    </label>
                                </div>
                            )}
                        </>
                    )}

                    <button
                        type="submit"
                        className={`login-submit-btn ${activeRole === 'admin' ? 'admin-btn' : ''}`}
                        disabled={loading}
                    >
                        <span>{loading ? 'Please wait...' : (isSignup ? 'Sign Up' : 'Sign In')}</span>
                        <ArrowRight size={18} />
                    </button>
                </form>

                {activeRole !== 'admin' && (
                    <div className="auth-switch">
                        {isSignup ? (
                            <p>Already have an account? <button onClick={() => { setIsSignup(false); setError(''); }}>Sign In</button></p>
                        ) : (
                            <p>Don't have an account? <button onClick={() => { setIsSignup(true); setError(''); }}>Sign Up</button></p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
