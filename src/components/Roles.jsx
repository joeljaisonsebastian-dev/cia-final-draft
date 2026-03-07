import React from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, CheckCircle2 } from 'lucide-react';
import './Roles.css';

const Roles = () => {
    return (
        <section className="roles" id="roles">
            <div className="roles-container">
                <div className="role-card teacher-role">
                    <div className="role-header">
                        <div className="role-icon teacher">
                            <Users size={32} />
                        </div>
                        <h2>Teacher Dashboard</h2>
                    </div>
                    <p className="role-description">
                        Streamline your workflow with automated grading and comprehensive insights.
                    </p>
                    <ul className="role-features">
                        <li><CheckCircle2 size={18} className="check-icon" /> AI-powered answer evaluation</li>
                        <li><CheckCircle2 size={18} className="check-icon" /> Automated question paper generation</li>
                        <li><CheckCircle2 size={18} className="check-icon" /> Real-time monitoring of exam progress</li>
                        <li><CheckCircle2 size={18} className="check-icon" /> Assignment and class mapping</li>
                    </ul>
                    <Link to="/login?role=teacher" className="btn btn-outline teacher-btn">Explore Teacher Portal</Link>
                </div>

                <div className="role-card student-role">
                    <div className="role-header">
                        <div className="role-icon student">
                            <GraduationCap size={32} />
                        </div>
                        <h2>Student Portal</h2>
                    </div>
                    <p className="role-description">
                        Experience a secure, distraction-free environment for assessments.
                    </p>
                    <ul className="role-features">
                        <li><CheckCircle2 size={18} className="check-icon" /> Secure, anti-cheat exam interface</li>
                        <li><CheckCircle2 size={18} className="check-icon" /> Immediate feedback and scoring</li>
                        <li><CheckCircle2 size={18} className="check-icon" /> Historical records and analytics</li>
                        <li><CheckCircle2 size={18} className="check-icon" /> Auto-save functionality</li>
                    </ul>
                    <Link to="/login?role=student" className="btn btn-outline student-btn">Explore Student Portal</Link>
                </div>
            </div>
        </section>
    );
};

export default Roles;
