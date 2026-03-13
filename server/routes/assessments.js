const express = require('express');
const router = express.Router();
const Assessment = require('../models/Assessment');
const { protect } = require('../middleware/auth');
const auth = protect; // Alias for simplicity in route definitions
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');

// Multer config for question file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/questions/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Create uploads directory if not exists
const fs = require('fs');
if (!fs.existsSync('uploads/questions/')) {
    fs.mkdirSync('uploads/questions/', { recursive: true });
}

// AI Question Generation
router.post('/generate-ai', auth, async (req, res) => {
    try {
        const { count, topic } = req.body;
        // Mocking AI response for now. In production, call Gemini/OpenAI here.
        const mockQuestions = Array.from({ length: count || 5 }).map((_, i) => ({
            id: Date.now() + i,
            questionText: `AI Generated Question ${i + 1} about ${topic || 'General Topic'}?`,
            questionType: 'mcq',
            marks: 1,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A'
        }));
        
        res.json(mockQuestions);
    } catch (err) {
        res.status(500).json({ message: 'AI Generation failed' });
    }
});

// Get all assessments for a teacher
router.get('/teacher', auth, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
        const assessments = await Assessment.find({ teacher: req.user.id }).sort({ createdAt: -1 });
        res.json(assessments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new assessment
router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
        
        const { title, description, duration, totalMarks, questions } = req.body;
        
        const newAssessment = new Assessment({
            title,
            description,
            duration,
            totalMarks,
            questions,
            teacher: req.user.id
        });
        
        const saved = await newAssessment.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Publish assessment
router.put('/publish/:id', auth, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.id || req.params.id);
        if (!assessment) return res.status(404).json({ message: 'Not found' });
        if (assessment.teacher.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

        assessment.status = 'published';
        assessment.publishedAt = Date.now();
        await assessment.save();
        res.json(assessment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Publish results for assessment
router.put('/publish-results/:id', auth, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ message: 'Not found' });
        if (assessment.teacher.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

        assessment.status = 'results_published';
        await assessment.save();
        res.json(assessment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Submit assignment/exam (Student)
router.post('/submit/:id', auth, async (req, res) => {
    try {
        const { answers, tabSwitches } = req.body;
        const assessment = await Assessment.findById(req.params.id);
        
        if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
        
        // Check if student already submitted
        const existing = assessment.submissions.find(s => s.student.toString() === req.user.id);
        if (existing) return res.status(400).json({ message: 'Already submitted' });

        assessment.submissions.push({
            student: req.user.id,
            answers,
            submittedAt: Date.now(),
            tabSwitches,
            status: 'submitted'
        });

        await assessment.save();
        res.json({ message: 'Submission successful' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get available assessments for student
router.get('/student', auth, async (req, res) => {
    try {
        const assessments = await Assessment.find({ status: 'published' })
            .select('title description duration totalMarks createdAt status')
            .sort({ createdAt: -1 });
        res.json(assessments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single assessment details for student to start exam
router.get('/student/:id', auth, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment || assessment.status !== 'published') {
            return res.status(404).json({ message: 'Assessment not available' });
        }
        res.json(assessment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
