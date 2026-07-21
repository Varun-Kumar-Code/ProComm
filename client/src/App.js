import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import LandingPage from './pages/LandingPage';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Support from './pages/Support';
import VideoRoom from './pages/VideoRoom';
import TestMeetingHistory from './pages/TestMeetingHistory';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import AssessmentDashboard from './pages/AssessmentDashboard';
import CreateAssessment from './pages/CreateAssessment';
import TakeAssessment from './pages/TakeAssessment';
import MonitorProctoring from './pages/MonitorProctoring';
import AssessmentMonitorRoom from './pages/AssessmentMonitorRoom';
import AssessmentResults from './pages/AssessmentResults';

// Components
import Navbar from './components/Navbar';
import TestComponent from './components/TestComponent';

// Context
import { AuthProvider } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Home Route Component - Shows landing page for non-authenticated, dashboard for authenticated
const HomeRoute = () => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (isAuthenticated) {
    return (
      <>
        <Navbar />
        <Home />
      </>
    );
  }
  
  return <LandingPage />;
};

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#0f172a] dark:text-gray-100 transition-colors duration-300 ease-in-out">
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/" element={<HomeRoute />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Navbar />
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Navbar />
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute>
                <Navbar />
                <Support />
              </ProtectedRoute>
            } />
            <Route path="/room/:roomId" element={
              <ProtectedRoute>
                <VideoRoom />
              </ProtectedRoute>
            } />
            <Route path="/test" element={<TestComponent />} />
            <Route path="/test-meeting-history" element={
              <ProtectedRoute>
                <Navbar />
                <TestMeetingHistory />
              </ProtectedRoute>
            } />
            <Route path="/assessments" element={
              <ProtectedRoute>
                <Navbar />
                <AssessmentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/assessments/create" element={
              <ProtectedRoute>
                <Navbar />
                <CreateAssessment />
              </ProtectedRoute>
            } />
            <Route path="/assessments/edit/:assessmentId" element={
              <ProtectedRoute>
                <Navbar />
                <CreateAssessment />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:assessmentId/take" element={
              <ProtectedRoute>
                <TakeAssessment />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:assessmentId/monitor" element={
              <ProtectedRoute>
                <Navbar />
                <MonitorProctoring />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:assessmentId/monitor/live" element={
              <ProtectedRoute>
                <AssessmentMonitorRoom />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:assessmentId/results/:attemptId" element={
              <ProtectedRoute>
                <Navbar />
                <AssessmentResults />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Analytics />
      </div>
    </AuthProvider>
  );
}

export default App;