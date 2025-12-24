import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Menu, X, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../firebase/firestoreService';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch user profile from Firestore
  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching profile for navbar:', error);
        }
      }
    };
    fetchProfile();
  }, [currentUser]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      setIsMobileMenuOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Get display name (from profile, currentUser, or fallback)
  const displayName = userProfile?.displayName || currentUser?.displayName || 'User';
  
  // Get profile picture (from profile or default)
  const profilePicUrl = userProfile?.profilePicUrl || null;

  return (
    <div className="px-4 pt-6 pb-2">
      <nav className="bg-white dark:bg-blue-700 text-gray-900 dark:text-white shadow-md dark:shadow-xl border border-gray-200 dark:border-white/10 transition-all duration-300 ease-in-out rounded-xl max-w-5xl mx-auto">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-white/10 p-2 rounded-lg">
                <Camera className="w-6 h-6 text-blue-600 dark:text-white" />
              </div>
              <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-200 transition-colors duration-300">
                ProComm
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {/* Navigation items removed */}
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 px-4 py-2 rounded-xl text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300"
                >
                  {profilePicUrl ? (
                    <img 
                      src={profilePicUrl} 
                      alt={displayName}
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                  <span className="font-medium">{displayName}</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 backdrop-blur-sm">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200 mx-2 rounded-lg"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200 mx-2 rounded-lg"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    <hr className="my-2 border-gray-200 dark:border-gray-600" />
                    <button
                      className="flex items-center w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 mx-2 rounded-lg"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-white/20 mt-2">
              <div className="px-2 pt-4 pb-6 space-y-2">
                <Link
                  to="/profile"
                  className="block px-4 py-3 rounded-xl font-medium text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-3 rounded-xl font-medium text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  className="block w-full text-left px-4 py-3 rounded-xl font-medium text-red-600 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-500/20 transition-all duration-300"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;