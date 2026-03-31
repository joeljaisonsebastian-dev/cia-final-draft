import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import './Hero.css';

const Hero = () => {
    return (
        <section className="hero">
            <div className="hero-background">
                <div className="glow-blob blob-1"></div>
                <div className="glow-blob blob-2"></div>
                <div className="glow-blob blob-3"></div>
                <div className="hero-grid"></div>
                <div className="particles">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`particle particle-${i + 1}`} />
                    ))}
                </div>
            </div>

            <div className="hero-content">
                <div className="hero-badge">
                    <Sparkles size={16} />
                    <span>Powered by AI</span>
                </div>

                <h1 className="hero-title">
                    Next-Gen <span>Intelligent</span> Assessment Platform
                </h1>

                <p className="hero-subtitle">
                    Secure, seamless, and smart online examinations powered by AI.
                    Experience automated grading, intelligent jumbling, and comprehensive
                    analytics for both teachers and students.
                </p>

                <div className="hero-actions">
                    <Link to="/login">
                        <button className="btn btn-primary btn-turn-in">
                            <span>Turn In</span> <ArrowRight size={18} />
                        </button>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default Hero;
