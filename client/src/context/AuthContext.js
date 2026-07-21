import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../firebase/config';

// Create Auth Context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sign in with Email and Password
  const loginWithEmail = async (email, password) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  // Sign up with Email and Password
  const signUpWithEmail = async (email, password) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  // Sign in with Google
  const loginWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  // Sign in with Apple
  const loginWithApple = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, appleProvider);
      return result.user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userEmail');
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  // Delete user account
  const deleteAccount = async (password = null) => {
    try {
      setError(null);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('No user is currently signed in');
      }

      // Check the provider to determine reauthentication method
      const providerData = user.providerData;
      const isEmailProvider = providerData.some(p => p.providerId === 'password');
      const isGoogleProvider = providerData.some(p => p.providerId === 'google.com');
      const isAppleProvider = providerData.some(p => p.providerId === 'apple.com');

      // Reauthenticate based on provider
      if (isEmailProvider && password) {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      } else if (isGoogleProvider) {
        await reauthenticateWithPopup(user, googleProvider);
      } else if (isAppleProvider) {
        await reauthenticateWithPopup(user, appleProvider);
      }

      // Delete the user from Firebase Auth
      await deleteUser(user);
      
      // Clear local storage
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userSettings');
      
      console.log('✅ User account deleted successfully');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(getErrorMessage(err.code) || err.message);
      throw err;
    }
  };

  // Check if user signed in with email/password
  const isEmailPasswordUser = () => {
    const user = auth.currentUser;
    if (!user) return false;
    return user.providerData.some(p => p.providerId === 'password');
  };

  // Clear error
  const clearError = () => setError(null);

  // Get user-friendly error messages
  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email. Please sign up first.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled. Please try again.';
      case 'auth/cancelled-popup-request':
        return 'Only one popup request is allowed at a time.';
      case 'auth/popup-blocked':
        return 'Popup was blocked. Please allow popups for this site.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email but different sign-in credentials.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. If you don\'t have an account, please sign up first.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', user.email);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading,
    error,
    loginWithEmail,
    signUpWithEmail,
    loginWithGoogle,
    loginWithApple,
    logout,
    resetPassword,
    deleteAccount,
    isEmailPasswordUser,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
