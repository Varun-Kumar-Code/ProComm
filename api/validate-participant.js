// API endpoint for validating meeting participants
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { meetingId, participantId, name, email } = req.body || {};
      
      // Simple validation - in production, check against database
      if (!meetingId) {
        return res.status(400).json({
          success: false,
          error: 'Missing meetingId'
        });
      }

      // For now, allow all participants (you can add validation logic later)
      return res.status(200).json({
        success: true,
        isAllowed: true,
        message: 'Participant validated successfully',
        meeting: {
          id: meetingId,
          title: 'ProComm Meeting',
          isActive: true
        },
        participant: {
          id: participantId || 'participant-' + Date.now(),
          name: name || 'Anonymous User',
          email: email || '',
          joinedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error validating participant:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  if (req.method === 'GET') {
    const { meetingId } = req.query;
    
    return res.status(200).json({
      success: true,
      meeting: {
        id: meetingId,
        title: 'ProComm Meeting',
        isActive: true,
        participants: []
      }
    });
  }

  return res.status(405).json({ 
    success: false, 
    error: `Method ${req.method} not allowed` 
  });
}
