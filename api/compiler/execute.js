import axios from 'axios';

// JDoodle API Configuration
const JDOODLE_API_URL = 'https://api.jdoodle.com/v1/execute';
const CLIENT_ID = process.env.JDOODLE_CLIENT_ID;
const CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET;

// Language version mappings for JDoodle API
const LANGUAGE_VERSIONS = {
  c: { language: 'c', versionIndex: '5' },
  cpp: { language: 'cpp17', versionIndex: '0' },
  java: { language: 'java', versionIndex: '4' },
  python: { language: 'python3', versionIndex: '4' },
  csharp: { language: 'csharp', versionIndex: '4' }
};

const handler = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { language, code, stdin = '' } = req.body;

    // Validate request
    if (!language || !code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: language and code'
      });
    }

    // Validate credentials
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('❌ JDoodle credentials missing:', { 
        hasClientId: !!CLIENT_ID, 
        hasClientSecret: !!CLIENT_SECRET 
      });
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: JDoodle credentials not set'
      });
    }

    // Validate language
    if (!LANGUAGE_VERSIONS[language]) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}`
      });
    }

    const { language: jdoodleLanguage, versionIndex } = LANGUAGE_VERSIONS[language];

    // Prepare request payload for JDoodle
    const payload = {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      script: code,
      language: jdoodleLanguage,
      versionIndex: versionIndex,
      stdin: stdin
    };

    console.log('📤 Sending request to JDoodle API:', {
      language: jdoodleLanguage,
      codeLength: code.length,
      hasInput: !!stdin
    });

    // Make API request to JDoodle
    const response = await axios.post(JDOODLE_API_URL, payload, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 JDoodle API response:', {
      statusCode: response.data.statusCode,
      hasOutput: !!response.data.output
    });

    // Return response
    res.status(200).json({
      success: response.data.statusCode === 200,
      output: response.data.output || 'No output',
      statusCode: response.data.statusCode,
      memory: response.data.memory,
      cpuTime: response.data.cpuTime,
      error: response.data.statusCode !== 200
    });

  } catch (error) {
    console.error('❌ Compiler API error:', error.message);

    // Handle different error types
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        return res.status(401).json({
          success: false,
          output: 'Authentication failed. Please check JDoodle API credentials.',
          error: true
        });
      } else if (status === 429) {
        return res.status(429).json({
          success: false,
          output: 'Rate limit exceeded. Please try again later.',
          error: true
        });
      } else if (status === 400) {
        return res.status(400).json({
          success: false,
          output: `Bad request: ${data.error || 'Invalid code or configuration'}`,
          error: true
        });
      } else {
        return res.status(status).json({
          success: false,
          output: `Server error: ${data.error || 'Please try again later'}`,
          error: true
        });
      }
    } else if (error.request) {
      return res.status(503).json({
        success: false,
        output: 'Network error. Unable to reach JDoodle API.',
        error: true
      });
    } else {
      return res.status(500).json({
        success: false,
        output: error.message || 'An unexpected error occurred.',
        error: true
      });
    }
  }
};

export default handler;
