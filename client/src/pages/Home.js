import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Video, 
  Users, 
  Calendar, 
  Clock, 
  Plus,
  UserPlus,
  TrendingUp,
  Monitor,
  Mic,
  Camera,
  ArrowRight,
  FileText
} from 'lucide-react';
import Chatbot from '../components/Chatbot';
import JoinMeetingModal from '../components/JoinMeetingModal';
import CreateMeetingModal from '../components/CreateMeetingModal';
import ScheduleMeetingModal from '../components/ScheduleMeetingModal';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, getMeetingHistory, getScheduledMeetings, ensureUserEmail, subscribeToMeetingStatistics } from '../firebase/firestoreService';

const Home = () => {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [meetingStats, setMeetingStats] = useState({
    totalMeetings: 0,
    totalParticipants: 0,
    totalHours: 0
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    // Fetch user profile from Firestore
    const fetchUserProfile = async () => {
      if (currentUser) {
        try {
          // Ensure user email is stored in profile (for existing users)
          await ensureUserEmail(currentUser.uid, currentUser.email);
          
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  // Subscribe to real-time meeting statistics
  useEffect(() => {
    if (!currentUser) {
      setMeetingStats({
        totalMeetings: 0,
        totalParticipants: 0,
        totalHours: 0
      });
      return;
    }

    // Subscribe to real-time updates
    const unsubscribe = subscribeToMeetingStatistics(currentUser.uid, (stats) => {
      console.log('📊 [Home] Real-time stats update:', stats);
      setMeetingStats(stats);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [currentUser]);

  const location = useLocation();

  useEffect(() => {
    // Fetch meeting history and scheduled meetings from Firebase
    const fetchMeetings = async () => {
      console.log('🔄 [Home] Fetching meetings...');
      console.log('🔄 [Home] Current user:', currentUser?.uid);
      
      if (!currentUser) {
        console.log('⚠️ [Home] No current user, skipping fetch');
        setIsLoading(false);
        setRecentMeetings([]);
        setUpcomingMeetings([]);
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch meeting history
        console.log('📡 [Home] Calling getMeetingHistory for user:', currentUser.uid);
        const history = await getMeetingHistory(currentUser.uid);
        console.log('✅ [Home] Received history:', history.length, 'meetings');
        console.log('📋 [Home] History data:', history);
        
        const formattedHistory = history.map((meeting, index) => ({
          id: meeting.id || index + 1,
          title: meeting.title,
          date: meeting.startedAt?.toDate?.()?.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }) || 'Unknown',
          duration: calculateDuration(meeting.startedAt, meeting.endedAt),
          participants: meeting.participantsCount || 1
        }));
        console.log('📋 [Home] Formatted history:', formattedHistory);
        setRecentMeetings(formattedHistory);
        
        // Fetch scheduled meetings
        console.log('📡 [Home] Calling getScheduledMeetings for user:', currentUser.uid);
        const scheduled = await getScheduledMeetings(currentUser.uid);
        console.log('✅ [Home] Received scheduled meetings:', scheduled.length, 'meetings');
        
        const formattedScheduled = scheduled.map((meeting) => {
          const scheduledDate = meeting.scheduledAt?.toDate?.() || new Date(meeting.scheduledAt);
          const now = new Date();
          const isToday = scheduledDate.toDateString() === now.toDateString();
          const isTomorrow = scheduledDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();
          
          let dateText = scheduledDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          
          if (isToday) dateText = 'Today';
          else if (isTomorrow) dateText = 'Tomorrow';
          
          const timeText = scheduledDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          
          const endTime = new Date(scheduledDate.getTime() + meeting.durationMinutes * 60000);
          const endTimeText = endTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          
          return {
            id: meeting.id,
            title: meeting.title,
            time: `${timeText} - ${endTimeText}`,
            date: dateText,
            participants: meeting.invitedEmails ? meeting.invitedEmails.length + 1 : 1,
            type: 'meeting'
          };
        });
        
        setUpcomingMeetings(formattedScheduled);
      } catch (error) {
        console.error('❌ [Home] Error fetching meetings:', error);
        // Set empty arrays on error
        setRecentMeetings([]);
        setUpcomingMeetings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetings();
  }, [currentUser, location]); // Re-fetch when location changes (navigating back to home)

  // Helper function to calculate duration
  const calculateDuration = (startedAt, endedAt) => {
    if (!startedAt || !endedAt) return 'N/A';
    
    const start = startedAt.toDate ? startedAt.toDate() : new Date(startedAt);
    const end = endedAt.toDate ? endedAt.toDate() : new Date(endedAt);
    const durationMs = end - start;
    const minutes = Math.round(durationMs / 60000);
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  };

  // Instagram-style Skeleton Components
  const Shimmer = ({ className }) => (
    <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
    </div>
  );

  const SkeletonWelcome = () => (
    <div className="bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg p-8 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Shimmer className="h-8 w-64 rounded-lg" />
          <Shimmer className="h-5 w-48 rounded-lg" />
        </div>
        <Shimmer className="hidden md:block w-16 h-16 rounded-lg" />
      </div>
    </div>
  );

  const SkeletonQuickActions = () => (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <Shimmer className="h-6 w-32 rounded-lg mb-4" />
      <div className="space-y-3">
        <Shimmer className="h-12 w-full rounded-lg" />
        <Shimmer className="h-12 w-full rounded-lg" />
        <Shimmer className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );

  const SkeletonDeviceStatus = () => (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <Shimmer className="h-6 w-32 rounded-lg mb-4" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shimmer className="w-5 h-5 rounded-full" />
              <Shimmer className="h-4 w-24 rounded" />
            </div>
            <Shimmer className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  const SkeletonStat = () => (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-3 w-20 rounded" />
          <Shimmer className="h-7 w-12 rounded" />
        </div>
        <Shimmer className="w-14 h-14 rounded-lg" />
      </div>
      <div className="mt-4">
        <Shimmer className="h-3 w-28 rounded" />
      </div>
    </div>
  );

  const SkeletonMeeting = () => (
    <div className="border border-gray-200 dark:border-gray-600/50 rounded-lg p-4 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <Shimmer className="h-5 w-32 rounded" />
          <Shimmer className="h-3 w-40 rounded" />
          <div className="flex items-center space-x-2 mt-2">
            <Shimmer className="w-4 h-4 rounded-full" />
            <Shimmer className="h-3 w-24 rounded" />
          </div>
        </div>
        <Shimmer className="h-9 w-16 rounded-lg" />
      </div>
    </div>
  );

  const SkeletonMeetingsSection = ({ title }) => (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <Shimmer className="h-6 w-40 rounded-lg" />
        <Shimmer className="w-5 h-5 rounded" />
      </div>
      <div className="space-y-4">
        <SkeletonMeeting />
        <SkeletonMeeting />
      </div>
    </div>
  );

  const handleQuickJoin = () => {
    setShowJoinModal(true);
  };

  const handleCreateMeeting = () => {
    setShowCreateModal(true);
  };

  const stats = [
    {
      icon: <Video className="w-8 h-8 text-blue-600" />,
      title: 'Total Meetings',
      value: meetingStats.totalMeetings.toString(),
      change: meetingStats.totalMeetings > 0 ? '+' + meetingStats.totalMeetings : '0',
      changeColor: 'text-green-600'
    },
    {
      icon: <Users className="w-8 h-8 text-purple-600" />,
      title: 'Participants',
      value: meetingStats.totalParticipants.toString(),
      change: meetingStats.totalParticipants > 0 ? '+' + meetingStats.totalParticipants : '0',
      changeColor: 'text-green-600'
    },
    {
      icon: <Clock className="w-8 h-8 text-orange-600" />,
      title: 'Meeting Hours',
      value: meetingStats.totalHours > 0 ? `${meetingStats.totalHours}h` : '0h',
      change: meetingStats.totalHours > 0 ? `${meetingStats.totalHours}h` : '0h',
      changeColor: 'text-green-600'
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-green-600" />,
      title: 'Avg Rating',
      value: '4.8',
      change: '+0.2',
      changeColor: 'text-green-600'
    }
  ];

  // Show Instagram-style skeleton loading
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-8">
          {/* Skeleton Welcome */}
          <div className="mb-8">
            <SkeletonWelcome />
          </div>

          {/* Skeleton Quick Actions & Device Status */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <SkeletonQuickActions />
            <SkeletonDeviceStatus />
          </div>

          {/* Skeleton Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </div>

          {/* Skeleton Meetings */}
          <div className="grid lg:grid-cols-2 gap-8">
            <SkeletonMeetingsSection title="Upcoming" />
            <SkeletonMeetingsSection title="Recent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-8">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {userProfile?.displayName || currentUser?.displayName || 'User'}!
                </h1>
                <p className="text-blue-100 text-lg">Ready to connect and collaborate?</p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <Monitor className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-blue-900/20 backdrop-blur-xl border border-gray-200 dark:border-blue-700/50 rounded-xl shadow-md hover:shadow-lg p-6 transition-all duration-300 ease-in-out hover:bg-gray-50 hover:border-gray-300 dark:hover:bg-blue-900/30">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-blue-100 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleCreateMeeting}
                className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors duration-200"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Start Meeting</span>
              </button>
              
              <button
                onClick={handleQuickJoin}
                className="w-full flex items-center justify-center space-x-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg transition-colors duration-300 ease-in-out border border-gray-200 dark:border-gray-600 shadow-sm"
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-medium">Join Meeting</span>
              </button>
              
              <button
                onClick={() => setShowScheduleModal(true)}
                className="w-full flex items-center justify-center space-x-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg transition-colors duration-300 ease-in-out border border-gray-200 dark:border-gray-600 shadow-sm"
              >
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Schedule Meeting</span>
              </button>
              
              <button
                onClick={() => navigate('/assessments')}
                className="w-full flex items-center justify-center space-x-3 bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-200 py-3 px-4 rounded-lg transition-colors duration-300 ease-in-out border border-purple-200 dark:border-purple-700 shadow-sm"
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Assessments</span>
              </button>
            </div>
          </div>

          {/* Device Status */}
          <div className="bg-white dark:bg-green-900/20 backdrop-blur-xl border border-gray-200 dark:border-green-700/50 rounded-xl shadow-md hover:shadow-lg p-6 transition-all duration-300 ease-in-out hover:bg-gray-50 hover:border-gray-300 dark:hover:bg-green-900/30">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-green-100 mb-4">Device Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Camera className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-gray-700 dark:text-green-200">Camera</span>
                </div>
                <span className="text-green-600 dark:text-green-400 font-medium">Ready</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mic className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-gray-700 dark:text-green-200">Microphone</span>
                </div>
                <span className="text-green-600 dark:text-green-400 font-medium">Ready</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-green-200">Screen Share</span>
                </div>
                <span className="text-blue-600 dark:text-blue-400 font-medium">Available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-purple-900/20 backdrop-blur-xl border border-gray-200 dark:border-purple-700/50 rounded-xl shadow-md hover:shadow-lg p-6 transition-all duration-300 ease-in-out hover:bg-gray-50 hover:border-gray-300 hover:scale-105 dark:hover:bg-purple-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-purple-300 text-sm font-semibold">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-purple-100 mt-1">{stat.value}</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700/80 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                  {stat.icon}
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-semibold ${stat.changeColor}`}>{stat.change}</span>
                <span className="text-gray-500 dark:text-purple-400 text-sm ml-1">from last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Meetings Section */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Meetings */}
          <div className="bg-white dark:bg-amber-900/20 backdrop-blur-xl border border-gray-200 dark:border-amber-700/50 rounded-xl shadow-md hover:shadow-lg p-6 transition-all duration-300 ease-in-out hover:bg-gray-50 hover:border-gray-300 dark:hover:bg-amber-900/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-amber-100">Upcoming Meetings</h2>
              <Calendar className="w-5 h-5 text-gray-600 dark:text-amber-400" />
            </div>
            
            <div className="space-y-4">
              {upcomingMeetings.slice(0, 2).map((meeting) => (
                <div key={meeting.id} className="border border-gray-200 dark:border-amber-600/50 rounded-lg p-4 hover:bg-gray-100 hover:border-gray-300 hover:shadow-md hover:scale-[1.02] dark:hover:bg-amber-800/30 backdrop-blur-sm shadow-sm transition-all duration-300 ease-in-out">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-amber-100">{meeting.title}</h3>
                      <p className="text-gray-500 dark:text-amber-300 text-sm">{meeting.date}, {meeting.time}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-amber-400">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{meeting.participants} participants</span>
                      </div>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ease-in-out shadow-sm">
                      Join
                    </button>
                  </div>
                </div>
              ))}
              
              {upcomingMeetings.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-amber-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-70" />
                  <p className="font-medium">No upcoming meetings</p>
                </div>
              )}
              
              {upcomingMeetings.length > 2 && (
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-amber-600/50 rounded-lg text-gray-600 dark:text-amber-300 hover:bg-gray-100 dark:hover:bg-amber-800/30 hover:border-gray-400 dark:hover:border-amber-500 transition-all duration-300 ease-in-out font-medium flex items-center justify-center gap-2"
                >
                  <span>Show More</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Recent Meetings */}
          <div className="bg-white dark:bg-indigo-900/20 backdrop-blur-xl border border-gray-200 dark:border-indigo-700/50 rounded-xl shadow-md hover:shadow-lg p-6 transition-all duration-300 ease-in-out hover:bg-gray-50 hover:border-gray-300 dark:hover:bg-indigo-900/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-indigo-100">Recent Meetings</h2>
              <Clock className="w-5 h-5 text-gray-600 dark:text-indigo-400" />
            </div>
            
            <div className="space-y-4">
              {recentMeetings.slice(0, 2).map((meeting) => (
                <div key={meeting.id} className="border border-gray-200 dark:border-indigo-600/50 rounded-lg p-4 hover:bg-gray-100 hover:border-gray-300 hover:shadow-md hover:scale-[1.02] dark:hover:bg-indigo-800/30 backdrop-blur-sm shadow-sm transition-all duration-300 ease-in-out">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-indigo-100">{meeting.title}</h3>
                      <p className="text-gray-500 dark:text-indigo-300 text-sm">{meeting.date}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-indigo-400">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{meeting.duration} • {meeting.participants} participants</span>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-gray-400 dark:bg-indigo-500 rounded-full shadow-sm"></div>
                  </div>
                </div>
              ))}
              
              {recentMeetings.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-indigo-400">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-70" />
                  <p className="font-medium">No recent meetings</p>
                </div>
              )}
              
              {recentMeetings.length > 2 && (
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <span>Show More</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Footer - Desktop Only */}
      <div className="hidden md:block mt-12 pt-8 pb-4">
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          © 2026 ProComm. All rights reserved. · <Link to="/privacy" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Privacy</Link> · <Link to="/cookies" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Cookies</Link>
        </p>
      </div>

      {/* Chatbot Widget */}
      <Chatbot />

      {/* Modals */}
      <JoinMeetingModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
      />
      <CreateMeetingModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      <ScheduleMeetingModal 
        isOpen={showScheduleModal} 
        onClose={() => setShowScheduleModal(false)} 
      />
    </div>
  );
};

export default Home;