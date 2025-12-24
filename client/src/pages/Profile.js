import React, { useState, useRef, useEffect } from 'react';
import { Camera, Monitor, Edit3, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getUserProfile, 
  updateUserProfile, 
  updateProfilePicUrl,
  getMeetingHistory
} from '../firebase/firestoreService';
import { uploadToCloudinary } from '../services/cloudinaryService';

const Profile = () => {
  const { currentUser } = useAuth();
  
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
  const [callHistory, setCallHistory] = useState([]);
  
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

        <div className="grid gap-8">
          
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

        </div>
      </div>
    </div>
  );
};

export default Profile;