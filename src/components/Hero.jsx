import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BrainCircuit } from 'lucide-react';
import './Hero.css';

const Hero = () => {
    return (
        <section className="hero">
            <div className="hero-background">
                <div className="glow-blob blob-1"></div>
                <div className="glow-blob blob-2"></div>
            </div>

            <div className="hero-content">
                <h1 className="hero-title">
                    Next-Gen <span>Intelligent</span> Assessment Platform
                </h1>

                <p className="hero-subtitle">
                    Secure, seamless, and smart online examinations powered by AI. Experience automated grading,
                    intelligent jumbling, and comprehensive analytics for both teachers and students.
                </p>

                <div className="hero-actions">
                    <Link to="/login?role=teacher">
                        <button className="btn btn-primary">
                            Teacher Portal <ArrowRight size={18} />
                        </button>
                    </Link>
                    <Link to="/login?role=student">
                        <button className="btn btn-secondary">
                            Student Portal
                        </button>
                    </Link>
                </div>

                <div className="admin-entry">
                    <Link to="/admin-login">Are you an Admin?</Link>
                </div>
            </div>
        </section>
    );
};

export default Hero;
