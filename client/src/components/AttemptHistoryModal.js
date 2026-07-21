import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, Activity, User, Monitor, Calendar } from 'lucide-react';
import { getAssessmentAttemptHistory } from '../firebase/firestoreService';

const AttemptHistoryModal = ({ isOpen, onClose, meetingId, meetingTitle }) => {
  const [attempts, setAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, in-progress, completed, disconnected

  useEffect(() => {
    const fetchAttempts = async () => {
      setIsLoading(true);
      try {
        const data = await getAssessmentAttemptHistory(meetingId);
        setAttempts(data);
      } catch (error) {
        console.error('Error fetching attempt history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && meetingId) {
      fetchAttempts();
    }
  }, [isOpen, meetingId]);

  if (!isOpen) return null;

  const filteredAttempts = filter === 'all' 
    ? attempts 
    : attempts.filter(a => a.status === filter);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in-progress':
        return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'disconnected':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      case 'in-progress':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const stats = {
    total: attempts.length,
    completed: attempts.filter(a => a.status === 'completed').length,
    disconnected: attempts.filter(a => a.status === 'disconnected').length,
    inProgress: attempts.filter(a => a.status === 'in-progress').length,
    uniqueUsers: new Set(attempts.map(a => a.userEmail)).size
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Attempt History
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {meetingTitle || 'Assessment'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Stats Summary */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Total Attempts
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.completed}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Completed
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.inProgress}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                In Progress
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.disconnected}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Disconnected
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.uniqueUsers}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Unique Users
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-1">
            {['all', 'in-progress', 'completed', 'disconnected'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  filter === f
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t border-l border-r border-gray-200 dark:border-gray-700'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 350px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No attempts found for this filter
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-900/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(attempt.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {attempt.userEmail}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(attempt.status)}`}>
                            {attempt.status}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            Attempt #{attempt.attemptNumber}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>Joined: {formatDate(attempt.joinedAt)}</span>
                          </div>
                          {attempt.completedAt && (
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>Ended: {formatDate(attempt.completedAt)}</span>
                            </div>
                          )}
                        </div>
                        {attempt.device && (
                          <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                            <Monitor className="w-3 h-3" />
                            <span className="truncate">{attempt.device.platform} - {attempt.device.userAgent}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttemptHistoryModal;
