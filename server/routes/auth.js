const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/signup — Register a new student or teacher
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password' });
        }

        // Only allow student or teacher signup (admin is seeded)
        const allowedRoles = ['student', 'teacher'];
        const userRole = allowedRoles.includes(role) ? role : 'student';

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // As requested, students are pending upon signup and must be approved.
        // Teachers will be active instantly.
        const status = userRole === 'student' ? 'pending' : 'active';

        const user = await User.create({
            name,
            email,
            password,
            role: userRole,
            status,
            plainPassword: password
        });

        // Update the master CSV at root
        const { updateUsersCSV } = require('./admin');
        await updateUsersCSV();

        if (status === 'pending') {
            return res.status(202).json({
                message: 'Account created successfully! Admin approval is required before you can log in.',
                role: userRole,
                status: 'pending'
            });
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup' });
    }
});

// POST /api/auth/login — Login with email & password
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Your account is pending admin approval' });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// GET /api/auth/me — Get current user from token
router.get('/me', protect, async (req, res) => {
    res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
    });
});

module.exports = router;
