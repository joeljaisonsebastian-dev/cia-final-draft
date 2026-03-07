const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// CSV helper — regenerates the CSV file from all students and teachers in the DB
const updateUsersCSV = async () => {
    try {
        const createCsvWriter = require('csv-writer').createObjectCsvWriter;
        // Save to the very top root directory as requested length unencrypted
        const csvPath = path.join(__dirname, '..', '..', 'users_credentials.csv');

        const csvWriter = createCsvWriter({
            path: csvPath,
            header: [
                { id: 'name', title: 'Name' },
                { id: 'email', title: 'Email' },
                { id: 'role', title: 'Role' },
                { id: 'status', title: 'Status' },
                { id: 'password', title: 'Password' },
                { id: 'createdAt', title: 'DateAdded' }
            ]
        });

        // Get both students and teachers
        const users = await User.find({ role: { $in: ['student', 'teacher'] } }).select('name email role status plainPassword createdAt +plainPassword');
        const records = users.map(u => ({
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            password: u.plainPassword || '(hidden)',
            createdAt: u.createdAt ? u.createdAt.toISOString().split('T')[0] : ''
        }));

        await csvWriter.writeRecords(records);
        console.log('✅ users_credentials.csv updated at root');
    } catch (error) {
        console.error('CSV update error:', error);
    }
};

// Make sure to export the function for auth.js to call
module.exports.updateUsersCSV = updateUsersCSV;

// POST /api/admin/login — Admin login with hardcoded credentials
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (username === 'admin' && password === 'pass') {
            // Find admin user in DB
            let adminUser = await User.findOne({ role: 'admin' });
            if (!adminUser) {
                return res.status(500).json({ message: 'Admin user not found in database' });
            }

            const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.json({
                _id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                role: adminUser.role,
                token
            });
        }

        return res.status(401).json({ message: 'Invalid admin credentials' });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/students — List all students
router.get('/students', protect, authorize('admin'), async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        res.json(students);
    } catch (error) {
        console.error('List students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/pending — List all pending signups
router.get('/pending', protect, authorize('admin'), async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: 'pending' }).select('-password');
        res.json(pendingUsers);
    } catch (error) {
        console.error('List pending users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/approve/:id — Approve a pending user
router.put('/approve/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.status !== 'pending') {
            return res.status(404).json({ message: 'Pending user not found' });
        }

        user.status = 'active';
        await user.save();
        await updateUsersCSV();

        res.json({ message: 'User approved successfully' });
    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/reject/:id — Reject a pending user
router.delete('/reject/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.status !== 'pending') {
            return res.status(404).json({ message: 'Pending user not found' });
        }

        await User.findByIdAndDelete(req.params.id);
        await updateUsersCSV();

        res.json({ message: 'User rejected successfully' });
    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/students — Add a new student directly (active by default)
router.post('/students', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Auto-generate a password
        const plainPassword = Math.random().toString(36).slice(-8);

        const student = new User({
            name,
            email,
            password: plainPassword,
            role: 'student',
            status: 'active',
            plainPassword // Store plain password for CSV
        });

        await student.save();
        await updateUsersCSV();

        res.status(201).json({
            _id: student._id,
            name: student.name,
            email: student.email,
            role: student.role,
            status: student.status,
            generatedPassword: plainPassword,
            createdAt: student.createdAt
        });
    } catch (error) {
        console.error('Add student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/students/:id — Update a student
router.put('/students/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, email } = req.body;
        const student = await User.findById(req.params.id);

        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (name) student.name = name;
        if (email) student.email = email;

        await student.save();
        await updateUsersCSV();

        res.json({
            _id: student._id,
            name: student.name,
            email: student.email,
            role: student.role
        });
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/students/:id — Remove a student
router.delete('/students/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const student = await User.findById(req.params.id);

        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        await User.findByIdAndDelete(req.params.id);
        await updateUsersCSV();

        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/students/csv — Download users CSV
router.get('/students/csv', protect, authorize('admin'), async (req, res) => {
    try {
        await updateUsersCSV(); // Ensure it's up to date

        const csvPath = path.join(__dirname, '..', '..', 'users_credentials.csv');
        if (!fs.existsSync(csvPath)) {
            return res.status(404).json({ message: 'CSV file not found' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users_credentials.csv"');
        res.sendFile(csvPath);
    } catch (error) {
        console.error('CSV download error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
