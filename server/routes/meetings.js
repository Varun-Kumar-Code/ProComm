const express = require('express');
const { v4: uuidV4 } = require('uuid');
const router = express.Router();

// In-memory storage (replace with database in production)
const meetings = new Map();

// Create a new meeting
router.post('/create', (req, res) => {
  try {
    const { title, description, participants, createdBy } = req.body;
    
    const meetingId = uuidV4();
    const meeting = {
      id: meetingId,
      title: title || 'Untitled Meeting',
      description: description || '',
      participants: participants || [],
      createdBy: createdBy || 'Anonymous',
      createdAt: new Date(),
      isActive: false,
      settings: {
        allowScreenShare: true,
        allowChat: true,
        muteParticipantsOnJoin: false
      }
    };
    
    meetings.set(meetingId, meeting);
    
    res.status(201).json({
      success: true,
      meeting: {
        id: meetingId,
        title: meeting.title,
        description: meeting.description,
        participants: meeting.participants,
        createdBy: meeting.createdBy,
        createdAt: meeting.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meeting'
    });
  }
});

// Get meeting details
router.get('/:meetingId', (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        participants: meeting.participants,
        createdBy: meeting.createdBy,
        createdAt: meeting.createdAt,
        isActive: meeting.isActive,
        settings: meeting.settings
      }
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meeting'
    });
  }
});

// Validate participant access
router.post('/:meetingId/validate-participant', (req, res) => {
  try {
    const { meetingId } = req.params;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    console.log(`Validating participant ${email} for meeting ${meetingId}`);
    console.log(`Meeting participants:`, meeting.participants);
    
    // Check if email is in the participants list (case-insensitive)
    const isAllowed = meeting.participants.length === 0 || 
                     meeting.participants.some(participantEmail => 
                       participantEmail.toLowerCase().trim() === email.toLowerCase().trim()
                     );
    
    console.log(`Is participant allowed: ${isAllowed}`);
    
    res.json({
      success: true,
      isAllowed: isAllowed,
      message: isAllowed ? 'Access granted' : 'You are not authorized to join this meeting'
    });
  } catch (error) {
    console.error('Error validating participant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate participant'
    });
  }
});

// Add participant to meeting
router.post('/:meetingId/participants', (req, res) => {
  try {
    const { meetingId } = req.params;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    // Check if participant already exists
    if (!meeting.participants.includes(email)) {
      meeting.participants.push(email);
      meetings.set(meetingId, meeting);
    }
    
    res.json({
      success: true,
      participants: meeting.participants
    });
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add participant'
    });
  }
});

// Update meeting settings
router.patch('/:meetingId/settings', (req, res) => {
  try {
    const { meetingId } = req.params;
    const settings = req.body;
    
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    meeting.settings = { ...meeting.settings, ...settings };
    meetings.set(meetingId, meeting);
    
    res.json({
      success: true,
      settings: meeting.settings
    });
  } catch (error) {
    console.error('Error updating meeting settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meeting settings'
    });
  }
});

// End meeting
router.delete('/:meetingId', (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    meetings.delete(meetingId);
    
    res.json({
      success: true,
      message: 'Meeting ended successfully'
    });
  } catch (error) {
    console.error('Error ending meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end meeting'
    });
  }
});

module.exports = router;