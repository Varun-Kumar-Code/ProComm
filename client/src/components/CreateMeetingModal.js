import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, Plus, Trash2, Copy, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, createInstantMeeting } from '../firebase/firestoreService';
import { v4 as uuidv4 } from 'uuid';

const CreateMeetingModal = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [participants, setParticipants] = useState(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState('');

  // Fetch user profile when modal opens
  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUser && isOpen) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      }
    };
    fetchProfile();
  }, [currentUser, isOpen]);

  const handleAddParticipant = () => {
    setParticipants([...participants, '']);
  };

  const handleRemoveParticipant = (index) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const handleParticipantChange = (index, value) => {
    const newParticipants = [...participants];
    newParticipants[index] = value;
    setParticipants(newParticipants);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Check if user is authenticated
    if (!currentUser) {
      setError('You must be logged in to start a meeting. Please sign in first.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Filter out empty participants
      const validParticipants = participants.filter(email => email.trim() !== '');
      
      // Generate unique meeting ID
      const meetingId = uuidv4();
      
      // Create meeting in Firestore with creator info
      const meeting = await createInstantMeeting(meetingId, {
        title: meetingTitle || 'Untitled Meeting',
        description: meetingDescription,
        invitedEmails: validParticipants,
        creatorUid: currentUser.uid,
        creatorEmail: currentUser.email,
        creatorName: userProfile?.displayName || currentUser.displayName || currentUser.email.split('@')[0],
        creatorProfilePic: userProfile?.profilePicUrl || currentUser.photoURL || ''
      });
      
      setCreatedMeeting({
        id: meetingId,
        title: meeting.title,
        description: meeting.description,
        participants: validParticipants,
        createdBy: userProfile?.displayName || currentUser.email
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      setError('Failed to create meeting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    const title = encodeURIComponent(createdMeeting.title || 'Untitled Meeting');
    const meetingLink = `${window.location.origin}/room/${createdMeeting.id}?title=${title}`;
    navigator.clipboard.writeText(meetingLink);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  const handleClose = () => {
    setMeetingTitle('');
    setMeetingDescription('');
    setParticipants(['']);
    setCreatedMeeting(null);
    setCopiedToClipboard(false);
    setError('');
    onClose();
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
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-medium">Account Required</p>
                <p className="text-sm mt-1">You need to sign in or create an account to start a meeting. This ensures that only invited participants can join your meetings.</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success screen if meeting is created
  if (createdMeeting) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transition-colors duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Meeting Created!</h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {createdMeeting.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Your meeting has been created successfully!
              </p>
            </div>

            {/* Meeting Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meeting ID
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-3 py-2 text-sm font-mono">
                    {createdMeeting.id}
                  </code>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                  >
                    {copiedToClipboard ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {createdMeeting.participants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invited Participants ({createdMeeting.participants.length})
                  </label>
                  <div className="space-y-1">
                    {createdMeeting.participants.map((email, index) => (
                      <div key={index} className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-600 rounded px-3 py-1">
                        {email}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Only these invited users can join this meeting
                  </p>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  const title = encodeURIComponent(createdMeeting.title || 'Untitled Meeting');
                  const name = encodeURIComponent(userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Host');
                  const email = encodeURIComponent(currentUser?.email || '');
                  window.open(`/room/${createdMeeting.id}?title=${title}&name=${name}&email=${email}`, '_blank');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Start Meeting Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Start Meeting</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Meeting Title */}
          <div>
            <label htmlFor="meetingTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meeting Title
            </label>
            <input
              type="text"
              id="meetingTitle"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300"
              placeholder="Enter meeting title"
            />
          </div>

          {/* Meeting Description */}
          <div>
            <label htmlFor="meetingDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="meetingDescription"
              value={meetingDescription}
              onChange={(e) => setMeetingDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300 resize-none"
              placeholder="Add meeting description..."
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Users className="w-4 h-4 inline mr-1" />
              Invite Participants
            </label>
            
            <div className="space-y-2">
              {participants.map((email, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleParticipantChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300"
                    placeholder="participant@email.com"
                  />
                  {participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={handleAddParticipant}
              className="mt-2 flex items-center space-x-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Another Participant</span>
            </button>
            
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Only invited participants with accounts can join. Leave empty for an open meeting.
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
              onClick={handleClose}
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
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Start Meeting
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMeetingModal;