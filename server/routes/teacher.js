const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Note = require('../models/Note');

// GET /api/teacher/students - Get all students for teacher view
router.get('/students', protect, authorize('teacher'), async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/teacher/notes — Create a note and notify students
router.post('/notes', protect, authorize('teacher'), async (req, res) => {
    try {
        const { title, content, course } = req.body;
        const note = await Note.create({
            title,
            content,
            course,
            teacher: req.user._id
        });

        // Notify students
        const students = await User.find({ role: 'student', status: 'active' });
        const notifications = students.map(s => ({
            user: s._id,
            title: '📜 New Study Note',
            message: `${req.user.name} posted a new note: "${title}"`,
            type: 'note',
            relatedId: note._id
        }));
        if (notifications.length) await Notification.insertMany(notifications);

        res.status(201).json(note);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/teacher/notes — Get notes created by this teacher
router.get('/notes', protect, authorize('teacher'), async (req, res) => {
    try {
        const notes = await Note.find({ teacher: req.user._id }).sort({ createdAt: -1 });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
