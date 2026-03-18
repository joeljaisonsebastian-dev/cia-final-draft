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
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            console.warn('AI Generation requested but no API key provided. Using mock data.');
            // Mocking AI response
            const mockQuestions = Array.from({ length: count || 5 }).map((_, i) => ({
                id: Date.now() + i,
                questionText: `[MOCK] AI Question ${i + 1} about ${topic || 'General Topic'}?`,
                questionType: 'mcq',
                marks: 1,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A'
            }));
            return res.json(mockQuestions);
        }

        // Real AI generation using Google Gemini API
        const prompt = `Generate ${count || 5} multiple choice questions about ${topic || 'general knowledge'}. 

Return ONLY a valid JSON array with this exact structure:
[
  {
    "questionText": "What is the capital of France?",
    "questionType": "mcq",
    "marks": 1,
    "options": ["Paris", "London", "Berlin", "Madrid"],
    "correctAnswer": "Paris"
  }
]

Requirements:
- Each question must have exactly 4 options
- One option must be the correct answer
- Make questions educational and appropriate
- Return ONLY the JSON array, no additional text or explanation`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 4096,
                }
            })
        });

        if (!response.ok) {
            console.error(`Gemini API error: ${response.status} ${response.statusText}`);
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Invalid Gemini API response:', data);
            throw new Error('Invalid response from Gemini API');
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        console.log('Gemini raw response:', generatedText);
        
        // Try to parse the JSON response
        let questions;
        try {
            // Clean the response text to extract JSON
            const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                questions = JSON.parse(jsonMatch[0]);
            } else {
                // Try parsing the entire response as JSON
                questions = JSON.parse(generatedText.trim());
            }
            
            // Validate the structure
            if (!Array.isArray(questions)) {
                throw new Error('Response is not an array');
            }
            
            // Ensure each question has the required fields
            questions = questions.map(q => ({
                questionText: q.questionText || 'Question text missing',
                questionType: q.questionType || 'mcq',
                marks: q.marks || 1,
                options: Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'],
                correctAnswer: q.correctAnswer || q.options[0] || 'A',
                aiGenerated: true
            }));
            
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            console.log('Raw response:', generatedText);
            // Fallback to mock data
            questions = Array.from({ length: count || 5 }).map((_, i) => ({
                questionText: `AI Generated Question ${i + 1} about ${topic || 'General Topic'}?`,
                questionType: 'mcq',
                marks: 1,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A',
                aiGenerated: true
            }));
        }

        res.json(questions);
    } catch (err) {
        console.error('AI Generation error:', err);
        res.status(500).json({ message: 'AI Generation failed: ' + err.message });
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

// Get all assessments (Teacher sees theirs, Admin sees all)
router.get('/teacher', auth, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'teacher') {
            query = { teacher: req.user.id };
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const assessments = await Assessment.find(query)
            .populate('teacher', 'name')
            .sort({ createdAt: -1 });
        res.json(assessments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new assessment
router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
        
        const { title, description, duration, totalMarks, questions, course } = req.body;
        
        // Clean questions - remove client-side IDs and ensure proper structure
        const cleanedQuestions = questions.map(q => ({
            questionText: q.questionText,
            questionType: q.questionType,
            marks: q.marks,
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            aiGenerated: q.aiGenerated || false
        }));
        
        const newAssessment = new Assessment({
            title,
            description,
            duration,
            totalMarks,
            questions: cleanedQuestions,
            course: course || 'General',
            teacher: req.user.id
        });
        
        const saved = await newAssessment.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error('Assessment creation error:', err);
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

        // Update student academic records in User model
        const courseMapping = {
            'Python': 'python',
            'Data Structures': 'dataStructures',
            'DBMS': 'dbms',
            'Web Development': 'webDev',
            'Computer Networks': 'networks'
        };

        const field = courseMapping[assessment.course];
        
        if (field) {
            for (const sub of assessment.submissions) {
                // Calculate total marks for this student
                const totalMarksObtained = sub.answers.reduce((acc, ans) => acc + (ans.marksObtained || 0), 0);
                
                await User.findByIdAndUpdate(sub.student, {
                    [`academicData.${field}.marks`]: totalMarksObtained
                });
            }
            // Trigger CSV update since marks changed
            const { updateUsersCSV } = require('./admin');
            await updateUsersCSV();
        }

        // Notify all students who submitted
        try {
            const submittedStudentIds = assessment.submissions.map(s => s.student);
            const notifications = submittedStudentIds.map(id => ({
                user: id,
                title: 'Assessment Results Published',
                message: `Results for "${assessment.title}" are now available. Your profile has been updated.`,
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

// Delete assessment (Teacher who owns it, or Admin)
router.delete('/:id', auth, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
        const isOwner = assessment.teacher.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Unauthorized' });
        await Assessment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Assessment deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Notify teacher of a tab switch during an assessment (Student)
router.post('/tab-switch/:id', auth, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id).populate('teacher', 'name');
        if (!assessment) return res.status(404).json({ message: 'Assessment not found' });

        const student = await User.findById(req.user.id).select('name');

        await Notification.create({
            user: assessment.teacher._id,
            title: '⚠️ Tab Switch Detected',
            message: `${student?.name || 'A student'} switched tabs during "${assessment.title}".`,
            type: 'tab-switch',
            relatedId: assessment._id
        });

        res.json({ message: 'Notified' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Notify teacher when student switches tabs (Anti-cheat)
router.post('/tab-switch/:id', auth, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ message: 'Assessment not found' });

        // Update student's submission switch count
        let submission = assessment.submissions.find(s => s.student.toString() === req.user.id);
        if (submission) {
            submission.tabSwitches = (submission.tabSwitches || 0) + 1;
            await assessment.save();
        }

        // Notify teacher
        await Notification.create({
            user: assessment.teacher,
            title: '⚠️ Tab Switch Detected',
            message: `Student "${req.user.name}" switched tabs during assessment "${assessment.title}". Total switches: ${submission ? submission.tabSwitches : 1}`,
            type: 'submission'
        });

        res.json({ message: 'Tab switch recorded' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
