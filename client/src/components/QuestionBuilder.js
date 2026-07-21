// src/components/QuestionBuilder.js
// Google Forms-style question builder

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  ToggleLeft,
  ToggleRight,
  CheckSquare,
  Circle,
  Type,
  AlignLeft
} from 'lucide-react';

const QuestionBuilder = ({ questions, onChange }) => {
  const [expandedQuestion, setExpandedQuestion] = useState(0);

  const questionTypes = [
    { value: 'mcq', label: 'Multiple Choice', icon: Circle },
    { value: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
    { value: 'short', label: 'Short Answer', icon: Type },
    { value: 'paragraph', label: 'Paragraph', icon: AlignLeft }
  ];

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      type: 'mcq',
      question: '',
      options: ['Option 1', 'Option 2', 'Option 3'],
      correctAnswer: '',
      correctAnswers: [],
      marks: 1,
      required: true,
      shuffleOptions: false
    };
    onChange([...questions, newQuestion]);
    setExpandedQuestion(questions.length);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const deleteQuestion = (index) => {
    if (window.confirm('Delete this question?')) {
      const updated = questions.filter((_, i) => i !== index);
      onChange(updated);
      if (expandedQuestion >= updated.length) {
        setExpandedQuestion(Math.max(0, updated.length - 1));
      }
    }
  };

  const duplicateQuestion = (index) => {
    const duplicated = { ...questions[index], id: Date.now().toString() };
    const updated = [...questions];
    updated.splice(index + 1, 0, duplicated);
    onChange(updated);
    setExpandedQuestion(index + 1);
  };

  const moveQuestion = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }

    const updated = [...questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
    setExpandedQuestion(newIndex);
  };

  const addOption = (questionIndex) => {
    const updated = [...questions];
    const question = updated[questionIndex];
    question.options.push(`Option ${question.options.length + 1}`);
    onChange(updated);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    onChange(updated);
  };

  const deleteOption = (questionIndex, optionIndex) => {
    const updated = [...questions];
    if (updated[questionIndex].options.length > 2) {
      updated[questionIndex].options.splice(optionIndex, 1);
      onChange(updated);
    }
  };

  return (
    <div className="space-y-4">
      {questions.map((question, qIndex) => (
        <div
          key={question.id}
          className={`bg-white dark:bg-slate-800 rounded-lg shadow-md transition-all ${
            expandedQuestion === qIndex ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          {/* Question Header */}
          <div
            className="p-4 cursor-pointer"
            onClick={() => setExpandedQuestion(qIndex)}
          >
            <div className="flex items-start space-x-3">
              <div className="flex items-center space-x-2 mt-2">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {qIndex + 1}
                </span>
              </div>

              <div className="flex-1">
                {expandedQuestion === qIndex ? (
                  <div className="space-y-4">
                    {/* Question Input */}
                    <input
                      type="text"
                      value={question.question}
                      onChange={(e) =>
                        updateQuestion(qIndex, 'question', e.target.value)
                      }
                      placeholder="Question"
                      className="w-full px-3 py-2 border-b-2 border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 text-lg"
                    />

                    {/* Question Type Selector */}
                    <div className="flex items-center space-x-4">
                      <select
                        value={question.type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          const updated = [...questions];
                          updated[qIndex] = {
                            ...updated[qIndex],
                            type: newType
                          };
                          
                          // Reset correct answer fields based on new type
                          if (newType === 'checkbox') {
                            updated[qIndex].correctAnswers = [];
                            updated[qIndex].correctAnswer = '';
                          } else if (newType === 'mcq') {
                            updated[qIndex].correctAnswer = '';
                            updated[qIndex].correctAnswers = [];
                          } else {
                            // For short and paragraph, clear both
                            updated[qIndex].correctAnswer = '';
                            updated[qIndex].correctAnswers = [];
                          }
                          
                          // Ensure options exist for mcq and checkbox
                          if ((newType === 'mcq' || newType === 'checkbox') && 
                              (!updated[qIndex].options || updated[qIndex].options.length === 0)) {
                            updated[qIndex].options = ['Option 1', 'Option 2', 'Option 3'];
                          }
                          
                          onChange(updated);
                        }}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {questionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">
                          Marks:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={question.marks}
                          onChange={(e) =>
                            updateQuestion(
                              qIndex,
                              'marks',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Options (for MCQ and Checkbox) */}
                    {(question.type === 'mcq' || question.type === 'checkbox') && (
                      <div className="space-y-2 mt-4">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center space-x-2">
                            {/* Select correct answer indicator */}
                            {question.type === 'mcq' ? (
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={question.correctAnswer === option}
                                onChange={() =>
                                  updateQuestion(qIndex, 'correctAnswer', option)
                                }
                                className="w-4 h-4 text-blue-600"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={question.correctAnswers?.includes(option)}
                                onChange={(e) => {
                                  const correctAnswers = question.correctAnswers || [];
                                  if (e.target.checked) {
                                    updateQuestion(qIndex, 'correctAnswers', [
                                      ...correctAnswers,
                                      option
                                    ]);
                                  } else {
                                    updateQuestion(
                                      qIndex,
                                      'correctAnswers',
                                      correctAnswers.filter((a) => a !== option)
                                    );
                                  }
                                }}
                                className="w-4 h-4 text-blue-600"
                              />
                            )}

                            <input
                              type="text"
                              value={option}
                              onChange={(e) =>
                                updateOption(qIndex, oIndex, e.target.value)
                              }
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            {question.options.length > 2 && (
                              <button
                                onClick={() => deleteOption(qIndex, oIndex)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          onClick={() => addOption(qIndex)}
                          className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add option</span>
                        </button>

                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {question.type === 'mcq'
                            ? 'Select the radio button for the correct answer'
                            : 'Check all correct answers'}
                        </div>
                      </div>
                    )}

                    {/* Short Answer / Paragraph placeholder */}
                    {(question.type === 'short' || question.type === 'paragraph') && (
                      <div className="mt-4">
                        <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400">
                          {question.type === 'short'
                            ? 'Short answer text'
                            : 'Long answer text'}
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Note: This question requires manual evaluation
                        </p>
                      </div>
                    )}

                    {/* Question Settings */}
                    <div className="flex items-center space-x-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() =>
                          updateQuestion(qIndex, 'required', !question.required)
                        }
                        className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      >
                        {question.required ? (
                          <ToggleRight className="w-5 h-5 text-blue-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                        <span>Required</span>
                      </button>

                      {(question.type === 'mcq' || question.type === 'checkbox') && (
                        <button
                          onClick={() =>
                            updateQuestion(
                              qIndex,
                              'shuffleOptions',
                              !question.shuffleOptions
                            )
                          }
                          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        >
                          {question.shuffleOptions ? (
                            <ToggleRight className="w-5 h-5 text-blue-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                          <span>Shuffle options</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {question.question || 'Untitled Question'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {
                          questionTypes.find((t) => t.value === question.type)
                            ?.label
                        }{' '}
                        • {question.marks} mark(s)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveQuestion(qIndex, 'up');
                  }}
                  disabled={qIndex === 0}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveQuestion(qIndex, 'down');
                  }}
                  disabled={qIndex === questions.length - 1}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateQuestion(qIndex);
                  }}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteQuestion(qIndex);
                  }}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add Question Button */}
      <button
        onClick={addQuestion}
        className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center space-x-2"
      >
        <Plus className="w-5 h-5" />
        <span>Add Question</span>
      </button>
    </div>
  );
};

export default QuestionBuilder;
