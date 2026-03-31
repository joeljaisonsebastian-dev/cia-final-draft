import React, { useState, useEffect } from 'react';
import { Sun, Moon, BrainCircuit } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'dark';
    });

    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('theme', next);
        document.body.setAttribute('data-theme', next);
    };

    const isDark = theme === 'dark';

    return (
        <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
            <div className="navbar-inner">
                <div className="navbar-brand">
                    <img src="/logo.png" alt="Smart CIA Logo" className="brand-logo-img" />
                    <span className="brand-text">Smart CIA</span>
                </div>

                <button
                    className="theme-toggle-btn"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    <div className={`theme-pill ${isDark ? 'is-dark' : 'is-light'}`}>
                        <div className="pill-icon-area">
                            {isDark ? (
                                <Moon size={16} className="pill-icon" />
                            ) : (
                                <Sun size={16} className="pill-icon" />
                            )}
                        </div>
                        <span className="pill-label">{isDark ? 'Dark' : 'Light'}</span>
                    </div>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
