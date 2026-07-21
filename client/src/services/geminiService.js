import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

// Debug: Log if API key is loaded (only first 10 chars for security)
if (GEMINI_API_KEY) {
  console.log('✅ Gemini API key loaded:', GEMINI_API_KEY.substring(0, 10) + '...');
} else {
  console.error('❌ Gemini API key NOT found in environment variables');
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));
}

// Initialize the Gemini AI model
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// System prompt optimized for ProComm video conferencing app
const SYSTEM_PROMPT = `You are ProComm Assistant, a helpful AI chatbot for ProComm - a professional video conferencing application. Your role is to assist users with:

**Core Features:**
- Creating and joining meetings (instant or scheduled)
- Video/audio settings and troubleshooting
- Screen sharing functionality
- Chat and messaging during meetings
- Participant management
- Meeting scheduling and calendar integration

**Technical Support:**
- Camera and microphone permissions
- Connection issues and network problems
- Browser compatibility (Chrome, Firefox, Safari, Edge)
- Audio/video quality optimization
- Screen sharing problems

**Account & Settings:**
- User profile management
- Theme preferences (light/dark mode)
- Notification settings
- Security and privacy features

**Meeting Features:**
- Real-time chat during meetings
- Whiteboard collaboration
- Recording capabilities
- Participant invitations
- Meeting links and IDs

**Guidelines:**
- Be friendly, professional, and concise
- Provide step-by-step instructions when needed
- Offer troubleshooting tips for common issues
- If you don't know something specific about ProComm, acknowledge it honestly
- Always prioritize user privacy and security
- Suggest contacting support for account-specific or billing issues

Keep responses clear, helpful, and focused on video conferencing needs. Use emojis sparingly for a professional tone.`;

/**
 * Generate a response using Gemini AI
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<string>} - AI-generated response
 */
export const generateGeminiResponse = async (userMessage, conversationHistory = []) => {
  try {
    // Validate API key
    if (!GEMINI_API_KEY) {
      console.error('❌ API key validation failed');
      throw new Error('API key not configured. Please add REACT_APP_GEMINI_API_KEY to Vercel environment variables.');
    }

    // Use gemini-2.5-flash-lite model (optimized for speed and efficiency)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500,
      },
    });

    // Build conversation context
    let contextPrompt = SYSTEM_PROMPT + '\n\n';
    
    // Add recent conversation history (last 6 messages for context)
    const recentHistory = conversationHistory.slice(-6);
    if (recentHistory.length > 0) {
      contextPrompt += 'Recent conversation:\n';
      recentHistory.forEach(msg => {
        contextPrompt += `${msg.isBot ? 'Assistant' : 'User'}: ${msg.text}\n`;
      });
      contextPrompt += '\n';
    }

    // Add current user message
    contextPrompt += `User: ${userMessage}\nAssistant:`;

    // Generate response
    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    const text = response.text();
    
    return text.trim();
  } catch (error) {
    console.error('Error generating Gemini response:', error);
    
    // Provide helpful fallback responses
    if (error.message?.includes('API key')) {
      return "I'm having trouble connecting to my AI service. Please check the API key configuration.";
    } else if (error.message?.includes('quota')) {
      return "I'm experiencing high demand right now. Please try again in a moment.";
    } else if (error.message?.includes('safety')) {
      return "I cannot respond to that message due to safety guidelines. Please rephrase your question.";
    }
    
    return getFallbackResponse(userMessage);
  }
};

/**
 * Fallback responses when AI is unavailable
 */
const getFallbackResponse = (userMessage) => {
  const lowerMessage = userMessage.toLowerCase();
  
  // Meeting-related queries
  if (lowerMessage.includes('create') || lowerMessage.includes('start')) {
    return "To create a meeting, click the 'Create Meeting' button on the home page. You can start an instant meeting or schedule one for later.";
  }
  
  if (lowerMessage.includes('join')) {
    return "To join a meeting, click 'Join Meeting' on the home page and enter the meeting ID provided by the host.";
  }
  
  // Technical issues
  if (lowerMessage.includes('camera') || lowerMessage.includes('video')) {
    return "For camera issues: 1) Check browser permissions, 2) Ensure no other app is using your camera, 3) Try refreshing the page. Go to Settings > Video to test your camera.";
  }
  
  if (lowerMessage.includes('microphone') || lowerMessage.includes('audio') || lowerMessage.includes('sound')) {
    return "For audio issues: 1) Check browser permissions, 2) Verify your microphone is connected, 3) Test audio in Settings. Make sure you're not muted in the meeting.";
  }
  
  if (lowerMessage.includes('screen share') || lowerMessage.includes('screen sharing')) {
    return "To share your screen during a meeting, click the screen share icon in the meeting controls. Select which window or screen you want to share.";
  }
  
  // Connection issues
  if (lowerMessage.includes('connection') || lowerMessage.includes('network') || lowerMessage.includes('lag')) {
    return "For connection issues: 1) Check your internet connection, 2) Close unnecessary tabs/apps, 3) Try switching to a wired connection if possible, 4) Lower video quality in settings.";
  }
  
  // Account/settings
  if (lowerMessage.includes('profile') || lowerMessage.includes('account')) {
    return "You can manage your profile by clicking on your avatar in the top-right corner and selecting 'Profile'. Update your name, photo, and preferences there.";
  }
  
  if (lowerMessage.includes('schedule')) {
    return "To schedule a meeting, use the 'Schedule Meeting' option on the home page. Set the date, time, and invite participants. They'll receive notifications before the meeting starts.";
  }
  
  // Default response
  return "I can help you with creating/joining meetings, troubleshooting audio/video issues, screen sharing, scheduling, and more. What would you like to know about ProComm?";
};

// Export as named export primarily, default export for compatibility
const geminiService = {
  generateGeminiResponse,
};

export default geminiService;
