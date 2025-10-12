import React, { useState, useRef } from 'react';
import { Camera, Moon, Sun, Bell, Mic, Video, Monitor, Edit3, X, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Profile = () => {
  const { isDark, toggleTheme } = useTheme();
  const [userName, setUserName] = useState('Varun Kumar');
  const [userEmail] = useState('varunkumar1329@gmail.com');
  const [userBio, setUserBio] = useState('Software developer passionate about creating innovative solutions and connecting people through technology.');
  const [profilePicture, setProfilePicture] = useState('/ProComm Icon.png');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: 'Varun Kumar',
    bio: 'Software developer passionate about creating innovative solutions and connecting people through technology.'
  });
  const [settings, setSettings] = useState({
    notifications: true,
    autoJoinAudio: true,
    autoJoinVideo: false,
    screenShareNotifications: true,
    chatSounds: true
  });
  const [callHistory] = useState([
    {
      id: 1,
      title: 'Team Standup',
      date: '2024-01-15',
      duration: '25 min',
      participants: 5,
      status: 'completed'
    },
    {
      id: 2,
      title: 'Client Review',
      date: '2024-01-14',
      duration: '45 min',
      participants: 3,
      status: 'completed'
    },
    {
      id: 3,
      title: 'Project Discussion',
      date: '2024-01-12',
      duration: '30 min',
      participants: 7,
      status: 'completed'
    }
  ]);
  
  const fileInputRef = useRef(null);

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const imgSrc = evt.target.result;
        setProfilePicture(imgSrc);
        localStorage.setItem('profilePicture', imgSrc);
      };
      reader.readAsDataURL(file);
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

  const handleSaveProfile = () => {
    setUserName(editForm.name);
    setUserBio(editForm.bio);
    localStorage.setItem('userName', editForm.name);
    localStorage.setItem('userBio', editForm.bio);
    setIsEditMode(false);
    // Show success message
    console.log('Profile updated successfully');
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-8">
        
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 transition-colors duration-300 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-600 shadow-lg"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-colors duration-200"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Update Picture
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
                        className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors duration-200"
                        title="Save Changes"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleEditToggle}
                        className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors duration-200"
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
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Bio</h2>
                {isEditMode ? (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className="w-full min-h-[100px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300 resize-vertical"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <div className="w-full min-h-[100px] p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300">
                    {userBio}
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

        </div>
      </div>
    </div>
  );
};

export default Profile;