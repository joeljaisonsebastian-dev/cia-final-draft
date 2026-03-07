import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, ArrowRight } from 'lucide-react';
import './AdminLogin.css';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Login failed');
            }

            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data));
            navigate('/admin');
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
                    <div className="admin-icon">
                        <Shield size={32} />
                    </div>
                    <h2>Admin <span>Panel</span></h2>
                    <p>Enter administrator credentials to continue</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <div className="input-wrapper">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                id="username"
                                placeholder="Enter admin username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
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
                                placeholder="Enter admin password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'} <ArrowRight size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
