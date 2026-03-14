const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { protect } = require('../middleware/auth');

// GET /api/student/notes — Get all notes for students
router.get('/notes', protect, async (req, res) => {
    try {
        const notes = await Note.find()
            .populate('teacher', 'name')
            .sort({ createdAt: -1 });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
