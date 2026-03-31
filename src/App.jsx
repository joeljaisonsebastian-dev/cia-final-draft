import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Roles from './components/Roles';
import Analytics from './components/Analytics';
import Footer from './components/Footer';
import TeacherPortal from './pages/TeacherPortal';
import StudentPortal from './pages/StudentPortal';
import LoginPage from './pages/LoginPage';

import AdminPanel from './pages/AdminPanel';
import './index.css';

// Landing Page layout consisting of the current components
const LandingPage = () => {
    return (
        <div className="layout">
            <Navbar />
            <main>
                <Hero />
                <Features />
                <Roles />
                <Analytics />
            </main>
            <Footer />
        </div>
    );
};

function App() {
    // Apply saved theme on every page load
    useEffect(() => {
        const saved = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', saved);
    }, []);

    return (
        <Router>
            <Routes>
                {/* Home route displays the landing page */}
                <Route path="/" element={<LandingPage />} />
                {/* Login Portal route */}
                <Route path="/login" element={<LoginPage />} />
                {/* Teacher Portal route */}
                <Route path="/teacher-portal" element={<TeacherPortal />} />
                {/* Student Portal route */}
                <Route path="/student-portal" element={<StudentPortal />} />
                {/* Admin Panel route */}
                <Route path="/admin" element={<AdminPanel />} />
            </Routes>
        </Router>
    );
}

export default App;
