import React from 'react';
import { LineChart, LayoutDashboard, TrendingUp } from 'lucide-react';
import './Analytics.css';

const Analytics = () => {
    return (
        <section className="analytics" id="analytics">
            <div className="analytics-content">
                <div className="analytics-text">
                    <div className="badge analytics-badge">
                        <LineChart size={16} /> Insightful Data
                    </div>
                    <h2>Actionable <span>Intelligent Analytics</span></h2>
                    <p>
                        Transforms raw assessment data into visually stunning, actionable insights.
                        Identify at-risk students immediately, gauge class comprehension on specific topics,
                        and continually improve your teaching materials based on data.
                    </p>

                    <div className="analytics-metrics">
                        <div className="metric">
                            <span className="metric-value">40%</span>
                            <span className="metric-label">Reduced Grading Time</span>
                        </div>
                        <div className="metric">
                            <span className="metric-value">100%</span>
                            <span className="metric-label">Automated Insights</span>
                        </div>
                    </div>
                </div>

                <div className="analytics-visual">
                    <div className="mock-dashboard">
                        <div className="dashboard-header">
                            <LayoutDashboard size={20} />
                            <span>Performance Overview</span>
                        </div>
                        <div className="dashboard-body">
                            <div className="chart-bars">
                                <div className="bar" style={{ height: '40%' }}></div>
                                <div className="bar" style={{ height: '70%' }}></div>
                                <div className="bar" style={{ height: '50%' }}></div>
                                <div className="bar" style={{ height: '90%' }}></div>
                                <div className="bar" style={{ height: '60%' }}></div>
                                <div className="bar" style={{ height: '85%' }}></div>
                            </div>
                            <div className="trend-card">
                                <TrendingUp size={24} className="trend-icon" />
                                <div className="trend-info">
                                    <h4>Class Average</h4>
                                    <p>+12% this semester</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Analytics;
