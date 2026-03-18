import React, { useState } from 'react';
import { X, Plus, Trash2, Save, FileUp, Sparkles } from 'lucide-react';

const CreateAssessment = ({ onSave, onCancel }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(60);
    const [totalMarks, setTotalMarks] = useState(0);
    const [course, setCourse] = useState('Python');
    const [questions, setQuestions] = useState([]);
    const [showAIDialog, setShowAIDialog] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [aiCount, setAiCount] = useState(5);
    const [aiTopic, setAiTopic] = useState('');
    const [generatingAI, setGeneratingAI] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleGenerateAI = async () => {
        setGeneratingAI(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/assessments/generate-ai', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ count: aiCount, topic: aiTopic })
            });
            const data = await res.json();
            // Add IDs to AI-generated questions if they don't have them
            const questionsWithIds = data.map(q => ({
                id: q.id || Date.now() + Math.random(),
                ...q
            }));
            setQuestions([...questions, ...questionsWithIds]);
            setShowAIDialog(false);
        } catch (err) {
            alert('AI Generation failed');
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/assessments/upload-questions', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setQuestions([...questions, ...data]);
                alert('Questions uploaded successfully!');
            } else {
                throw new Error(data.message || 'Upload failed');
            }
        } catch (err) {
            alert('File upload failed: ' + err.message);
        }
    };

    const addQuestion = (type = 'mcq') => {
        const newQ = {
            id: Date.now(),
            questionText: '',
            questionType: type,
            marks: type === 'mcq' ? 1 : (type === 'short' ? 2 : 5),
            options: type === 'mcq' ? ['', '', '', ''] : [],
            correctAnswer: ''
        };
        setQuestions([...questions, newQ]);
        setShowAddMenu(false);
    };

    const removeQuestion = (id) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const updateQuestion = (id, field, value) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateOption = (qId, optIndex, value) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                const newOpts = [...q.options];
                newOpts[optIndex] = value;
                return { ...q, options: newOpts };
            }
            return q;
        }));
    };

    const handleSave = () => {
        if (!title || questions.length === 0) {
            alert('Please add a title and at least one question.');
            return;
        }
        const total = questions.reduce((sum, q) => sum + Number(q.marks), 0);
        onSave({ title, description, duration, totalMarks: total, questions, course });
    };

    return (
        <div className="create-assessment-overlay">
            <div className="create-assessment-modal">
                <header className="modal-header">
                    <h2>Create New Assessment</h2>
                    <button className="close-btn" onClick={onCancel}><X /></button>
                </header>

                <div className="modal-body">
                    <div className="form-grid">
                        <div className="input-group">
                            <label>Assessment Title</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Final Semester Exam" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label>Duration (Minutes)</label>
                            <input 
                                type="number" 
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                min="1"
                            />
                        </div>
                        <div className="input-group">
                            <label>Course</label>
                            <select value={course} onChange={(e) => setCourse(e.target.value)} className="modal-select">
                                <option value="Python">Python</option>
                                <option value="Data Structures">Data Structures</option>
                                <option value="DBMS">DBMS</option>
                                <option value="Web Development">Web Development</option>
                                <option value="Computer Networks">Computer Networks</option>
                                <option value="General">General</option>
                            </select>
                        </div>
                    </div>

                    <div className="questions-section">
                        <div className="section-header">
                            <h3>Questions ({questions.length})</h3>
                            <div className="action-buttons">
                                <button className="ai-btn" onClick={() => setShowAIDialog(true)}>
                                    <Sparkles size={16} /> AI Generate
                                </button>
                                <button className="file-btn" onClick={() => fileInputRef.current.click()}>
                                    <FileUp size={16} /> Upload File
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    style={{ display: 'none' }} 
                                    onChange={handleFileUpload}
                                    accept=".xlsx,.xls,.docx"
                                />
                                <div className="add-dropdown">
                                    <button className="add-btn" onClick={() => setShowAddMenu(!showAddMenu)}>
                                        <Plus size={16} /> Add Question
                                    </button>
                                    {showAddMenu && (
                                        <div className="dropdown-menu open">
                                            <button onClick={() => addQuestion('mcq')}>MCQ</button>
                                            <button onClick={() => addQuestion('short')}>Short Answer (1-2 Mark)</button>
                                            <button onClick={() => addQuestion('descriptive')}>Descriptive (5-10 Mark)</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="questions-list">
                            {questions.map((q, index) => (
                                <div key={q.id} className="question-card">
                                    <div className="q-header">
                                        <span>Question {index + 1}</span>
                                        <div className="q-meta">
                                            <select 
                                                className="asmt-select"
                                                value={q.marks} 
                                                onChange={(e) => updateQuestion(q.id, 'marks', e.target.value)}
                                            >
                                                <option value="1">1 Mark</option>
                                                <option value="2">2 Marks</option>
                                                <option value="4">4 Marks</option>
                                                <option value="5">5 Marks</option>
                                                <option value="8">8 Marks</option>
                                                <option value="10">10 Marks</option>
                                            </select>
                                            <button className="delete-q" onClick={() => removeQuestion(q.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <textarea 
                                        placeholder="Enter your question here..."
                                        value={q.questionText}
                                        onChange={(e) => updateQuestion(q.id, 'questionText', e.target.value)}
                                    />
                                    
                                    {q.questionType === 'mcq' && (
                                        <div className="options-grid">
                                            {q.options.map((opt, i) => (
                                                <div key={i} className="option-input">
                                                    <input 
                                                        type="radio" 
                                                        name={`correct-${q.id}`}
                                                        checked={q.correctAnswer === opt}
                                                        onChange={() => updateQuestion(q.id, 'correctAnswer', opt)}
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder={`Option ${i + 1}`}
                                                        value={opt}
                                                        onChange={(e) => updateOption(q.id, i, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="modal-footer">
                    <button className="cancel-btn" onClick={onCancel}>Cancel</button>
                    <button className="save-btn" onClick={handleSave}>
                        <Save size={18} /> Save Assessment
                    </button>
                </footer>
            </div>

            {showAIDialog && (
                <div className="ai-dialog-overlay">
                    <div className="ai-dialog">
                        <h3>AI Question Generator</h3>
                        <p>Generate smart questions using artificial intelligence.</p>
                        <div className="ai-options">
                            <label>Topic / Subject</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Quantum Physics, Basic Math..."
                                value={aiTopic}
                                onChange={(e) => setAiTopic(e.target.value)}
                            />
                            <label>How many questions?</label>
                            <input 
                                type="number" 
                                value={aiCount} 
                                onChange={(e) => setAiCount(e.target.value)}
                                min="1" max="20"
                            />
                        </div>
                        <div className="ai-actions">
                            <button className="secondary" onClick={() => setShowAIDialog(false)}>Cancel</button>
                            <button className="primary" onClick={handleGenerateAI} disabled={generatingAI}>
                                {generatingAI ? 'Generating...' : 'Generate Questions'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateAssessment;
