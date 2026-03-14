const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    questionType: { 
        type: String, 
        enum: ['mcq', 'short', 'descriptive'], 
        required: true 
    },
    marks: { type: Number, required: true },
    options: [String], // Only for MCQ
    correctAnswer: String, // For auto-grading MCQs
    aiGenerated: { type: Boolean, default: false }
});

const SubmissionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: [{
        questionId: mongoose.Schema.Types.ObjectId,
        answerText: String,
        marksObtained: Number,
        isGraded: { type: Boolean, default: false }
    }],
    startedAt: Date,
    submittedAt: Date,
    tabSwitches: { type: Number, default: 0 },
    status: { type: String, enum: ['started', 'submitted', 'graded'], default: 'started' }
});

const AssessmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    duration: { type: Number, required: true }, // in minutes
    totalMarks: { type: Number, required: true },
    questions: [QuestionSchema],
    submissions: [SubmissionSchema],
    status: { type: String, enum: ['draft', 'published', 'closed', 'results_published'], default: 'draft' },
    course: { type: String, default: 'General' },
    createdAt: { type: Date, default: Date.now },
    publishedAt: Date
});

module.exports = mongoose.model('Assessment', AssessmentSchema);
