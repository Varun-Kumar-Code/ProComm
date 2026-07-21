// src/pages/MonitorProctoring.js
// Host monitoring dashboard for live proctoring

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  Video,
  Mic,
  AlertTriangle,
  Users,
  CheckCircle,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAssessment,
  getAssessmentAttempts,
  subscribeToAttempt
} from '../firebase/assessmentService';

const MonitorProctoring = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const assessmentData = await getAssessment(assessmentId);
      setAssessment(assessmentData);

      // Check if user is the creator
      if (assessmentData.createdBy !== currentUser.uid) {
        alert('You do not have permission to monitor this assessment');
        navigate('/assessments');
        return;
      }

      const attemptsData = await getAssessmentAttempts(assessmentId);
      setAttempts(attemptsData);

      // Subscribe to real-time updates for each attempt
      attemptsData.forEach((attempt) => {
        if (attempt.status === 'in-progress') {
          subscribeToAttempt(attempt.id, (updatedAttempt) => {
            setAttempts((prev) =>
              prev.map((a) => (a.id === updatedAttempt.id ? updatedAttempt : a))
            );
          });
        }
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load monitoring data');
      navigate('/assessments');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'submitted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'auto-submitted':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'in-progress':
        return <Activity className="w-4 h-4 inline-block mr-1" />;
      case 'submitted':
        return <CheckCircle className="w-4 h-4 inline-block mr-1" />;
      case 'auto-submitted':
        return <AlertTriangle className="w-4 h-4 inline-block mr-1" />;
      default:
        return null;
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
    return `${minutes} min`;
  };

  const activeAttempts = attempts.filter((a) => a.status === 'in-progress');
  const completedAttempts = attempts.filter((a) => a.status !== 'in-progress');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/assessments')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Proctoring Monitor
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {assessment?.title}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/assessments/${assessmentId}/monitor/live`)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
            >
              <Video className="w-5 h-5" />
              <span>Enter Live Monitor Room</span>
            </button>
            <div className="flex items-center space-x-2 text-green-600">
              <Eye className="w-5 h-5" />
              <span className="text-sm font-medium">Database Monitoring Active</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Participants
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {attempts.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeAttempts.length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Completed
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {completedAttempts.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  High Violations
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {attempts.filter((a) => a.violations >= 2).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Active Participants */}
        {activeAttempts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Active Participants ({activeAttempts.length})
            </h2>
            
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>To see live video/audio streams:</strong> Click the "Enter Live Monitor Room" button above to access the dedicated monitoring room with live participant feeds, real-time status indicators, and advanced control options.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden"
                >
                  {/* Video Placeholder */}
                  <div className="aspect-video bg-gray-900 flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        Join room above to view live feed
                      </p>
                    </div>
                  </div>

                  {/* Participant Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {attempt.userName || 'Unknown'}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {attempt.userEmail}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          attempt.status
                        )}`}
                      >
                        {getStatusIcon(attempt.status)}
                        Active
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Started
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          {formatDate(attempt.startedAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Violations
                        </span>
                        <span
                          className={`font-semibold ${
                            attempt.violations >= 2
                              ? 'text-red-600 dark:text-red-400'
                              : attempt.violations === 1
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {attempt.violations}/3
                        </span>
                      </div>

                      {attempt.violations > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Recent violations:
                          </p>
                          <div className="space-y-1">
                            {attempt.violationLog
                              ?.slice(-3)
                              .map((violation, index) => (
                                <div
                                  key={index}
                                  className="text-xs text-red-600 dark:text-red-400"
                                >
                                  • {violation.type.replace('_', ' ')}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audio Indicator */}
                    <div className="mt-3 flex items-center space-x-2">
                      <Mic className="w-4 h-4 text-green-600" />
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 h-3 bg-green-600 rounded"
                            style={{
                              opacity: Math.random() > 0.5 ? 1 : 0.3,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Attempts */}
        {completedAttempts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Completed Attempts ({completedAttempts.length})
            </h2>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Violations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {completedAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {attempt.userName || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {attempt.userEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                            attempt.status
                          )}`}
                        >
                          {attempt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white font-semibold">
                          {attempt.score !== null
                            ? `${attempt.score} marks`
                            : 'Pending'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-semibold ${
                            attempt.violations >= 2
                              ? 'text-red-600 dark:text-red-400'
                              : attempt.violations === 1
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {attempt.violations}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDuration(attempt.startedAt, attempt.submittedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(attempt.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Attempts Yet */}
        {attempts.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No participants yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Participants will appear here when they start the assessment
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitorProctoring;
