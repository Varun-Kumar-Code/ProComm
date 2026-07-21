// src/pages/AssessmentDashboard.js
// Main dashboard for managing assessments - Premium Design

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus,
  FileText,
  Clock,
  Users,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Play,
  CheckCircle,
  BarChart3,
  Sparkles,
  Award,
  Target,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getMyAssessments, 
  getAssignedAssessments,
  deleteAssessment,
  cleanupExpiredAssessments,
  publishAssessment
} from '../firebase/assessmentService';

const AssessmentDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('my-assessments'); // my-assessments, assigned, attempts
  const [myAssessments, setMyAssessments] = useState([]);
  const [assignedAssessments, setAssignedAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const fetchAssessments = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      // Clean up expired assessments first (runs in background)
      cleanupExpiredAssessments().catch(err => 
        console.warn('Cleanup warning:', err)
      );
      
      // Fetch assessments created by me
      const myAssessmentsData = await getMyAssessments(currentUser.uid);
      setMyAssessments(myAssessmentsData);

      // Fetch assessments assigned to me
      const assignedAssessmentsData = await getAssignedAssessments(currentUser.email);
      setAssignedAssessments(assignedAssessmentsData);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssessment = () => {
    navigate('/assessments/create');
  };

  const handleEditAssessment = (assessmentId) => {
    navigate(`/assessments/edit/${assessmentId}`);
  };

  const handleViewAttempts = (assessmentId) => {
    navigate(`/assessments/${assessmentId}/attempts`);
  };

  const handleDeleteAssessment = async (assessmentId) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      try {
        await deleteAssessment(assessmentId);
        fetchAssessments();
      } catch (error) {
        console.error('Error deleting assessment:', error);
        alert('Failed to delete assessment');
      }
    }
  };

  const handleQuickPublish = async (assessmentId, assessment) => {
    // Validate before publishing
    if (!assessment.questions || assessment.questions.length === 0) {
      alert('Cannot publish: Please add at least one question first');
      return;
    }
    
    if (!assessment.allowedParticipants || assessment.allowedParticipants.length === 0) {
      alert('Cannot publish: Please add at least one participant first');
      return;
    }

    if (window.confirm('Publish this assessment? Participants will be able to start taking it.')) {
      try {
        await publishAssessment(assessmentId);
        alert('Assessment published successfully!');
        fetchAssessments();
      } catch (error) {
        console.error('Error publishing assessment:', error);
        alert('Failed to publish assessment');
      }
    }
  };

  const handleStartAssessment = (assessmentId) => {
    navigate(`/assessments/${assessmentId}/take`);
  };

  const handleViewResults = (assessmentId) => {
    navigate(`/assessments/${assessmentId}/results`);
  };

  const handleMonitorProctoring = (assessmentId) => {
    navigate(`/assessments/${assessmentId}/monitor`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-8">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Premium Header */}
        <div className="mb-8 md:mb-10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
              <Target className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                Assessment Hub
              </h1>
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-amber-500 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm md:text-lg max-w-2xl">
            Create, manage, and monitor your assessments with enterprise-grade live proctoring
          </p>
        </div>

        {/* Premium Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-10">
          {/* Total Assessments Card */}
          <div className="group relative bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-500/5 border border-white/50 dark:border-slate-700/50 p-4 md:p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Assessments</p>
                <p className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {myAssessments.length}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 hidden md:block">All time created</p>
              </div>
              <div className="hidden md:block p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>

          {/* Published Card */}
          <div className="group relative bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl shadow-emerald-500/5 border border-white/50 dark:border-slate-700/50 p-4 md:p-6 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Published</p>
                <p className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  {myAssessments.filter(a => a.isPublished).length}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 hidden md:block">Live & active</p>
              </div>
              <div className="hidden md:block p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>

          {/* Assigned to Me Card */}
          <div className="group relative bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl shadow-purple-500/5 border border-white/50 dark:border-slate-700/50 p-4 md:p-6 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Assigned</p>
                <p className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  {assignedAssessments.length}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 hidden md:block">Pending completion</p>
              </div>
              <div className="hidden md:block p-4 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>

          {/* Active Now Card */}
          <div className="group relative bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl shadow-amber-500/5 border border-white/50 dark:border-slate-700/50 p-4 md:p-6 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Active Now</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">0</p>
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 hidden md:block">Real-time sessions</p>
              </div>
              <div className="hidden md:block p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>
        </div>

        {/* Premium Tabs */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex overflow-x-auto p-1 md:p-1.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg border border-white/50 dark:border-slate-700/50 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab('my-assessments')}
              className={`relative px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-semibold rounded-lg md:rounded-xl transition-all duration-300 whitespace-nowrap ${
                activeTab === 'my-assessments'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span className="relative z-10 flex items-center space-x-1 md:space-x-2">
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>My Assessments</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`relative px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-semibold rounded-lg md:rounded-xl transition-all duration-300 whitespace-nowrap ${
                activeTab === 'assigned'
                  ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span className="relative z-10 flex items-center space-x-1 md:space-x-2">
                <Award className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Assigned</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('attempts')}
              className={`relative px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-semibold rounded-lg md:rounded-xl transition-all duration-300 whitespace-nowrap ${
                activeTab === 'attempts'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span className="relative z-10 flex items-center space-x-1 md:space-x-2">
                <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Analytics</span>
              </span>
            </button>
          </div>

          {activeTab === 'my-assessments' && (
            <button
              onClick={handleCreateAssessment}
              className="group relative flex items-center justify-center space-x-1.5 md:space-x-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 text-xs md:text-base"
            >
              <Plus className="w-3.5 h-3.5 md:w-5 md:h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-semibold">Create Assessment</span>
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 opacity-70 hidden sm:block" />
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 dark:border-slate-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-500 dark:text-slate-400 font-medium">Loading your assessments...</p>
          </div>
        ) : (
          <>
            {/* My Assessments Tab */}
            {activeTab === 'my-assessments' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myAssessments.length === 0 ? (
                  <div className="col-span-full">
                    <div className="relative bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-xl border border-white/50 dark:border-slate-700/50 p-8 md:p-16 text-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
                      <div className="relative">
                        <div className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl md:rounded-3xl flex items-center justify-center">
                          <FileText className="w-8 h-8 md:w-12 md:h-12 text-blue-500 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2 md:mb-3">
                          No Assessments Yet
                        </h3>
                        <p className="text-sm md:text-base text-gray-600 dark:text-slate-400 mb-6 md:mb-8 max-w-md mx-auto">
                          Create your first assessment with live proctoring and advanced analytics
                        </p>
                        <button
                          onClick={handleCreateAssessment}
                          className="group inline-flex items-center space-x-1.5 md:space-x-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white px-5 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-lg font-semibold shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300"
                        >
                          <Plus className="w-4 h-4 md:w-6 md:h-6 group-hover:rotate-90 transition-transform duration-300" />
                          <span>Create Assessment</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  myAssessments.map((assessment, index) => (
                    <div
                      key={assessment.id}
                      className="group relative bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Card gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Top accent line */}
                      <div className={`h-1 ${assessment.isPublished ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-slate-600 dark:to-slate-500'}`}></div>
                      
                      <div className="relative p-6">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {assessment.title}
                          </h3>
                          <span
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full flex items-center space-x-1 ${
                              assessment.isPublished
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25'
                                : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {assessment.isPublished ? (
                              <>
                                <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse"></span>
                                <span>Live</span>
                              </>
                            ) : (
                              <span>Draft</span>
                            )}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-5 line-clamp-2">
                          {assessment.description || 'No description provided'}
                        </p>

                        <div className="space-y-3 mb-5">
                          <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg mr-3">
                              <Clock className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="font-medium">{assessment.durationMinutes} minutes</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                            <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg mr-3">
                              <FileText className="w-4 h-4 text-purple-500" />
                            </div>
                            <span className="font-medium">{assessment.questions?.length || 0} questions</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg mr-3">
                              <Users className="w-4 h-4 text-amber-500" />
                            </div>
                            <span className="font-medium">{assessment.allowedParticipants?.length || 0} participants</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-slate-700/50">
                          {!assessment.isPublished && (
                            <button
                              onClick={() => handleQuickPublish(assessment.id, assessment)}
                              className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 text-sm font-medium"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Publish</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleEditAssessment(assessment.id)}
                            className="flex-1 flex items-center justify-center space-x-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-300 text-sm font-medium"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleViewAttempts(assessment.id)}
                            className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all duration-300 text-sm font-medium"
                          >
                            <BarChart3 className="w-4 h-4" />
                            <span>Results</span>
                          </button>
                          {assessment.isPublished && (
                            <button
                              onClick={() => handleMonitorProctoring(assessment.id)}
                              className="flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-2 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-300"
                              title="Monitor Live"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAssessment(assessment.id)}
                            className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 px-3 py-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-300"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Assigned Assessments Tab */}
            {activeTab === 'assigned' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignedAssessments.length === 0 ? (
                  <div className="col-span-full">
                    <div className="relative bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 dark:border-slate-700/50 p-16 text-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
                      <div className="relative">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 rounded-3xl flex items-center justify-center">
                          <Award className="w-12 h-12 text-purple-500 dark:text-purple-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                          No Assignments Yet
                        </h3>
                        <p className="text-gray-600 dark:text-slate-400 max-w-md mx-auto">
                          No published assessments have been assigned to you yet. Check back later!
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  assignedAssessments.map((assessment, index) => (
                    <div
                      key={assessment.id}
                      className="group relative bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Card gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Top accent line */}
                      <div className="h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500"></div>
                      
                      <div className="relative p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg shadow-purple-500/25">
                            <Award className="w-5 h-5 text-white" />
                          </div>
                          <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25 flex items-center space-x-1">
                            <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse"></span>
                            <span>Ready</span>
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {assessment.title}
                        </h3>

                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-5 line-clamp-2">
                          {assessment.description || 'No description provided'}
                        </p>

                        <div className="space-y-3 mb-5">
                          <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg mr-3">
                              <Clock className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="font-medium">{assessment.durationMinutes} minutes</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg mr-3">
                              <FileText className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span className="font-medium">{assessment.questions?.length || 0} questions</span>
                          </div>
                          {assessment.scheduledStartTime && (
                            <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                              <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg mr-3">
                                <Calendar className="w-4 h-4 text-amber-500" />
                              </div>
                              <span className="font-medium">{formatDate(assessment.scheduledStartTime)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-slate-700/50">
                          <button
                            onClick={() => handleStartAssessment(assessment.id)}
                            className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-600 hover:from-purple-600 hover:via-violet-600 hover:to-indigo-700 text-white px-4 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-xl font-medium"
                          >
                            <Play className="w-4 h-4" />
                            <span>Start Assessment</span>
                          </button>
                          <button
                            onClick={() => handleViewResults(assessment.id)}
                            className="flex items-center justify-center bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-slate-300 px-4 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all duration-300"
                            title="View Results"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Attempts Overview Tab */}
            {activeTab === 'attempts' && (
              <div className="relative bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 dark:border-slate-700/50 p-12 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5"></div>
                <div className="relative">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-3xl flex items-center justify-center">
                    <BarChart3 className="w-12 h-12 text-amber-500 dark:text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Analytics Dashboard
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400 max-w-md mx-auto mb-4">
                    Advanced analytics and insights for your assessments coming soon...
                  </p>
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Coming Soon</span>
                  </div>
                </div>
              </div>
            )}
          </>
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

export default AssessmentDashboard;
