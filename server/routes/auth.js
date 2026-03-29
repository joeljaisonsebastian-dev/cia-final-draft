const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const Notification = require('../models/Notification');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Internal notify admin helper
const notifyAdmin = async (title, message, relatedId, type = 'signup') => {
    try {
        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
            await Notification.create({
                user: admin._id,
                title,
                message,
                type,
                relatedId
            });
        }
    } catch (err) {
        console.error('Admin notification failed:', err);
    }
};

// POST /api/auth/signup — Register a new student or teacher
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password' });
        }

        const allowedRoles = ['student', 'teacher'];
        const userRole = allowedRoles.includes(role) ? role : 'student';

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // All new signups are now PENDING for safety, as requested for "admin approval"
        const status = 'pending';

        const user = await User.create({
            name,
            email,
            password,
            role: userRole,
            status,
            plainPassword: password
        });

        // Update CSV
        const { updateUsersCSV } = require('./admin');
        await updateUsersCSV();

        // Notify Admin
        await notifyAdmin(
            '🆕 New Signup Request',
            `${name} has signed up as a ${userRole} and is awaiting approval.`,
            user._id,
            'signup_request'
        );

        res.status(202).json({
            message: 'Account created successfully! Admin approval is required before you can log in.',
            role: userRole,
            status: 'pending'
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup' });
    }
});

// POST /api/auth/add-user — Teacher/Student proposes a new user
router.post('/add-user', protect, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'student',
            status: 'pending',
            plainPassword: password
        });

        const { updateUsersCSV } = require('./admin');
        await updateUsersCSV();

        await notifyAdmin(
            '➕ User Proposed',
            `${req.user.name} added a new ${role} (${name}). Approval required.`,
            user._id,
            'signup_request'
        );

        res.status(201).json({ message: 'User added and admin notified. Awaiting approval.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/auth/login — Same as before
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Account pending admin approval' });
        }
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status
    });
});

module.exports = router;
