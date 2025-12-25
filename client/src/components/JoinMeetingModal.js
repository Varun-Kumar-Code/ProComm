import React, { useState, useEffect } from 'react';
import { X, Video, User, Mail, AlertCircle, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, validateMeetingParticipant, addParticipantToMeeting } from '../firebase/firestoreService';

const JoinMeetingModal = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch user profile and pre-fill form when modal opens
  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUser && isOpen) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile);
          setUserName(profile?.displayName || currentUser.displayName || currentUser.email.split('@')[0]);
          setUserEmail(currentUser.email);
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setUserName(currentUser.displayName || currentUser.email.split('@')[0]);
          setUserEmail(currentUser.email);
        }
      }
    };
    fetchProfile();
  }, [currentUser, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Check if user is authenticated
    if (!currentUser) {
      setError('You must be logged in to join a meeting. Please sign in first.');
      return;
    }
    
    if (!meetingId.trim()) {
      setError('Please enter a meeting ID or link');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Extract meeting ID from URL if full URL is provided
      let cleanMeetingId = meetingId.trim();
      if (cleanMeetingId.includes('/room/')) {
        const urlParts = cleanMeetingId.split('/room/');
        cleanMeetingId = urlParts[1]?.split('?')[0] || cleanMeetingId;
      }
      
      // Validate participant using Firestore
      const validation = await validateMeetingParticipant(cleanMeetingId, currentUser.email);
      
      if (validation.isAllowed) {
        // Add participant to meeting
        await addParticipantToMeeting(cleanMeetingId, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: userProfile?.displayName || currentUser.displayName || currentUser.email.split('@')[0],
          profilePicUrl: userProfile?.profilePicUrl || currentUser.photoURL || ''
        });
        
        // Store user info for the meeting
        localStorage.setItem('meetingUserName', userName);
        localStorage.setItem('meetingUserEmail', userEmail);
        localStorage.setItem('meetingUserProfilePic', userProfile?.profilePicUrl || currentUser.photoURL || '');
        
        // Navigate to meeting room with user info
        const name = encodeURIComponent(userProfile?.displayName || currentUser.displayName || currentUser.email.split('@')[0]);
        const email = encodeURIComponent(currentUser.email);
        const profilePic = encodeURIComponent(userProfile?.profilePicUrl || currentUser.photoURL || '');
        navigate(`/room/${cleanMeetingId}?name=${name}&email=${email}&profilePic=${profilePic}`);
        onClose();
      } else {
        setError(validation.reason);
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      setError('Failed to join meeting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Show login required message if not authenticated
  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transition-colors duration-300">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sign In Required</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
              <LogIn className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-medium">Account Required</p>
                <p className="text-sm mt-1">You need to sign in or create an account to join a meeting. This ensures that only invited participants can access meetings.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Join Meeting</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Info Display */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              {userProfile?.profilePicUrl || currentUser?.photoURL ? (
                <img 
                  src={userProfile?.profilePicUrl || currentUser?.photoURL} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-lg">
                  {(userName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0]}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Joining as the account above. Your profile name and picture will be visible to participants.
            </p>
          </div>

          {/* Meeting ID */}
          <div>
            <label htmlFor="meetingId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meeting Link or ID
            </label>
            <div className="relative">
              <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="meetingId"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300"
                placeholder="e.g. room/abc123 or meeting ID"
                required
              />
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You must be invited to join this meeting
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Join'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinMeetingModal;