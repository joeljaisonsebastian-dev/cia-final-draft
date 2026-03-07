import React from 'react';
import { ShieldCheck, Shuffle, Bot, BarChart3 } from 'lucide-react';
import './Features.css';

const features = [
    {
        icon: <Bot className="feature-icon" />,
        title: "AI Answer Evaluation",
        description: "Intelligent grading for subjective questions with pattern matching and confidence scoring."
    },
    {
        icon: <Shuffle className="feature-icon" />,
        title: "Smart Question Jumbling",
        description: "Automated real-time generation of paper variants to completely eliminate copying."
    },
    {
        icon: <ShieldCheck className="feature-icon" />,
        title: "Secure Exam Portal",
        description: "Advanced interface preventing window switching and securing sessions during exams."
    },
    {
        icon: <BarChart3 className="feature-icon" />,
        title: "Real-time Analytics",
        description: "Comprehensive reporting for class-wise performance and individual student progress."
    }
];

const Features = () => {
    return (
        <section className="features" id="features">
            <div className="features-header">
                <h2>Core Capabilities</h2>
                <p>Built perfectly to handle the stress of continuous internal assessments.</p>
            </div>

            <div className="features-grid">
                {features.map((feature, index) => (
                    <div className="feature-card" key={index}>
                        <div className="feature-icon-wrapper">
                            {feature.icon}
                        </div>
                        <h3>{feature.title}</h3>
                        <p>{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Features;
