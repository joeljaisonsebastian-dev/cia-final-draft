import React from 'react';
import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-brand">
                    <div className="footer-logo">
                        <img src="/logo.png" alt="Smart CIA Logo" className="footer-brand-img" />
                        <span>Smart CIA</span>
                    </div>
                    <p className="footer-description">
                        The Next Generation Continuous Internal Assessment Platform Powered by Artificial Intelligence.
                    </p>
                    <div className="social-links">
                        <a href="https://github.com/joeljaisonsebastian-dev/cia" className="social-link"><Github size={20} /></a>
                    </div>
                </div>

                <div className="footer-links-group">
                    <div className="link-column">
                        <h4>Platform</h4>
                        <Link to="/login?role=teacher">Teacher Portal</Link>
                        <Link to="/login?role=student">Student Portal</Link>
                        <Link to="/login?role=admin">Admin Panel</Link>
                    </div>
                    <div className="link-column">
                        <h4>Resources</h4>
                        <a href="https://drive.google.com/drive/folders/1Dtj3d3FycbRmn7V6TYTHggsbxc5Dqurs?usp=sharing" target="_blank" rel="noopener noreferrer">Documentation</a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} IntelliAssess. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
