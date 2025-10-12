import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Support from './pages/Support';
import VideoRoom from './pages/VideoRoom';

// Components
import Navbar from './components/Navbar';
import TestComponent from './components/TestComponent';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#0f172a] dark:text-gray-100 transition-colors duration-300 ease-in-out">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <>
              <Navbar />
              <Home />
            </>
          } />
          <Route path="/profile" element={
            <>
              <Navbar />
              <Profile />
            </>
          } />
          <Route path="/support" element={
            <>
              <Navbar />
              <Support />
            </>
          } />
          <Route path="/room/:roomId" element={<VideoRoom />} />
          <Route path="/test" element={<TestComponent />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;