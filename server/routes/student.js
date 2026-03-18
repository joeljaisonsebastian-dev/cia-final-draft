const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const Assessment = require('../models/Assessment');
const AssessmentRequest = require('../models/AssessmentRequest');
const Notification = require('../models/Notification');
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

// GET /api/student/my-assessments — All assessments the student has submitted or that are published
router.get('/my-assessments', protect, async (req, res) => {
    try {
        const studentId = req.user._id.toString();

        // Get all published or results_published assessments
        const assessments = await Assessment.find({
            status: { $in: ['published', 'closed', 'results_published'] }
        })
            .populate('teacher', 'name')
            .sort({ createdAt: -1 });

        // Map with student's own submission embedded
        const result = assessments.map(asmt => {
            const asmtObj = asmt.toObject();
            const sub = asmt.submissions.find(s => s.student.toString() === studentId);
            asmtObj.mySubmission = sub || null;
            // Hide other students' submissions
            delete asmtObj.submissions;
            return asmtObj;
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/student/my-requests — Get all assessment requests by this student
router.get('/my-requests', protect, async (req, res) => {
    try {
        const requests = await AssessmentRequest.find({ student: req.user._id })
            .populate('assessment', 'title course')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/student/request — Submit a re-evaluation or re-attempt request
router.post('/request', protect, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can submit requests' });
        }
        const { assessmentId, type, reason } = req.body;
        if (!assessmentId || !type || !reason) {
            return res.status(400).json({ message: 'assessmentId, type, and reason are required' });
        }
        if (!['re-evaluation', 're-attempt'].includes(type)) {
            return res.status(400).json({ message: 'type must be re-evaluation or re-attempt' });
        }

        // Check assessment exists
        const assessment = await Assessment.findById(assessmentId).populate('teacher', '_id name');
        if (!assessment) return res.status(404).json({ message: 'Assessment not found' });

        // Check no duplicate pending request
        const existing = await AssessmentRequest.findOne({
            student: req.user._id,
            assessment: assessmentId,
            type,
            status: 'pending'
        });
        if (existing) {
            return res.status(400).json({ message: 'You already have a pending request of this type for this assessment.' });
        }

        const request = await AssessmentRequest.create({
            student: req.user._id,
            assessment: assessmentId,
            type,
            reason
        });

        // Notify the teacher who owns the assessment
        try {
            await Notification.create({
                user: assessment.teacher._id,
                title: type === 're-evaluation' ? '📋 Re-Evaluation Request' : '🔄 Re-Attempt Request',
                message: `${req.user.name} requested a ${type} for "${assessment.title}". Reason: ${reason}`,
                type: 'system',
                relatedId: request._id
            });
        } catch (e) {
            console.error('Notification error:', e);
        }

        res.status(201).json({ message: 'Request submitted successfully', request });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

