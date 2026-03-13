const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// GET /api/teacher/students - Get all students for teacher view
router.get('/students', protect, authorize('teacher'), async (req, res) => {
    try {
        console.log(`Teacher ${req.user.email} fetching students...`);
        const students = await User.find({ role: 'student' }).select('-password');
        console.log(`Found ${students.length} students.`);
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
