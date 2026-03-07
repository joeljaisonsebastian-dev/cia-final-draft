import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Hero from './components/Hero';
import Features from './components/Features';
import Roles from './components/Roles';
import Analytics from './components/Analytics';
import Footer from './components/Footer';
import TeacherPortal from './pages/TeacherPortal';
import StudentPortal from './pages/StudentPortal';
import LoginPage from './pages/LoginPage';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import './index.css';

// Landing Page layout consisting of the current components
const LandingPage = () => {
    return (
        <div className="layout">
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
                {/* Admin routes */}
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminPanel />} />
            </Routes>
        </Router>
    );
}

export default App;
