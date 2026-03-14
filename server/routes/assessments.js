const express = require('express');
const router = express.Router();
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const Notification = require('../models/Notification');
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

// Upload Questions from Excel/CSV
router.post('/upload-questions', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const questions = rows.map((row, i) => {
            const options = [
                row['Option A'] || row.OptionA,
                row['Option B'] || row.OptionB,
                row['Option C'] || row.OptionC,
                row['Option D'] || row.OptionD
            ].filter(Boolean);

            return {
                id: Date.now() + i,
                questionText: row.Question || row.question || 'New Question',
                questionType: (row.Type || row.type || 'mcq').toLowerCase(),
                marks: row.Marks || row.marks || 1,
                options: options,
                correctAnswer: row.Answer || row.answer || ''
            };
        });

        // Cleanup temporary file
        fs.unlinkSync(req.file.path);

        res.json(questions);
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Failed to parse file: ' + err.message });
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
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ message: 'Not found' });
        if (assessment.teacher.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

        assessment.status = 'published';
        assessment.publishedAt = Date.now();
        await assessment.save();

        // Notify all active students
        try {
            const students = await User.find({ role: 'student', status: 'active' });
            const notifications = students.map(s => ({
                user: s._id,
                title: 'New Assessment Available',
                message: `A new assessment "${assessment.title}" has been published. Tap to start.`,
                type: 'assessment',
                relatedId: assessment._id
            }));
            await Notification.insertMany(notifications);
        } catch (notifErr) {
            console.error('Failed to create assessment notifications:', notifErr);
        }

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

        // Notify all students who submitted
        try {
            const submittedStudentIds = assessment.submissions.map(s => s.student);
            const notifications = submittedStudentIds.map(id => ({
                user: id,
                title: 'Assessment Results Published',
                message: `Results for "${assessment.title}" are now available.`,
                type: 'assessment',
                relatedId: assessment._id
            }));
            if (notifications.length) await Notification.insertMany(notifications);
        } catch (notifErr) {
            console.error('Failed to create results notifications:', notifErr);
        }

        res.json(assessment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Submit assignment/exam (Student)
router.post('/submit/:id', auth, async (req, res) => {
    try {
        const { answers, tabSwitches } = req.body;
        const assessment = await Assessment.findById(req.params.id).populate('teacher', 'name');
        
        if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
        
        // Check if student already submitted
        const existing = assessment.submissions.find(s => s.student.toString() === req.user.id);
        if (existing) return res.status(400).json({ message: 'Already submitted' });

        const student = await User.findById(req.user.id).select('name');

        assessment.submissions.push({
            student: req.user.id,
            answers,
            submittedAt: Date.now(),
            tabSwitches,
            status: 'submitted'
        });

        await assessment.save();

        // Notify the teacher
        try {
            await Notification.create({
                user: assessment.teacher._id,
                title: 'New Assessment Submission',
                message: `${student?.name || 'A student'} submitted "${assessment.title}".${ tabSwitches > 0 ? ` (Tab switches: ${tabSwitches})` : ''}`,
                type: 'submission',
                relatedId: assessment._id
            });
        } catch (notifErr) {
            console.error('Failed to create submission notification:', notifErr);
        }

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

// Delete assessment (Teacher only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
        if (assessment.teacher.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
        await Assessment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Assessment deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
