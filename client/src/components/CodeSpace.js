import React, { useState, useEffect } from 'react';
import { X, Play, Loader2, Code2, Terminal, ChevronDown, FileCode, Copy, Check, Download, Trash2 } from 'lucide-react';
import { compileCode, getLanguageDisplayName, getDefaultCode } from '../services/compilerService';

const CodeSpace = ({ isOpen, onClose }) => {
  // State management
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(getDefaultCode('python'));
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('output'); // 'input' or 'output'
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [executionStats, setExecutionStats] = useState(null);

  // Language configurations
  const languages = [
    { id: 'c', name: 'C', icon: '🔵' },
    { id: 'cpp', name: 'C++', icon: '🔷' },
    { id: 'java', name: 'Java', icon: '☕' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'csharp', name: 'C#', icon: '💜' }
  ];

  // Handle language change
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setCode(getDefaultCode(newLanguage));
    setOutput('');
    setExecutionStats(null);
    setShowLanguageMenu(false);
  };

  // Handle code execution
  const handleRunCode = async () => {
    if (!code.trim()) {
      setOutput('❌ Error: Please write some code first!');
      setActiveTab('output');
      return;
    }

    setIsRunning(true);
    setOutput('⏳ Compiling and executing...\n');
    setActiveTab('output');
    setExecutionStats(null);

    try {
      const result = await compileCode(language, code, input);
      
      if (result.success) {
        setOutput(result.output || 'Program executed successfully with no output.');
        setExecutionStats({
          memory: result.memory,
          cpuTime: result.cpuTime,
          status: 'Success'
        });
      } else {
        setOutput(result.output || 'Execution failed.');
        setExecutionStats({
          status: 'Error'
        });
      }
    } catch (error) {
      setOutput(`❌ Unexpected Error:\n${error.message}`);
      setExecutionStats({
        status: 'Error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Download code as file
  const handleDownloadCode = () => {
    const extensions = { c: 'c', cpp: 'cpp', java: 'java', python: 'py', csharp: 'cs' };
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${extensions[language]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear code
  const handleClearCode = () => {
    if (window.confirm('Are you sure you want to clear the code?')) {
      setCode(getDefaultCode(language));
      setOutput('');
      setInput('');
      setExecutionStats(null);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full h-full max-w-[98vw] max-h-[98vh] bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10 backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Code Space</h2>
              <p className="text-sm text-gray-300">Write. Compile. Execute.</p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 group"
              title="Copy Code"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-gray-300 group-hover:text-white" />
              )}
            </button>
            <button
              onClick={handleDownloadCode}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 group"
              title="Download Code"
            >
              <Download className="w-5 h-5 text-gray-300 group-hover:text-white" />
            </button>
            <button
              onClick={handleClearCode}
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 transition-all duration-200 group"
              title="Clear Code"
            >
              <Trash2 className="w-5 h-5 text-gray-300 group-hover:text-red-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 transition-all duration-200 group"
            >
              <X className="w-5 h-5 text-gray-300 group-hover:text-red-400" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-800/50 border-b border-white/5">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-white/20 rounded-xl transition-all duration-200 group"
            >
              <FileCode className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold">{getLanguageDisplayName(language)}</span>
              <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${showLanguageMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Language Dropdown */}
            {showLanguageMenu && (
              <div className="absolute top-full mt-2 left-0 bg-gray-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-10 min-w-[200px]">
                {languages.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => handleLanguageChange(lang.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/10 transition-all duration-200 ${
                      language === lang.id ? 'bg-blue-600/20 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <span className="text-2xl">{lang.icon}</span>
                    <span className="text-white font-medium">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl text-white font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Run Code</span>
              </>
            )}
          </button>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Code Editor */}
          <div className="flex-1 flex flex-col border-r border-white/10">
            <div className="flex items-center px-4 py-2 bg-gray-800/30 border-b border-white/5">
              <FileCode className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-300 font-medium">Editor</span>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full bg-[#1e1e1e] text-gray-100 p-4 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none font-mono text-sm leading-relaxed"
                style={{ 
                  fontSize: '14px',
                  tabSize: 4,
                  lineHeight: '1.6'
                }}
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          </div>

          {/* Right: Input/Output */}
          <div className="w-[40%] flex flex-col bg-gray-800/30">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('input')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 font-medium transition-all duration-200 ${
                  activeTab === 'input'
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Input</span>
              </button>
              <button
                onClick={() => setActiveTab('output')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 font-medium transition-all duration-200 ${
                  activeTab === 'output'
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Output</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTab === 'input' ? (
                <div className="flex-1 flex flex-col p-4">
                  <label className="text-sm text-gray-400 mb-2 font-medium">Standard Input (stdin)</label>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-gray-900/50 text-gray-100 p-4 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none font-mono text-sm transition-all duration-200"
                    placeholder="Enter input for your program..."
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-400 font-medium">Output</label>
                    {executionStats && (
                      <div className="flex items-center space-x-3 text-xs">
                        {executionStats.status === 'Success' ? (
                          <>
                            <span className="text-green-400">✓ Success</span>
                            {executionStats.memory && (
                              <span className="text-gray-400">Memory: {executionStats.memory}</span>
                            )}
                            {executionStats.cpuTime && (
                              <span className="text-gray-400">Time: {executionStats.cpuTime}s</span>
                            )}
                          </>
                        ) : (
                          <span className="text-red-400">✗ Error</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 bg-gray-900/50 p-4 rounded-lg border border-white/10 overflow-auto">
                    <pre className="text-gray-100 font-mono text-sm whitespace-pre-wrap break-words">
                      {output || '// Output will appear here after running your code...'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-800/50 border-t border-white/5 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            <span className="font-medium text-gray-300">Tip:</span> Press <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Esc</kbd> to close
          </div>
          <div className="text-xs text-gray-500">
            Powered by JDoodle API
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeSpace;
