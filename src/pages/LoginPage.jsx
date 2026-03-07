import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Users, GraduationCap, ArrowRight, User } from 'lucide-react';
import './LoginPage.css';

const LoginPage = () => {
    const [activeRole, setActiveRole] = useState('student');
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const role = queryParams.get('role');
        if (role === 'teacher' || role === 'student') {
            setActiveRole(role);
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
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
                if (res.status === 403) {
                    throw new Error(data.message || 'Account pending approval.');
                }
                throw new Error(data.message || 'Authentication failed');
            }

            // Handle pending signup explicitly sent as 202
            if (res.status === 202) {
                // Return early, don't save token, show success info
                alert(data.message);
                setIsSignup(false);
                setPassword('');
                return;
            }

            // Store token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));

            // Navigate based on role
            if (data.role === 'teacher') {
                navigate('/teacher-portal');
            } else {
                navigate('/student-portal');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="glow-blob blob-1"></div>
                <div className="glow-blob blob-2"></div>
            </div>

            <div className="login-card">
                <div className="login-header">
                    <h2>Welcome to <span>CIA Portal</span></h2>
                    <p>{isSignup ? 'Create your account' : 'Sign in to continue to your dashboard'}</p>
                </div>

                <div className="role-toggle">
                    <button
                        className={`toggle-btn ${activeRole === 'student' ? 'active' : ''}`}
                        onClick={() => setActiveRole('student')}
                        type="button"
                    >
                        <GraduationCap size={18} /> Student
                    </button>
                    <button
                        className={`toggle-btn ${activeRole === 'teacher' ? 'active' : ''}`}
                        onClick={() => setActiveRole('teacher')}
                        type="button"
                    >
                        <Users size={18} /> Teacher
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
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

                    <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
                        {loading ? 'Please wait...' : (isSignup ? 'Sign Up' : 'Sign In')} <ArrowRight size={18} />
                    </button>
                </form>

                <div className="auth-switch">
                    {isSignup ? (
                        <p>Already have an account? <button onClick={() => { setIsSignup(false); setError(''); }}>Sign In</button></p>
                    ) : (
                        <p>Don't have an account? <button onClick={() => { setIsSignup(true); setError(''); }}>Sign Up</button></p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
