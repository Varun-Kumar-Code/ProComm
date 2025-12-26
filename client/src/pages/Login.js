import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User, Lock, Eye, EyeOff, Mail, AlertCircle, Video, Users, Globe, Zap, Shield, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createUserProfile, getUserProfile } from '../firebase/firestoreService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const navigate = useNavigate();
  const { 
    loginWithEmail, 
    signUpWithEmail, 
    loginWithGoogle, 
    loginWithApple, 
    resetPassword,
    error, 
    clearError 
  } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();
    
    try {
      if (isSignUp) {
        // Validate display name
        if (!displayName.trim()) {
          throw new Error('Please enter your name');
        }
        // Create Firebase Auth account
        const user = await signUpWithEmail(email, password);
        // Create user profile in Firestore
        await createUserProfile(user.uid, displayName.trim(), '');
      } else {
        await loginWithEmail(email, password);
      }
      navigate('/');
    } catch (err) {
      console.error('Authentication error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    clearError();
    
    try {
      const user = await loginWithGoogle();
      // Check if user profile exists, if not create one
      const profile = await getUserProfile(user.uid);
      if (!profile) {
        await createUserProfile(user.uid, user.displayName || 'User', '');
      }
      navigate('/');
    } catch (err) {
      console.error('Google login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    clearError();
    
    try {
      const user = await loginWithApple();
      // Check if user profile exists, if not create one
      const profile = await getUserProfile(user.uid);
      if (!profile) {
        await createUserProfile(user.uid, user.displayName || 'User', '');
      }
      navigate('/');
    } catch (err) {
      console.error('Apple login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      return;
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      await resetPassword(email);
      setResetEmailSent(true);
    } catch (err) {
      console.error('Password reset error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setDisplayName('');
    clearError();
    setShowForgotPassword(false);
    setResetEmailSent(false);
  };

  return (
    <div className="min-h-screen flex transition-colors duration-300 bg-gray-50 dark:bg-gray-900 lg:bg-gray-50 lg:dark:bg-gray-900">
      {/* Mobile Gradient Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 z-0">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
      </div>
      
      {/* Left Side - Branding & Features (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-12 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        
        <div className="relative z-10 flex flex-col justify-between w-full text-white">
          {/* Logo & Brand */}
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-2xl">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">ProComm</h1>
                <p className="text-blue-100 text-sm">Professional Communication</p>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold mb-4 leading-tight">
                Connect with your team<br />anytime, anywhere
              </h2>
              <p className="text-blue-100 text-lg">
                Experience seamless video conferencing with enterprise-grade security
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-4 mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="bg-blue-500/30 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-1">HD Video</h3>
                <p className="text-sm text-blue-100">Crystal clear video quality</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="bg-purple-500/30 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-1">Team Chat</h3>
                <p className="text-sm text-blue-100">Real-time collaboration</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="bg-indigo-500/30 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-1">Secure</h3>
                <p className="text-sm text-blue-100">End-to-end encryption</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="bg-pink-500/30 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-1">Fast</h3>
                <p className="text-sm text-blue-100">Lightning-quick setup</p>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mt-8">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-lg mb-4 italic">
                "ProComm has transformed how our remote team collaborates. The video quality is exceptional!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full"></div>
                <div>
                  <p className="font-semibold">Sarah Johnson</p>
                  <p className="text-sm text-blue-100">Product Manager, TechCorp</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-blue-100">
            <p>© 2025 ProComm. All rights reserved.</p>
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span>Available worldwide</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login/Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-6 md:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6 pt-8">
            <div className="flex justify-center items-center gap-2 mb-3">
              <div className="bg-white p-2.5 rounded-xl shadow-xl">
                <Camera className="w-7 h-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                ProComm
              </h1>
            </div>
            <p className="text-white/90 text-sm">Professional Communication</p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 transition-colors duration-300">
            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1.5">
                {showForgotPassword 
                  ? 'Reset Password' 
                  : isSignUp 
                    ? 'Create Account' 
                    : 'Welcome Back'}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {showForgotPassword 
                  ? 'Enter your email to receive reset instructions' 
                  : isSignUp 
                    ? 'Start your journey with ProComm' 
                    : 'Sign in to continue'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</span>
              </div>
            )}

            {/* Reset Email Sent Message */}
            {resetEmailSent && (
              <div className="mb-5 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300">
                <p className="text-sm font-medium">✓ Password reset email sent! Check your inbox.</p>
              </div>
            )}

            {/* Forgot Password Form */}
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4 sm:space-y-6">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 sm:left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                      type="email"
                      id="reset-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-500"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-3.5 px-4 text-sm sm:text-base rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                    clearError();
                  }}
                  className="w-full text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold bg-transparent border-none cursor-pointer transition-colors text-sm sm:text-base"
                >
                  ← Back to Sign In
                </button>
              </form>
            ) : (
              <>
                {/* Login/Sign Up Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Field - Only show during Sign Up */}
                  {isSignUp && (
                    <div>
                      <label htmlFor="displayName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <div className="relative group">
                        <User className="absolute left-3.5 sm:left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="text"
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-500"
                          placeholder="John Doe"
                          required
                          minLength={2}
                          maxLength={100}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 sm:left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-500"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 sm:left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 sm:pl-12 pr-11 sm:pr-12 py-3 sm:py-3.5 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-500"
                        placeholder={isSignUp ? "Min 6 characters" : "Enter password"}
                        required
                        minLength={isSignUp ? 6 : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {!isSignUp && (
                    <div className="text-right -mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(true);
                          clearError();
                        }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold bg-transparent border-none cursor-pointer transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-3.5 px-4 text-sm sm:text-base rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      isSignUp ? 'Create Account' : 'Sign In'
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="my-6 flex items-center">
                  <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                  <span className="px-3 sm:px-4 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Or continue with</span>
                  <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                </div>

                {/* Social Login Buttons */}
                <div className="space-y-3">
                  {/* Google Login */}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-3 sm:py-3.5 px-4 text-sm sm:text-base rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-[1.02] hover:shadow-md"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* Apple Login */}
                  <button
                    onClick={handleAppleLogin}
                    disabled={isLoading}
                    className="w-full bg-black hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-semibold py-3 sm:py-3.5 px-4 text-sm sm:text-base rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-[1.02] hover:shadow-md"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <span>Continue with Apple</span>
                  </button>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <button 
                      onClick={toggleMode}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold bg-transparent border-none cursor-pointer transition-colors"
                    >
                      {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                  </p>
                </div>

                {/* Terms */}
                {isSignUp && (
                  <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400 leading-relaxed">
                    By signing up, you agree to our{' '}
                    <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">Terms of Service</span>
                    {' '}and{' '}
                    <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">Privacy Policy</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;