import React, { useState, useRef, useEffect } from 'react';
import { Camera, Moon, Sun, Bell, Mic, Video, Monitor, Edit3, X, Check, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getUserProfile, 
  updateUserProfile, 
  updateProfilePicUrl,
  getMeetingHistory,
  deleteUserData
} from '../firebase/firestoreService';
import { uploadToCloudinary } from '../services/cloudinaryService';

const Profile = () => {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, deleteAccount, isEmailPasswordUser } = useAuth();
  const navigate = useNavigate();
  
  // Profile state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userBio, setUserBio] = useState('');
  const [profilePicture, setProfilePicture] = useState('/ProComm Icon.png');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: ''
  });
  const [settings, setSettings] = useState({
    notifications: true,
    autoJoinAudio: true,
    autoJoinVideo: false,
    screenShareNotifications: true,
    chatSounds: true
  });
  const [callHistory, setCallHistory] = useState([]);
  
  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  const fileInputRef = useRef(null);

  // Fetch user profile from Firestore on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      
      setIsLoading(true);
      try {
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
          setUserName(profile.displayName || '');
          setUserBio(profile.bio || '');
          setProfilePicture(profile.profilePicUrl || '/ProComm Icon.png');
          setEditForm({
            name: profile.displayName || '',
            bio: profile.bio || ''
          });
        }
        setUserEmail(currentUser.email || '');
        
        // Fetch meeting history
        const history = await getMeetingHistory(currentUser.uid);
        const formattedHistory = history.map((meeting, index) => ({
          id: meeting.id || index + 1,
          title: meeting.title,
          date: meeting.startedAt?.toDate?.()?.toLocaleDateString() || 'Unknown',
          duration: calculateDuration(meeting.startedAt, meeting.endedAt),
          participants: meeting.participantsCount || 1,
          status: 'completed'
        }));
        setCallHistory(formattedHistory);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  // Helper function to calculate duration
  const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const startDate = start.toDate ? start.toDate() : new Date(start);
    const endDate = end.toDate ? end.toDate() : new Date(end);
    const diffMs = endDate - startDate;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    // Images larger than 2MB will be automatically compressed by Cloudinary service

    setIsUploadingPicture(true);
    try {
      // Upload to Cloudinary (auto-compresses if > 2MB) and get URL
      const cloudinaryUrl = await uploadToCloudinary(file, currentUser.uid);
      
      // Save the URL to Firestore
      await updateProfilePicUrl(currentUser.uid, cloudinaryUrl);
      
      setProfilePicture(cloudinaryUrl);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploadingPicture(false);
    }
  };



  const handleSettingChange = (setting) => {
    const newSettings = { ...settings, [setting]: !settings[setting] };
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Reset form if canceling
      setEditForm({
        name: userName,
        bio: userBio
      });
    } else {
      // Initialize form with current values
      setEditForm({
        name: userName,
        bio: userBio
      });
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveProfile = async () => {
    // Validate bio length
    if (editForm.bio.length > 500) {
      alert('Bio must be 500 characters or less');
      return;
    }

    setIsSaving(true);
    try {
      // Update profile in Firestore
      await updateUserProfile(currentUser.uid, {
        displayName: editForm.name.trim(),
        bio: editForm.bio.trim()
      });
      
      // Update local state
      setUserName(editForm.name.trim());
      setUserBio(editForm.bio.trim());
      setIsEditMode(false);
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    setIsDeleting(true);
    setDeleteError('');
    
    try {
      // First delete all user data from Firestore
      await deleteUserData(currentUser.uid);
      
      // Then delete the Firebase Auth account
      await deleteAccount(isEmailPasswordUser() ? deletePassword : null);
      
      // Navigate to login page
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/wrong-password') {
        setDeleteError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/requires-recent-login') {
        setDeleteError('Please log out and log in again before deleting your account.');
      } else {
        setDeleteError(error.message || 'Failed to delete account. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setShowDeleteModal(true);
    setDeletePassword('');
    setDeleteError('');
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteError('');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-8">
        
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 transition-colors duration-300 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {isUploadingPicture && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-600 shadow-lg"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPicture}
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-full shadow-lg transition-colors duration-200"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>
              {isEditMode && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPicture}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  {isUploadingPicture ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Update Picture'
                  )}
                </button>
              )}
            </div>

            {/* Profile Info Section */}
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="text-2xl font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{userName}</h1>
                  )}
                  <p className="text-gray-700 dark:text-gray-400 mt-1">{userEmail}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isEditMode ? (
                    <>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors duration-200"
                        title="Save Changes"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={handleEditToggle}
                        disabled={isSaving}
                        className="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white p-2 rounded-lg transition-colors duration-200"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEditToggle}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bio</h2>
                  {isEditMode && (
                    <span className={`text-sm ${editForm.bio.length > 500 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      {editForm.bio.length}/500
                    </span>
                  )}
                </div>
                {isEditMode ? (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className={`w-full min-h-[100px] p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300 resize-vertical ${
                      editForm.bio.length > 500 ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                  />
                ) : (
                  <div className="w-full min-h-[100px] p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300">
                    {userBio || 'No bio added yet. Click Edit Profile to add one!'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Settings Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors duration-300 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Settings</h2>
            
            <div className="space-y-6">
              
              {/* Theme Setting */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isDark ? <Moon className="w-5 h-5 text-blue-600" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Theme</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Switch between light and dark mode
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    isDark ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      isDark ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notification Settings */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive meeting and chat notifications
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSettingChange('notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    settings.notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Join Audio */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mic className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Auto Join Audio</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically connect microphone when joining
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSettingChange('autoJoinAudio')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    settings.autoJoinAudio ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      settings.autoJoinAudio ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Join Video */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Video className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Auto Join Video</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically turn on camera when joining
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSettingChange('autoJoinVideo')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    settings.autoJoinVideo ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      settings.autoJoinVideo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Screen Share Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Monitor className="w-5 h-5 text-orange-600" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Screen Share Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get notified when someone shares their screen
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSettingChange('screenShareNotifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    settings.screenShareNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      settings.screenShareNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>

          {/* Call History Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors duration-300 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Recent Meetings</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white text-sm">
                      Meeting
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white text-sm">
                      Date
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white text-sm">
                      Duration
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white text-sm">
                      Participants
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {callHistory.map((call) => (
                    <tr key={call.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">
                            {call.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {call.status}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {call.date}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {call.duration}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {call.participants}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {callHistory.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No meeting history available</p>
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone - Delete Account */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors duration-300 border border-red-200 dark:border-red-900">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Delete Account</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={openDeleteModal}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Account</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete your account? This will permanently remove:
            </p>
            
            <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                Your profile and bio
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                All scheduled meetings
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                Your meeting history
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                Your authentication credentials
              </li>
            </ul>

            {isEmailPasswordUser() && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-300"
                />
              </div>
            )}

            {deleteError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || (isEmailPasswordUser() && !deletePassword)}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;