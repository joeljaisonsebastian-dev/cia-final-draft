import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertCircle, Save, ChevronRight, ChevronLeft } from 'lucide-react';

const TakeAssessment = ({ assessment, onComplete, onCancel }) => {
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(assessment.duration * 60);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const timerRef = useRef(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        // Timer logic
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Anti-cheat: Tab switching detection
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitches(prev => prev + 1);
                alert('Warning: Tab switching is tracked. Switching tabs may lead to disqualification.');
            }
        };

        const handleBlur = () => {
            setTabSwitches(prev => prev + 1);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            clearInterval(timerRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswerChange = (qId, value) => {
        setAnswers({ ...answers, [qId]: value });
    };

    const handleSubmit = async () => {
        if (!window.confirm('Are you sure you want to submit?')) return;
        
        const formattedAnswers = Object.keys(answers).map(qId => ({
            questionId: qId,
            answerText: answers[qId]
        }));

        onComplete({ 
            answers: formattedAnswers, 
            tabSwitches,
            timeSpent: (assessment.duration * 60) - timeLeft
        });
    };

    const currentQuestion = assessment.questions[currentIndex];

    return (
        <div className="exam-overlay">
            <div className="exam-container">
                <header className="exam-header">
                    <div className="exam-info">
                        <h2>{assessment.title}</h2>
                        <div className="timer">
                            <Clock size={20} />
                            <span className={timeLeft < 300 ? 'urgent' : ''}>{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                    <div className="proctor-info">
                        <AlertCircle size={18} color="#ef4444" />
                        <span>Tab Switches: {tabSwitches}</span>
                    </div>
                </header>

                <div className="exam-body">
                    <div className="question-nav">
                        <h3>Questions</h3>
                        <div className="q-grid">
                            {assessment.questions.map((_, i) => (
                                <button 
                                    key={i} 
                                    className={`q-nav-btn ${currentIndex === i ? 'active' : ''} ${answers[assessment.questions[i]._id] ? 'answered' : ''}`}
                                    onClick={() => setCurrentIndex(i)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="question-content">
                        <div className="q-head">
                            <span>Question {currentIndex + 1} of {assessment.questions.length}</span>
                            <span className="q-marks">{currentQuestion.marks} Mark(s)</span>
                        </div>
                        
                        <div className="q-text">
                            {currentQuestion.questionText}
                        </div>

                        {currentQuestion.questionType === 'mcq' ? (
                            <div className="options-list">
                                {currentQuestion.options.map((opt, i) => (
                                    <label key={i} className="option-label">
                                        <input 
                                            type="radio" 
                                            name={`q-${currentQuestion._id}`}
                                            checked={answers[currentQuestion._id] === opt}
                                            onChange={() => handleAnswerChange(currentQuestion._id, opt)}
                                        />
                                        <span className="opt-text">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <textarea 
                                className="answer-area"
                                placeholder="Type your answer here..."
                                value={answers[currentQuestion._id] || ''}
                                onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                            />
                        )}

                        <div className="q-footer">
                            <button 
                                disabled={currentIndex === 0}
                                onClick={() => setCurrentIndex(prev => prev - 1)}
                            >
                                <ChevronLeft /> Previous
                            </button>
                            {currentIndex === assessment.questions.length - 1 ? (
                                <button className="submit-btn" onClick={handleSubmit}>
                                    Submit Exam <Save size={18} />
                                </button>
                            ) : (
                                <button onClick={() => setCurrentIndex(prev => prev + 1)}>
                                    Next <ChevronRight />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TakeAssessment;
