const express = require('express');
const router = express.Router();

// Mock user database (replace with real database in production)
const users = new Map([
  ['admin@procomm.com', { 
    id: '1', 
    name: 'Admin User', 
    email: 'admin@procomm.com', 
    password: 'admin123',
    role: 'admin'
  }],
  ['varun@gmail.com', { 
    id: '2', 
    name: 'Varun Kumar', 
    email: 'varun@gmail.com', 
    password: 'password123',
    role: 'user'
  }]
]);

// Login endpoint
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    const user = users.get(email.toLowerCase());
    
    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // In production, use JWT tokens
    const token = `mock-token-${user.id}-${Date.now()}`;
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Register endpoint
router.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email and password are required'
      });
    }
    
    if (users.has(email.toLowerCase())) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }
    
    const userId = (users.size + 1).toString();
    const newUser = {
      id: userId,
      name,
      email: email.toLowerCase(),
      password,
      role: 'user'
    };
    
    users.set(email.toLowerCase(), newUser);
    
    // In production, use JWT tokens
    const token = `mock-token-${userId}-${Date.now()}`;
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Get user profile
router.get('/profile', (req, res) => {
  try {
    // Mock authentication check (replace with proper JWT verification)
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    // Mock user (in production, decode JWT and fetch user)
    const mockUser = {
      id: '2',
      name: 'Varun Kumar',
      email: 'varun@gmail.com',
      role: 'user',
      bio: 'Software developer passionate about creating innovative solutions.',
      avatar: null,
      settings: {
        theme: 'light',
        notifications: true,
        autoJoinAudio: true,
        autoJoinVideo: true
      }
    };
    
    res.json({
      success: true,
      user: mockUser
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// Update user profile
router.patch('/profile', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const { name, bio, settings } = req.body;
    
    // Mock update (in production, update database)
    const updatedUser = {
      id: '2',
      name: name || 'Varun Kumar',
      email: 'varun@gmail.com',
      role: 'user',
      bio: bio || 'Software developer passionate about creating innovative solutions.',
      avatar: null,
      settings: {
        theme: settings?.theme || 'light',
        notifications: settings?.notifications !== undefined ? settings.notifications : true,
        autoJoinAudio: settings?.autoJoinAudio !== undefined ? settings.autoJoinAudio : true,
        autoJoinVideo: settings?.autoJoinVideo !== undefined ? settings.autoJoinVideo : true
      }
    };
    
    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

module.exports = router;