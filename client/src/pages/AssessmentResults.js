// src/pages/AssessmentResults.js
// Results page after assessment submission - Premium Design

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
  Trophy,
  TrendingUp,
  Sparkles,
  Award,
  Target,
  Star,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAttempt, getAssessment } from '../firebase/assessmentService';

const AssessmentResults = () => {
  const { assessmentId, attemptId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [assessment, setAssessment] = useState(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, attemptId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const attemptData = await getAttempt(attemptId);
      const assessmentData = await getAssessment(assessmentId);

      // Verify user owns this attempt
      if (attemptData.userId !== currentUser.uid) {
        alert('You do not have permission to view this result');
        navigate('/assessments');
        return;
      }

      setAttempt(attemptData);
      setAssessment(assessmentData);
    } catch (error) {
      console.error('Error fetching results:', error);
      alert('Failed to load results');
      navigate('/assessments');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const startDate = start.toDate ? start.toDate() : new Date(start);
    const endDate = end.toDate ? end.toDate() : new Date(end);
    const durationMs = endDate - startDate;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const totalMarks = assessment?.questions?.reduce(
    (sum, q) => sum + (q.marks || 1),
    0
  ) || 0;
  const percentage = totalMarks > 0 ? ((attempt?.score || 0) / totalMarks) * 100 : 0;

  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-600' };
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-600' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-600' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  const { grade, color } = getGrade(percentage);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-slate-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Loading your results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-4 md:py-8">

      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-5 md:mb-8">
          <button
            onClick={() => navigate('/assessments')}
            className="mb-4 md:mb-6 flex items-center space-x-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm md:text-base">Back to Dashboard</span>
          </button>

          <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg md:rounded-xl shadow-lg shadow-amber-500/25">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-amber-800 to-yellow-900 dark:from-white dark:via-amber-200 dark:to-yellow-200 bg-clip-text text-transparent">
                Assessment Results
              </h1>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-amber-500 animate-pulse hidden sm:block" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm md:text-lg">{assessment?.title}</p>
        </div>

        {/* Success Message */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl md:rounded-2xl p-4 md:p-6 mb-5 md:mb-8">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="p-2 md:p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg md:rounded-xl shadow-lg shadow-emerald-500/25">
              <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-bold text-emerald-900 dark:text-emerald-200">
                {attempt?.status === 'auto-submitted'
                  ? 'Assessment Auto-Submitted'
                  : 'Assessment Submitted Successfully'}
              </h2>
              <p className="text-emerald-800 dark:text-emerald-300 text-xs md:text-base">
                {attempt?.status === 'auto-submitted'
                  ? 'Your assessment was auto-submitted'
                  : 'Your answers have been recorded and evaluated'}
              </p>
            </div>
          </div>
        </div>

        {/* Premium Score Card */}
        <div className="relative bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 p-5 md:p-10 mb-5 md:mb-8 text-center overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 right-0 h-1.5 md:h-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500"></div>
          <div className="absolute -top-10 -left-10 w-24 md:w-40 h-24 md:h-40 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -right-10 w-24 md:w-40 h-24 md:h-40 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-full blur-2xl"></div>
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 rounded-2xl md:rounded-3xl shadow-xl shadow-amber-500/30 mb-4 md:mb-6">
              <Trophy className="w-8 h-8 md:w-12 md:h-12 text-white" />
            </div>
            
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
              Your Score
            </h2>
            
            <div className="flex items-center justify-center space-x-2 md:space-x-4 mb-4 md:mb-6">
              <div className="text-4xl md:text-7xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {attempt?.score || 0}
              </div>
              <div className="text-2xl md:text-4xl text-gray-300 dark:text-slate-600 font-light">/</div>
              <div className="text-2xl md:text-4xl font-bold text-gray-500 dark:text-slate-400">
                {totalMarks}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 mb-4 md:mb-6">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                <span className={`text-3xl md:text-5xl font-black ${color.replace('text-', 'text-')}`}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="hidden sm:block h-12 w-px bg-gray-200 dark:bg-slate-700"></div>
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                <span className={`text-2xl md:text-4xl font-black ${color.replace('text-', 'text-')}`}>
                  Grade: {grade}
                </span>
              </div>
            </div>

            {/* Stars based on performance */}
            <div className="flex items-center justify-center space-x-0.5 md:space-x-1 mb-3 md:mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 md:w-8 md:h-8 transition-all duration-300 ${
                    percentage >= star * 20
                      ? 'text-amber-400 fill-amber-400 scale-100'
                      : 'text-gray-300 dark:text-slate-600 scale-90'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-5 md:mb-8">
          {/* Assessment Info */}
          <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-4 md:p-6">
            <h3 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-5 flex items-center space-x-2">
              <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
              <span>Assessment Details</span>
            </h3>
            <div className="space-y-2 md:space-y-4">
              <div className="flex items-center justify-between p-3 md:p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg md:rounded-xl">
                <span className="text-gray-600 dark:text-slate-400 flex items-center space-x-1.5 md:space-x-2 text-sm md:text-base">
                  <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
                  <span>Total Questions</span>
                </span>
                <span className="font-bold text-base md:text-xl text-gray-900 dark:text-white">
                  {assessment?.questions?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 md:p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg md:rounded-xl">
                <span className="text-gray-600 dark:text-slate-400 flex items-center space-x-1.5 md:space-x-2 text-sm md:text-base">
                  <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500" />
                  <span>Total Marks</span>
                </span>
                <span className="font-bold text-base md:text-xl text-gray-900 dark:text-white">
                  {totalMarks}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 md:p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg md:rounded-xl">
                <span className="text-gray-600 dark:text-slate-400 flex items-center space-x-1.5 md:space-x-2 text-sm md:text-base">
                  <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                  <span>Your Score</span>
                </span>
                <span className="font-bold text-base md:text-xl text-emerald-600 dark:text-emerald-400">
                  {attempt?.score || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Attempt Info */}
          <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-4 md:p-6">
            <h3 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-5 flex items-center space-x-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
              <span>Attempt Information</span>
            </h3>
            <div className="space-y-2 md:space-y-4">
              <div className="flex items-center justify-between p-3 md:p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg md:rounded-xl">
                <span className="text-gray-600 dark:text-slate-400 flex items-center space-x-1.5 md:space-x-2 text-sm md:text-base">
                  <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
                  <span>Started At</span>
                </span>
                <span className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDate(attempt?.startedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 md:p-4 bg-green-50/50 dark:bg-green-900/10 rounded-lg md:rounded-xl">
                <span className="text-gray-600 dark:text-slate-400 flex items-center space-x-1.5 md:space-x-2 text-sm md:text-base">
                  <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
                  <span>Submitted At</span>
                </span>
                <span className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDate(attempt?.submittedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 md:p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg md:rounded-xl">
                <span className="text-gray-600 dark:text-slate-400 flex items-center space-x-1.5 md:space-x-2 text-sm md:text-base">
                  <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />
                  <span>Duration</span>
                </span>
                <span className="font-bold text-base md:text-xl text-gray-900 dark:text-white">
                  {formatDuration(attempt?.startedAt, attempt?.submittedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Violations */}
        {attempt?.violations > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl md:rounded-2xl p-4 md:p-6 mb-5 md:mb-8">
            <div className="flex items-start space-x-3 md:space-x-4">
              <div className="p-1.5 md:p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg md:rounded-xl shadow-lg shadow-amber-500/25 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-2 md:mb-3 text-base md:text-lg">
                  Violations Recorded: {attempt.violations}
                </h3>
                <p className="text-amber-800 dark:text-amber-300 mb-3 md:mb-4 text-sm md:text-base">
                  The following violations were detected during your assessment:
                </p>
                <div className="space-y-1.5 md:space-y-2">
                  {attempt.violationLog?.map((violation, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 bg-white/50 dark:bg-black/20 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm"
                    >
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-amber-500 rounded-full"></span>
                      <span className="capitalize">{violation.type.replace('_', ' ')}</span>
                      <span className="text-amber-600 dark:text-amber-400">-</span>
                      <span>{new Date(violation.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Summary */}
        <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-5 md:p-8">
          <h3 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
            <span>Performance Summary</span>
          </h3>
          
          {/* Progress Bar */}
          <div className="mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <span className="text-gray-600 dark:text-slate-400 font-medium text-sm md:text-base">
                Score Percentage
              </span>
              <span className="text-base md:text-xl font-bold text-gray-900 dark:text-white">
                {percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 md:h-4 overflow-hidden">
              <div
                className={`h-3 md:h-4 rounded-full transition-all duration-1000 ease-out ${
                  percentage >= 70
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                    : percentage >= 50
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                    : 'bg-gradient-to-r from-red-500 to-rose-500'
                }`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>

          <div className="p-3 md:p-5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-lg md:rounded-xl border border-indigo-200/50 dark:border-indigo-800/30">
            <p className="text-indigo-800 dark:text-indigo-300 font-medium text-center text-sm md:text-lg">
              {percentage >= 90
                ? '🎉 Outstanding performance! Keep up the excellent work!'
                : percentage >= 70
                ? '👏 Great job! You have a good understanding of the material.'
                : percentage >= 50
                ? '💪 Good effort! Consider reviewing the material for better understanding.'
                : '📚 Keep practicing! Review the material and try again.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 md:mt-8 text-center">
          <button
            onClick={() => navigate('/assessments')}
            className="group inline-flex items-center space-x-2 px-5 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 text-white rounded-xl md:rounded-2xl transition-all duration-300 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:-translate-y-1 font-semibold text-sm md:text-lg"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Assessments</span>
          </button>
        </div>

        {/* Copyright Footer - Desktop Only */}
        <div className="hidden md:block mt-8 md:mt-12 pt-6 md:pt-8 pb-4">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            © 2026 ProComm. All rights reserved. · <Link to="/privacy" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Privacy</Link> · <Link to="/cookies" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Cookies</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResults;
