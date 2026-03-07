import React from 'react';
import { BrainCircuit, Github, Twitter, Linkedin } from 'lucide-react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-brand">
                    <div className="footer-logo">
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
                        <a href="src\pages\TeacherPortal.jsx">Teacher Portal</a>
                        <a href="src\pages\StudentPortal.jsx">Student Portal</a>
                        <a href="#">Features</a>
                    </div>
                    <div className="link-column">
                        <h4>Resources</h4>
                        <a href="#">Documentation</a>
                        <a href="#">Help Center</a>
                        <a href="#">API Reference</a>
                        <a href="#">Blog</a>
                    </div>
                    <div className="link-column">
                        <h4>Legal</h4>
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                        <a href="#">Security</a>
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
