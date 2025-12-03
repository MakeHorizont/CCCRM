
import React, { useState } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { KnowledgeBaseQuiz } from '../../types';

interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    quiz: KnowledgeBaseQuiz;
    onComplete: (score: number, passed: boolean) => Promise<void>;
    isLoading: boolean;
}

const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose, quiz, onComplete, isLoading }) => {
    const [userAnswers, setUserAnswers] = useState<number[]>(new Array(quiz.questions.length).fill(-1));
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);
    const [passed, setPassed] = useState(false);

    const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
        if (showResults) return;
        const newAnswers = [...userAnswers];
        newAnswers[questionIndex] = optionIndex;
        setUserAnswers(newAnswers);
    };

    const handleSubmit = () => {
        if (userAnswers.some(a => a === -1)) {
            alert("Пожалуйста, ответьте на все вопросы.");
            return;
        }

        let correctCount = 0;
        quiz.questions.forEach((q, idx) => {
            if (userAnswers[idx] === q.correctOptionIndex) {
                correctCount++;
            }
        });

        const calculatedScore = Math.round((correctCount / quiz.questions.length) * 100);
        const isPassed = calculatedScore >= quiz.passingScorePercent;

        setScore(calculatedScore);
        setPassed(isPassed);
        setShowResults(true);
    };
    
    const handleFinish = () => {
        onComplete(score, passed);
    };

    return (
        <Modal isOpen={isOpen} onClose={() => !isLoading && onClose()} title={`Тест: ${quiz.title}`} size="lg">
            <div className="space-y-6 p-2 max-h-[70vh] overflow-y-auto custom-scrollbar-thin">
                {!showResults ? (
                    <>
                        {quiz.questions.map((q, idx) => (
                            <div key={q.id} className="space-y-2 border-b border-brand-border pb-4 last:border-0">
                                <p className="font-medium text-brand-text-primary">{idx + 1}. {q.text}</p>
                                <div className="space-y-1">
                                    {q.options.map((opt, optIdx) => (
                                        <label key={optIdx} className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${userAnswers[idx] === optIdx ? 'bg-brand-secondary ring-1 ring-brand-primary' : 'hover:bg-brand-surface'}`}>
                                            <input 
                                                type="radio" 
                                                name={`question-${q.id}`} 
                                                checked={userAnswers[idx] === optIdx}
                                                onChange={() => handleAnswerSelect(idx, optIdx)}
                                                className="mr-3 h-4 w-4 text-brand-primary focus:ring-brand-primary"
                                            />
                                            <span className="text-sm text-brand-text-primary">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleSubmit}>Завершить тестирование</Button>
                        </div>
                    </>
                ) : (
                    <div className="text-center space-y-6 py-4">
                        <div>
                            <h3 className="text-2xl font-bold mb-2">{passed ? 'Тест сдан! 🎉' : 'Тест не сдан 😕'}</h3>
                            <p className={`text-lg ${passed ? 'text-emerald-500' : 'text-red-500'}`}>
                                Ваш результат: {score}% (Проходной: {quiz.passingScorePercent}%)
                            </p>
                        </div>
                        
                        <div className="text-left bg-brand-surface p-4 rounded-lg border border-brand-border">
                            <h4 className="font-semibold mb-2">Детализация:</h4>
                             <ul className="space-y-2 text-sm">
                                {quiz.questions.map((q, idx) => (
                                    <li key={q.id} className={userAnswers[idx] === q.correctOptionIndex ? 'text-emerald-600' : 'text-red-500'}>
                                        {idx + 1}. {q.text} — {userAnswers[idx] === q.correctOptionIndex ? 'Верно' : `Ошибка (Правильно: ${q.options[q.correctOptionIndex]})`}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex justify-center">
                            <Button onClick={handleFinish} isLoading={isLoading} variant={passed ? 'primary' : 'secondary'}>
                                {passed ? 'Сохранить результат' : 'Закрыть'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default QuizModal;
