import React, { useState, useRef, useEffect } from 'react';
import { Camera, Monitor, Edit3, X, Check, Loader2, Calendar, Clock, Trash2, Users, Video, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getUserProfile, 
  updateUserProfile, 
  updateProfilePicUrl,
  getMeetingHistory,
  getScheduledMeetings,
  deleteScheduledMeeting
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
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(null);
  
  const fileInputRef = useRef(null);

  // Instagram-style Skeleton Components
  const Shimmer = ({ className }) => (
    <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
    </div>
  );

  const SkeletonProfileHeader = () => (
    <div className="bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-xl p-8 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar skeleton */}
        <div className="flex flex-col items-center gap-4">
          <Shimmer className="w-32 h-32 rounded-full" />
        </div>
        {/* Info skeleton */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Shimmer className="h-8 w-48 rounded-lg" />
              <Shimmer className="h-5 w-64 rounded-lg" />
            </div>
            <Shimmer className="h-10 w-32 rounded-lg" />
          </div>
          <div className="space-y-3 mt-6">
            <Shimmer className="h-6 w-24 rounded-lg" />
            <Shimmer className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );

  const SkeletonStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
          <div className="flex items-center justify-between mb-3">
            <Shimmer className="w-12 h-12 rounded-lg" />
          </div>
          <Shimmer className="h-8 w-16 rounded-lg mb-2" />
          <Shimmer className="h-4 w-24 rounded" />
        </div>
      ))}
    </div>
  );

  const SkeletonMeeting = () => (
    <div className="border border-gray-200 dark:border-gray-600/50 rounded-lg p-4 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <Shimmer className="h-5 w-40 rounded" />
          <Shimmer className="h-3 w-56 rounded" />
          <Shimmer className="h-3 w-32 rounded" />
        </div>
        <Shimmer className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );

  const SkeletonTable = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border-b border-gray-200 dark:border-gray-700 pb-3 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
          <div className="grid grid-cols-4 gap-4">
            <Shimmer className="h-4 w-full rounded" />
            <Shimmer className="h-4 w-full rounded" />
            <Shimmer className="h-4 w-full rounded" />
            <Shimmer className="h-4 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );

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
        
        // Fetch scheduled meetings
        const scheduled = await getScheduledMeetings(currentUser.uid);
        setScheduledMeetings(scheduled);
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

  // Handle deleting a scheduled meeting
  const handleDeleteScheduledMeeting = async (meetingId) => {
    if (!currentUser) return;
    
    setIsDeletingMeeting(meetingId);
    try {
      await deleteScheduledMeeting(currentUser.uid, meetingId);
      setScheduledMeetings(prev => prev.filter(m => m.id !== meetingId));
    } catch (error) {
      console.error('Error deleting scheduled meeting:', error);
      alert('Failed to delete meeting. Please try again.');
    } finally {
      setIsDeletingMeeting(null);
    }
  };

  // Format scheduled meeting date/time
  const formatScheduledDateTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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

  // Show loading state with premium skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-8">
          {/* Skeleton Profile Header */}
          <div className="mb-8">
            <SkeletonProfileHeader />
          </div>

          {/* Skeleton Stats */}
          <div className="mb-8">
            <SkeletonStats />
          </div>

          {/* Skeleton Scheduled Meetings */}
          <div className="mb-8 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <Shimmer className="h-6 w-48 rounded-lg" />
              <Shimmer className="h-4 w-24 rounded" />
            </div>
            <div className="space-y-4">
              <SkeletonMeeting />
              <SkeletonMeeting />
            </div>
          </div>

          {/* Skeleton Call History */}
          <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <Shimmer className="h-6 w-40 rounded-lg mb-6" />
            <SkeletonTable />
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalMeetings = callHistory.length;
  const totalParticipants = callHistory.reduce((sum, call) => sum + (call.participants || 0), 0);
  const totalDuration = callHistory.reduce((sum, call) => {
    const duration = call.duration || '0 min';
    const mins = parseInt(duration.match(/\d+/)?.[0] || 0);
    return sum + mins;
  }, 0);
  const avgRating = 4.8; // You can calculate this based on actual ratings

  const stats = [
    {
      icon: <Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      title: 'Total Meetings',
      value: totalMeetings.toString(),
      subtitle: 'Completed',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      icon: <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />,
      title: 'Participants',
      value: totalParticipants.toString(),
      subtitle: 'Connected',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      icon: <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />,
      title: 'Meeting Hours',
      value: `${Math.floor(totalDuration / 60)}h`,
      subtitle: `${totalDuration % 60}m total`,
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      icon: <Award className="w-8 h-8 text-green-600 dark:text-green-400" />,
      title: 'Avg Rating',
      value: avgRating.toFixed(1),
      subtitle: 'From participants',
      gradient: 'from-green-500 to-green-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-8">
        
        {/* Profile Header with Premium Design */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-xl p-8 mb-8 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
            
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center gap-3 md:gap-4">
              <div className="relative group">
                {isUploadingPicture && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-white" />
                  </div>
                )}
                <div className="relative">
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-2xl transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20"></div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPicture}
                  className="absolute bottom-0 right-0 bg-white hover:bg-gray-100 disabled:opacity-50 text-blue-600 p-2 md:p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                >
                  <Camera className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Profile Info Section */}
            <div className="flex-1 w-full text-white text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-4">
                <div className="flex-1 min-w-0 w-full md:w-auto">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="text-xl sm:text-2xl md:text-3xl font-bold bg-white/20 backdrop-blur-sm text-white placeholder-white/70 border border-white/30 rounded-lg px-3 py-2 md:px-4 md:py-2 focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300 w-full"
                      placeholder="Your name"
                    />
                  ) : (
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2 truncate">{userName}</h1>
                  )}
                  <p className="text-blue-100 text-sm sm:text-base md:text-lg truncate">{userEmail}</p>
                </div>
                
                <div className="flex items-center space-x-2 w-full md:w-auto justify-center md:justify-end">
                  {isEditMode ? (
                    <>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base flex-1 md:flex-none"
                        title="Save Changes"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mx-auto" />
                        ) : (
                          <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Save</span>
                          </div>
                        )}
                      </button>
                      <button
                        onClick={handleEditToggle}
                        disabled={isSaving}
                        className="bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 font-medium backdrop-blur-sm text-sm sm:text-base flex-1 md:flex-none"
                        title="Cancel"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Cancel</span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEditToggle}
                      className="bg-white hover:bg-gray-100 text-blue-600 px-4 sm:px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-1.5 sm:space-x-2 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base w-full md:w-auto justify-center"
                    >
                      <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white">Bio</h2>
                  {isEditMode && (
                    <span className={`text-xs sm:text-sm ${editForm.bio.length > 500 ? 'text-red-300' : 'text-blue-100'}`}>
                      {editForm.bio.length}/500
                    </span>
                  )}
                </div>
                {isEditMode ? (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className={`w-full min-h-[80px] sm:min-h-[100px] p-3 sm:p-4 border rounded-lg focus:ring-2 focus:ring-white/50 focus:border-transparent bg-white/20 backdrop-blur-sm text-white placeholder-white/70 transition-all duration-300 resize-vertical text-sm sm:text-base ${
                      editForm.bio.length > 500 ? 'border-red-400' : 'border-white/30'
                    }`}
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                  />
                ) : (
                  <div className="w-full min-h-[80px] sm:min-h-[100px] p-3 sm:p-4 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white transition-all duration-300 text-sm sm:text-base">
                    {userBio || 'No bio added yet. Click Edit Profile to add one!'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid with Premium Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-8">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="bg-white dark:bg-gray-800/50 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl shadow-md hover:shadow-xl p-3 sm:p-4 md:p-6 transition-all duration-300 ease-in-out hover:scale-105 hover:border-gray-300 dark:hover:border-gray-600 group"
            >
              <div className={`inline-flex p-2 sm:p-2.5 md:p-3 rounded-lg bg-gradient-to-br ${stat.gradient} mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {React.cloneElement(stat.icon, { className: 'w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white' })}
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 md:mb-1">{stat.value}</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">{stat.title}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1">{stat.subtitle}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8">
          
          {/* Scheduled Meetings Section with Premium Design */}
          <div className="bg-white dark:bg-amber-900/20 backdrop-blur-xl border border-gray-200 dark:border-amber-700/50 rounded-xl shadow-md hover:shadow-lg p-4 sm:p-5 md:p-6 transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 flex-wrap gap-2">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-amber-100 flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-sm sm:text-base md:text-xl">Scheduled Meetings</span>
              </h2>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-amber-400 font-medium bg-gray-100 dark:bg-amber-900/30 px-2.5 sm:px-3 py-1 rounded-full">
                {scheduledMeetings.length} meetings
              </span>
            </div>
            
            {scheduledMeetings.length > 0 ? (
              <div className="space-y-2.5 sm:space-y-3">
                {scheduledMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-amber-800/20 rounded-lg border border-gray-200 dark:border-amber-600/30 hover:bg-gray-100 dark:hover:bg-amber-800/30 hover:border-gray-300 dark:hover:border-amber-600/50 hover:shadow-md transition-all duration-300 group gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-amber-50 group-hover:text-blue-600 dark:group-hover:text-amber-200 transition-colors truncate">
                        {meeting.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1.5 sm:mt-2">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-amber-300 flex items-center gap-1 sm:gap-1.5">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{formatScheduledDateTime(meeting.scheduledAt)}</span>
                        </span>
                      </div>
                      {meeting.description && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-amber-400 mt-1.5 sm:mt-2 line-clamp-1">
                          {meeting.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteScheduledMeeting(meeting.id)}
                      disabled={isDeletingMeeting === meeting.id}
                      className="p-2 sm:p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 disabled:opacity-50 hover:scale-110 flex-shrink-0"
                      title="Delete meeting"
                    >
                      {isDeletingMeeting === meeting.id ? (
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-amber-400">
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                  <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <p className="font-semibold text-base sm:text-lg mb-1">No scheduled meetings</p>
                <p className="text-xs sm:text-sm">Schedule a meeting from the home page</p>
              </div>
            )}
          </div>

          {/* Call History Section with Premium Design */}
          <div className="bg-white dark:bg-indigo-900/20 backdrop-blur-xl border border-gray-200 dark:border-indigo-700/50 rounded-xl shadow-md hover:shadow-lg p-4 sm:p-5 md:p-6 transition-all duration-300 ease-in-out">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-indigo-100 mb-4 sm:mb-5 md:mb-6 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg">
                <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-sm sm:text-base md:text-xl">Recent Meetings</span>
            </h2>
            
            {/* Mobile View - Cards */}
            <div className="md:hidden space-y-3">
              {callHistory.map((call) => (
                <div key={call.id} className="bg-gray-50 dark:bg-indigo-800/20 rounded-lg border border-gray-200 dark:border-indigo-700/50 p-3 hover:bg-gray-100 dark:hover:bg-indigo-800/30 transition-all duration-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-indigo-50 truncate">
                        {call.title}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-indigo-400 mt-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                        <span>{call.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-indigo-400 block mb-0.5">Date</span>
                      <span className="text-gray-900 dark:text-indigo-200 font-medium">{call.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-indigo-400 block mb-0.5">Duration</span>
                      <span className="text-gray-900 dark:text-indigo-200 font-medium">{call.duration}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-indigo-400 block mb-0.5">Participants</span>
                      <div className="flex items-center gap-1 text-gray-900 dark:text-indigo-200 font-medium">
                        <Users className="w-3 h-3" />
                        <span>{call.participants}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop View - Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-indigo-700/50">
                    <th className="text-left py-4 px-3 font-semibold text-gray-900 dark:text-indigo-100 text-sm">
                      Meeting
                    </th>
                    <th className="text-left py-4 px-3 font-semibold text-gray-900 dark:text-indigo-100 text-sm">
                      Date
                    </th>
                    <th className="text-left py-4 px-3 font-semibold text-gray-900 dark:text-indigo-100 text-sm">
                      Duration
                    </th>
                    <th className="text-left py-4 px-3 font-semibold text-gray-900 dark:text-indigo-100 text-sm">
                      Participants
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {callHistory.map((call) => (
                    <tr key={call.id} className="border-b border-gray-100 dark:border-indigo-800/30 hover:bg-gray-50 dark:hover:bg-indigo-800/20 transition-all duration-200 group">
                      <td className="py-4 px-3">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-indigo-50 text-sm group-hover:text-blue-600 dark:group-hover:text-indigo-200 transition-colors">
                            {call.title}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-indigo-400 mt-0.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {call.status}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-600 dark:text-indigo-300">
                        {call.date}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-600 dark:text-indigo-300 font-medium">
                        {call.duration}
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-indigo-300">
                          <Users className="w-4 h-4" />
                          {call.participants}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              
            
            {callHistory.length === 0 && (
              <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-indigo-400">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                  <Monitor className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <p className="font-semibold text-base sm:text-lg mb-1">No meeting history</p>
                <p className="text-xs sm:text-sm">Your completed meetings will appear here</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;