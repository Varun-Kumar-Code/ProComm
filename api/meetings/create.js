// API endpoint for creating meetings
import { v4 as uuidV4 } from 'uuid';

// Simple in-memory storage (in production, use a database)
const meetings = new Map();

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { title, description, participants, createdBy } = req.body || {};
      
      const meetingId = uuidV4();
      const meeting = {
        id: meetingId,
        title: title || 'Untitled Meeting',
        description: description || '',
        participants: participants || [],
        createdBy: createdBy || 'Anonymous',
        createdAt: new Date().toISOString(),
        isActive: false
      };
      
      // Store meeting
      meetings.set(meetingId, meeting);
      
      return res.status(201).json({
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
      return res.status(500).json({
        success: false,
        error: 'Failed to create meeting'
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    error: `Method ${req.method} not allowed` 
  });
}