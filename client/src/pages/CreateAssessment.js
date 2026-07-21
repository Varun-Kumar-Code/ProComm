// src/pages/CreateAssessment.js
// Page for creating and editing assessments - Premium Design

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Save,
  ArrowLeft,
  Users,
  Clock,
  Calendar,
  Settings,
  FileText,
  X,
  Shield,
  Lock,
  Sparkles,
  Zap,
  ChevronRight,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import QuestionBuilder from '../components/QuestionBuilder';
import {
  createAssessment,
  getAssessment,
  updateAssessment,
  publishAssessment
} from '../firebase/assessmentService';

const CreateAssessment = () => {
  const navigate = useNavigate();
  const { assessmentId } = useParams();
  const { currentUser } = useAuth();
  const isEditMode = !!assessmentId;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // details, questions, settings

  // Assessment data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [allowedParticipants, setAllowedParticipants] = useState([]);
  const [participantInput, setParticipantInput] = useState('');
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [autoStartMeeting, setAutoStartMeeting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkingValue, setNegativeMarkingValue] = useState(0.25);
  const [isProctoredMode, setIsProctoredMode] = useState(true); // Default to true for assessments
  const [maxAttempts, setMaxAttempts] = useState(1);

  useEffect(() => {
    if (isEditMode) {
      fetchAssessment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const fetchAssessment = async () => {
    setIsLoading(true);
    try {
      const data = await getAssessment(assessmentId);
      setTitle(data.title);
      setDescription(data.description || '');
      setDurationMinutes(data.durationMinutes);
      setAllowedParticipants(data.allowedParticipants || []);
      setScheduledStartTime(data.scheduledStartTime || '');
      setAutoStartMeeting(data.autoStartMeeting || false);
      setQuestions(data.questions || []);
      setShuffleQuestions(data.shuffleQuestions || false);
      setShuffleOptions(data.shuffleOptions || false);
      setNegativeMarking(data.negativeMarking || false);
      setNegativeMarkingValue(data.negativeMarkingValue || 0.25);
      setIsProctoredMode(data.isProctoredMode !== undefined ? data.isProctoredMode : true);
      setMaxAttempts(data.maxAttempts || 1);
    } catch (error) {
      console.error('Error fetching assessment:', error);
      alert('Failed to load assessment');
      navigate('/assessments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParticipant = () => {
    const email = participantInput.trim().toLowerCase();
    if (email && !allowedParticipants.includes(email)) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) {
        setAllowedParticipants([...allowedParticipants, email]);
        setParticipantInput('');
      } else {
        alert('Please enter a valid email address');
      }
    }
  };

  const handleRemoveParticipant = (email) => {
    setAllowedParticipants(allowedParticipants.filter((e) => e !== email));
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      const assessmentData = {
        title: title.trim(),
        description: description.trim(),
        durationMinutes,
        allowedParticipants,
        scheduledStartTime: scheduledStartTime || null,
        autoStartMeeting,
        questions,
        shuffleQuestions,
        shuffleOptions,
        negativeMarking,
        negativeMarkingValue,
        isProctoredMode,
        maxAttempts,
        createdBy: currentUser.uid
      };

      if (isEditMode) {
        await updateAssessment(assessmentId, assessmentData);
        alert('Assessment saved successfully!');
      } else {
        const newAssessmentId = await createAssessment(assessmentData);
        alert('Assessment draft created successfully!');
        navigate(`/assessments/edit/${newAssessmentId}`);
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('Failed to save assessment');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    if (allowedParticipants.length === 0) {
      alert('Please add at least one participant');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        alert(`Question ${i + 1} is empty`);
        return;
      }
      if (q.type === 'mcq' && !q.correctAnswer) {
        alert(`Question ${i + 1}: Please select the correct answer`);
        return;
      }
      if (q.type === 'checkbox' && (!q.correctAnswers || q.correctAnswers.length === 0)) {
        alert(`Question ${i + 1}: Please select at least one correct answer`);
        return;
      }
    }

    if (window.confirm('Once published, participants can start taking this assessment. Continue?')) {
      setIsSaving(true);
      try {
        if (isEditMode) {
          await updateAssessment(assessmentId, {
            title: title.trim(),
            description: description.trim(),
            durationMinutes,
            allowedParticipants,
            scheduledStartTime: scheduledStartTime || null,
            autoStartMeeting,
            questions,
            shuffleQuestions,
            shuffleOptions,
            negativeMarking,
            negativeMarkingValue,
            isProctoredMode,
            maxAttempts
          });
          await publishAssessment(assessmentId);
          alert('Assessment published successfully!');
          navigate('/assessments');
        } else {
          const assessmentData = {
            title: title.trim(),
            description: description.trim(),
            durationMinutes,
            allowedParticipants,
            scheduledStartTime: scheduledStartTime || null,
            autoStartMeeting,
            questions,
            shuffleQuestions,
            shuffleOptions,
            isProctoredMode,
            maxAttempts,
            negativeMarking,
            negativeMarkingValue,
            createdBy: currentUser.uid
          };
          const newAssessmentId = await createAssessment(assessmentData);
          await publishAssessment(newAssessmentId);
          alert('Assessment published successfully!');
          navigate('/assessments');
        }
      } catch (error) {
        console.error('Error publishing assessment:', error);
        alert('Failed to publish assessment');
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-slate-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-4 md:py-8">

      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
        {/* Premium Header */}
        <div className="mb-4 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center space-x-3 md:space-x-4">
            <button
              onClick={() => navigate('/assessments')}
              className="p-2.5 md:p-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl text-gray-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all duration-300 shadow-lg border border-white/50 dark:border-slate-700/50"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                  {isEditMode ? 'Edit Assessment' : 'Create Assessment'}
                </h1>
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-amber-500 animate-pulse" />
              </div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 flex items-center space-x-2">
                <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
                <span className="hidden sm:inline">Build your assessment with enterprise-grade proctoring</span>
                <span className="sm:hidden">Enterprise-grade proctoring</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3 w-full sm:w-auto">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="group flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 md:space-x-2 px-3 md:px-5 py-2.5 md:py-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 shadow-lg disabled:opacity-50 font-medium text-sm md:text-base"
            >
              <Save className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:scale-110 transition-transform" />
              <span>Save Draft</span>
            </button>
            <button
              onClick={handlePublish}
              disabled={isSaving}
              className="group flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 md:space-x-2 px-3 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl disabled:opacity-50 font-medium text-sm md:text-base"
            >
              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:scale-110 transition-transform" />
              <span>Publish</span>
              <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:translate-x-0.5 transition-transform hidden sm:block" />
            </button>
          </div>
        </div>

        {/* Premium Tabs */}
        <div className="mb-4 md:mb-8 flex overflow-x-auto p-1 md:p-1.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg border border-white/50 dark:border-slate-700/50 w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('details')}
            className={`relative flex-1 sm:flex-initial px-3 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-semibold rounded-lg md:rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === 'details'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center space-x-1.5 md:space-x-2">
              <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Details</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`relative flex-1 sm:flex-initial px-3 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-semibold rounded-lg md:rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === 'questions'
                ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center space-x-1.5 md:space-x-2">
              <Layers className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Questions</span>
              <span className={`ml-0.5 md:ml-1 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs rounded-full ${
                activeTab === 'questions' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
              }`}>
                {questions.length}
              </span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`relative flex-1 sm:flex-initial px-3 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-semibold rounded-lg md:rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center space-x-1.5 md:space-x-2">
              <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Settings</span>
            </span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'details' && (
          <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-4 md:p-8 space-y-5 md:space-y-8">
            {/* Title */}
            <div>
              <label className="flex items-center space-x-2 text-xs md:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 md:mb-3">
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
                <span>Assessment Title</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a compelling title for your assessment"
                className="w-full px-3 md:px-5 py-3 md:py-4 border border-gray-200 dark:border-slate-600/50 rounded-lg md:rounded-xl bg-white/50 dark:bg-slate-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 placeholder-gray-400 dark:placeholder-slate-500 text-sm md:text-lg"
              />
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center space-x-2 text-xs md:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 md:mb-3">
                <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500" />
                <span>Description</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this assessment covers and any important instructions..."
                rows={3}
                className="w-full px-3 md:px-5 py-3 md:py-4 border border-gray-200 dark:border-slate-600/50 rounded-lg md:rounded-xl bg-white/50 dark:bg-slate-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300 placeholder-gray-400 dark:placeholder-slate-500 text-sm md:text-base resize-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="flex items-center space-x-2 text-xs md:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 md:mb-3">
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
                <span>Duration (minutes)</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 1)}
                  className="w-full px-3 md:px-5 py-3 md:py-4 border border-gray-200 dark:border-slate-600/50 rounded-lg md:rounded-xl bg-white/50 dark:bg-slate-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-300 text-sm md:text-lg font-medium"
                />
                <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 font-medium text-xs md:text-sm">
                  minutes
                </div>
              </div>
            </div>

            {/* Allowed Participants */}
            <div>
              <label className="flex items-center space-x-2 text-xs md:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 md:mb-3">
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                <span>Allowed Participants</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3 md:mb-4">
                <input
                  type="email"
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddParticipant();
                    }
                  }}
                  placeholder="Enter participant email address"
                  className="flex-1 px-3 md:px-5 py-3 md:py-4 border border-gray-200 dark:border-slate-600/50 rounded-lg md:rounded-xl bg-white/50 dark:bg-slate-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-300 placeholder-gray-400 dark:placeholder-slate-500 text-sm md:text-base"
                />
                <button
                  onClick={handleAddParticipant}
                  className="px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-lg md:rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/25 font-semibold text-sm md:text-base"
                >
                  Add
                </button>
              </div>

              {allowedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 md:gap-2 p-3 md:p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg md:rounded-xl border border-emerald-200/50 dark:border-emerald-800/30">
                  {allowedParticipants.map((email) => (
                    <div
                      key={email}
                      className="group flex items-center space-x-1.5 md:space-x-2 px-2.5 md:px-4 py-1.5 md:py-2 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 rounded-full text-xs md:text-sm font-medium shadow-sm border border-emerald-200/50 dark:border-emerald-800/30 hover:shadow-md transition-all duration-300"
                    >
                      <span className="truncate max-w-[150px] md:max-w-none">{email}</span>
                      <button
                        onClick={() => handleRemoveParticipant(email)}
                        className="text-emerald-500 dark:text-emerald-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scheduled Start Time */}
            <div>
              <label className="flex flex-wrap items-center space-x-2 text-xs md:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 md:mb-3">
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-violet-500" />
                <span>Scheduled Start Time</span>
                <span className="text-[10px] md:text-xs text-gray-400 dark:text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="w-full px-3 md:px-5 py-3 md:py-4 border border-gray-200 dark:border-slate-600/50 rounded-lg md:rounded-xl bg-white/50 dark:bg-slate-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-300 text-sm md:text-base"
              />
            </div>

            {/* Auto Start Meeting Toggle */}
            <div className="p-3 md:p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg md:rounded-xl border border-blue-200/50 dark:border-blue-800/30">
              <button
                onClick={() => setAutoStartMeeting(!autoStartMeeting)}
                className="w-full flex items-center justify-between text-gray-700 dark:text-slate-300"
              >
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="p-1.5 md:p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <Zap className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Auto-start proctoring session</p>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 hidden sm:block">
                      Automatically connect to WebRTC proctoring when assessment starts
                    </p>
                  </div>
                </div>
                <div className={`relative w-11 h-6 md:w-14 md:h-8 rounded-full transition-colors duration-300 flex-shrink-0 ${autoStartMeeting ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 md:top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${autoStartMeeting ? 'translate-x-5 md:translate-x-7' : 'translate-x-0.5 md:translate-x-1'}`}></div>
                </div>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div>
            <QuestionBuilder questions={questions} onChange={setQuestions} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-4 md:p-8 space-y-5 md:space-y-8">
            {/* Proctored Mode Section */}
            <div className="pb-5 md:pb-8 border-b border-gray-200/50 dark:border-slate-700/50">
              <div className="flex items-start space-x-3 md:space-x-4 mb-4 md:mb-6">
                <div className="p-2 md:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg md:rounded-xl shadow-lg shadow-blue-500/25">
                  <Shield className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Proctored Assessment Mode
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">
                    Enable secure assessment features with attempt tracking
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center justify-between p-3 md:p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg md:rounded-xl border border-blue-200/50 dark:border-blue-800/30 mb-4 md:mb-6">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <Lock className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                    Enable Proctored Mode
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProctoredMode(!isProctoredMode)}
                  className={`relative inline-flex items-center w-11 h-6 md:w-14 md:h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 flex-shrink-0 ${
                    isProctoredMode ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25' : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                      isProctoredMode ? 'translate-x-6 md:translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Max Attempts Input */}
              {isProctoredMode && (
                <>
                  <div className="mb-4 md:mb-6">
                    <label className="flex items-center space-x-2 text-xs md:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 md:mb-3">
                      <span>Maximum Attempts per Participant</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 md:px-5 py-3 md:py-4 border border-gray-200 dark:border-slate-600/50 rounded-lg md:rounded-xl bg-white/50 dark:bg-slate-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 text-base md:text-lg font-medium"
                    />
                    <p className="mt-2 md:mt-3 text-xs md:text-sm text-gray-500 dark:text-slate-400">
                      Participants will be blocked after reaching this limit.
                    </p>
                  </div>

                  {/* Feature Info */}
                  <div className="p-3 md:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/30 rounded-lg md:rounded-xl">
                    <div className="flex items-center space-x-2 mb-3 md:mb-4">
                      <Shield className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                      <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm md:text-base">
                        Proctored Mode Features
                      </p>
                    </div>
                    <ul className="space-y-1.5 md:space-y-2">
                      {[
                        "Audio/video not shared with others",
                        "Participants cannot enable mic/camera",
                        "Attempt tracking prevents rejoining",
                        "Multiple device login prevention",
                        "Host can view attempt history"
                      ].map((feature, index) => (
                        <li key={index} className="flex items-start space-x-2 text-xs md:text-sm text-blue-700 dark:text-blue-300">
                          <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Shuffle Questions */}
            <div className="p-3 md:p-5 bg-white/50 dark:bg-slate-700/30 rounded-lg md:rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/50 transition-all duration-300">
              <button
                onClick={() => setShuffleQuestions(!shuffleQuestions)}
                className="w-full flex items-center justify-between text-gray-700 dark:text-slate-300"
              >
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className={`p-1.5 md:p-2 rounded-lg transition-colors ${shuffleQuestions ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-slate-600'}`}>
                    <Layers className={`w-4 h-4 md:w-5 md:h-5 ${shuffleQuestions ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-slate-400'}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Shuffle questions</p>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 hidden sm:block">
                      Questions will appear in random order for each participant
                    </p>
                  </div>
                </div>
                <div className={`relative w-11 h-6 md:w-14 md:h-8 rounded-full transition-colors duration-300 flex-shrink-0 ${shuffleQuestions ? 'bg-gradient-to-r from-purple-500 to-violet-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 md:top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${shuffleQuestions ? 'translate-x-5 md:translate-x-7' : 'translate-x-0.5 md:translate-x-1'}`}></div>
                </div>
              </button>
            </div>

            {/* Shuffle Options */}
            <div className="p-3 md:p-5 bg-white/50 dark:bg-slate-700/30 rounded-lg md:rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/50 transition-all duration-300">
              <button
                onClick={() => setShuffleOptions(!shuffleOptions)}
                className="w-full flex items-center justify-between text-gray-700 dark:text-slate-300"
              >
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className={`p-1.5 md:p-2 rounded-lg transition-colors ${shuffleOptions ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-gray-100 dark:bg-slate-600'}`}>
                    <Sparkles className={`w-4 h-4 md:w-5 md:h-5 ${shuffleOptions ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-slate-400'}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Shuffle answer options</p>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 hidden sm:block">
                      Options will appear in random order for MCQ and checkbox questions
                    </p>
                  </div>
                </div>
                <div className={`relative w-11 h-6 md:w-14 md:h-8 rounded-full transition-colors duration-300 flex-shrink-0 ${shuffleOptions ? 'bg-gradient-to-r from-violet-500 to-purple-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 md:top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${shuffleOptions ? 'translate-x-5 md:translate-x-7' : 'translate-x-0.5 md:translate-x-1'}`}></div>
                </div>
              </button>
            </div>

            {/* Negative Marking */}
            <div className="pt-5 md:pt-8 border-t border-gray-200/50 dark:border-slate-700/50">
              <div className="p-3 md:p-5 bg-white/50 dark:bg-slate-700/30 rounded-lg md:rounded-xl">
                <button
                  onClick={() => setNegativeMarking(!negativeMarking)}
                  className="w-full flex items-center justify-between text-gray-700 dark:text-slate-300 mb-3 md:mb-4"
                >
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className={`p-1.5 md:p-2 rounded-lg transition-colors ${negativeMarking ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-slate-600'}`}>
                      <Zap className={`w-4 h-4 md:w-5 md:h-5 ${negativeMarking ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Negative marking</p>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 hidden sm:block">
                        Deduct marks for incorrect answers
                      </p>
                    </div>
                  </div>
                  <div className={`relative w-11 h-6 md:w-14 md:h-8 rounded-full transition-colors duration-300 flex-shrink-0 ${negativeMarking ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                    <div className={`absolute top-0.5 md:top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${negativeMarking ? 'translate-x-5 md:translate-x-7' : 'translate-x-0.5 md:translate-x-1'}`}></div>
                  </div>
                </button>

                {negativeMarking && (
                  <div className="ml-8 md:ml-14 mt-3 md:mt-4">
                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 md:mb-2">
                      Marks to deduct per wrong answer
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={negativeMarkingValue}
                      onChange={(e) => setNegativeMarkingValue(parseFloat(e.target.value) || 0)}
                      className="w-full sm:w-40 px-3 md:px-4 py-2.5 md:py-3 border border-gray-200 dark:border-slate-600/50 rounded-lg md:rounded-xl bg-white/50 dark:bg-slate-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-300 font-medium text-sm md:text-base"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copyright Footer - Desktop Only */}
      <div className="hidden md:block mt-12 pt-8 pb-4">
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          © 2026 ProComm. All rights reserved. · <Link to="/privacy" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Privacy</Link> · <Link to="/cookies" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Cookies</Link>
        </p>
      </div>
    </div>
  );
};

export default CreateAssessment;
