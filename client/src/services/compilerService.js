import axios from 'axios';

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';

// Use relative URL in production (Vercel), absolute URL in development
const API_BASE_URL = isDevelopment ? 'http://localhost:3002' : '';

console.log('🔧 Compiler Service initialized:', { 
  isDevelopment, 
  apiUrl: API_BASE_URL || 'relative (production)',
  hostname: window.location.hostname
});

/**
 * Compile and execute code using our backend API
 * @param {string} language - Programming language (c, cpp, java, python, csharp)
 * @param {string} code - Source code to compile and run
 * @param {string} stdin - Standard input for the program
 * @returns {Promise<Object>} - Compilation and execution result
 */
export const compileCode = async (language, code, stdin = '') => {
  try {
    // Validate inputs
    if (!language || !code) {
      throw new Error('Missing required fields: language and code');
    }

    console.log('📤 Sending compilation request:', { language, codeLength: code.length });

    // Make API request to our backend
    const response = await axios.post(`${API_BASE_URL}/api/compiler/execute`, {
      language,
      code,
      stdin
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Compilation response:', response.data);

    // Return the response from our backend
    return {
      success: response.data.success,
      output: response.data.output || 'No output',
      statusCode: response.data.statusCode,
      memory: response.data.memory,
      cpuTime: response.data.cpuTime,
      error: response.data.error
    };

  } catch (error) {
    console.error('❌ Compilation error:', error);

    // Handle different error types
    if (error.response) {
      // Backend returned an error response
      const data = error.response.data;
      return {
        success: false,
        output: data.output || data.error || 'An error occurred during compilation',
        error: true
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        success: false,
        output: 'Network error. Unable to reach the compiler server. Please check your connection.',
        error: true
      };
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      return {
        success: false,
        output: 'Request timeout. The code execution took too long.',
        error: true
      };
    } else {
      // Other errors
      return {
        success: false,
        output: error.message || 'An unexpected error occurred.',
        error: true
      };
    }
  }
};

/**
 * Get language display name
 */
export const getLanguageDisplayName = (language) => {
  const names = {
    c: 'C',
    cpp: 'C++',
    java: 'Java',
    python: 'Python',
    csharp: 'C#'
  };
  return names[language] || language;
};

/**
 * Get default code template for a language
 */
export const getDefaultCode = (language) => {
  const templates = {
    c: `#include <stdio.h>

int main() {
    printf("Hello from Code Space!\\n");
    return 0;
}`,
    cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from Code Space!" << endl;
    return 0;
}`,
    java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Code Space!");
    }
}`,
    python: `# Python Code
print("Hello from Code Space!")`,
    csharp: `using System;

public class Program {
    public static void Main(string[] args) {
        Console.WriteLine("Hello from Code Space!");
    }
}`
  };
  return templates[language] || '';
};
