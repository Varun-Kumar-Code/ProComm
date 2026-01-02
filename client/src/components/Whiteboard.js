import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Palette, Square, Minus, Eraser, RotateCcw, X, Circle, 
  Type, Download, Undo2, Redo2, Save, Pen, Edit3
} from 'lucide-react';

const Whiteboard = ({ isOpen, onClose, initialData, onSave }) => {
  console.log('🖊️ Whiteboard component rendered with isOpen:', isOpen);
  
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#1F2937');
  const [brushSize, setBrushSize] = useState(3);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [fontSize, setFontSize] = useState(16);

  const colors = [
    '#1F2937', '#EF4444', '#10B981', '#F59E0B',
    '#3B82F6', '#8B5CF6', '#F97316', '#06B6D4', 
    '#84CC16', '#EC4899', '#6366F1', '#FFFFFF',
    '#FCA5A5', '#86EFAC', '#FDE047', '#93C5FD'
  ];

  // Save canvas state to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL();
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(dataURL);
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
    }
  }, [history, historyStep]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && isOpen) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      // Set canvas size to match displayed size for perfect pixel mapping
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Configure context for smooth drawing
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Set white background with subtle grid
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw subtle grid
      drawGrid(ctx, canvas.width, canvas.height);
      
      // Load initial data if available
      if (initialData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          saveToHistory();
        };
        img.src = initialData;
      } else {
        saveToHistory();
      }
    }
  }, [isOpen, initialData]);

  // Draw grid helper
  const drawGrid = (ctx, width, height) => {
    const gridSize = 20;
    ctx.strokeStyle = '#F3F4F6';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  // Get precise mouse coordinates relative to canvas
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factors
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (currentTool === 'text') {
      setTextPosition(pos);
      setShowTextInput(true);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    
    // For shapes and lines, store the starting point
    if (['rectangle', 'circle', 'line'].includes(currentTool)) {
      // Save current canvas state for preview
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.imageData = imageData;
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getMousePos(e);
    
    if (currentTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 3;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (currentTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor + '40'; // Add transparency
      ctx.lineWidth = brushSize * 4;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (['rectangle', 'circle', 'line'].includes(currentTool)) {
      // Restore canvas for preview
      if (canvas.imageData) {
        ctx.putImageData(canvas.imageData, 0, 0);
      }
      
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor + '20'; // Slight transparency for fill
      ctx.lineWidth = brushSize;
      
      if (currentTool === 'rectangle') {
        const width = pos.x - startPos.x;
        const height = pos.y - startPos.y;
        ctx.strokeRect(startPos.x, startPos.y, width, height);
        ctx.fillRect(startPos.x, startPos.y, width, height);
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
      } else if (currentTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
      saveCanvas();
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      setShowTextInput(false);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = currentColor;
    ctx.textBaseline = 'top';
    ctx.fillText(textInput, textPosition.x, textPosition.y);
    
    setTextInput('');
    setShowTextInput(false);
    saveToHistory();
    saveCanvas();
  };

  const undo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      restoreFromHistory(newStep);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      restoreFromHistory(newStep);
    }
  };

  const restoreFromHistory = (step) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      saveCanvas();
    };
    img.src = history[step];
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas && onSave) {
      const dataURL = canvas.toDataURL('image/png', 1.0);
      onSave(dataURL);
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    saveToHistory();
    saveCanvas();
  };

  if (!isOpen) {
    console.log('🖊️ Whiteboard not rendering - isOpen is false');
    return null;
  }
  
  console.log('🖊️ Whiteboard rendering modal');

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col overflow-hidden border-2 border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shadow-inner">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-xl">Professional Whiteboard</h2>
              <p className="text-blue-100 text-sm font-medium">Collaborate • Create • Innovate</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Save button */}
            <button
              onClick={saveCanvas}
              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
              title="Save Whiteboard"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            
            {/* Close button */}
            <button
              onClick={() => {
                saveCanvas();
                onClose();
              }}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm hover:rotate-90 transform"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 border-b-2 border-gray-600 p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-6 flex-wrap gap-y-3">
            {/* Drawing Tools */}
            <div className="flex items-center space-x-2 bg-gray-900/50 p-2 rounded-xl backdrop-blur-sm">
              <button
                onClick={() => setCurrentTool('pen')}
                className={`p-3 rounded-lg transition-all duration-300 font-medium ${
                  currentTool === 'pen'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-110'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
                }`}
                title="Pen Tool"
              >
                <Pen className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setCurrentTool('highlighter')}
                className={`p-3 rounded-lg transition-all duration-300 font-medium ${
                  currentTool === 'highlighter'
                    ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg scale-110'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
                }`}
                title="Highlighter"
              >
                <Minus className="w-5 h-5" style={{ transform: 'rotate(-45deg)' }} />
              </button>
              
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-3 rounded-lg transition-all duration-300 font-medium ${
                  currentTool === 'eraser'
                    ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg scale-110'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
                }`}
                title="Eraser"
              >
                <Eraser className="w-5 h-5" />
              </button>
            </div>

            {/* Shape Tools */}
            <div className="flex items-center space-x-2 bg-gray-900/50 p-2 rounded-xl backdrop-blur-sm">
              <button
                onClick={() => setCurrentTool('line')}
                className={`p-3 rounded-lg transition-all duration-300 font-medium ${
                  currentTool === 'line'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-110'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
                }`}
                title="Line"
              >
                <Minus className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setCurrentTool('rectangle')}
                className={`p-3 rounded-lg transition-all duration-300 font-medium ${
                  currentTool === 'rectangle'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-110'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
                }`}
                title="Rectangle"
              >
                <Square className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setCurrentTool('circle')}
                className={`p-3 rounded-lg transition-all duration-300 font-medium ${
                  currentTool === 'circle'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-110'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
                }`}
                title="Circle"
              >
                <Circle className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setCurrentTool('text')}
                className={`p-3 rounded-lg transition-all duration-300 font-medium ${
                  currentTool === 'text'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-110'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
                }`}
                title="Text"
              >
                <Type className="w-5 h-5" />
              </button>
            </div>

            {/* Size Control */}
            <div className="flex items-center space-x-3 bg-gray-900/50 p-3 rounded-xl backdrop-blur-sm">
              <span className="text-sm text-gray-300 font-medium">Size:</span>
              <input
                type="range"
                min="1"
                max="30"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-24 h-2 bg-gray-600 rounded-lg outline-none appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(brushSize / 30) * 100}%, #4B5563 ${(brushSize / 30) * 100}%, #4B5563 100%)`
                }}
              />
              <span className="text-sm text-blue-400 w-10 font-bold">{brushSize}px</span>
            </div>

            {/* Color Palette */}
            <div className="flex items-center space-x-3 bg-gray-900/50 p-3 rounded-xl backdrop-blur-sm">
              <Palette className="w-5 h-5 text-gray-300" />
              <div className="flex flex-wrap gap-1.5 max-w-xs">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-7 h-7 rounded-lg transition-all duration-300 transform hover:scale-125 shadow-md ${
                      currentColor === color 
                        ? 'ring-3 ring-blue-400 ring-offset-2 ring-offset-gray-800 scale-110' 
                        : 'hover:shadow-lg'
                    }`}
                    style={{ 
                      backgroundColor: color,
                      border: color === '#FFFFFF' ? '2px solid #4B5563' : 'none'
                    }}
                    title={`Color: ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={undo}
              disabled={historyStep <= 0}
              className={`p-3 rounded-xl transition-all duration-300 ${
                historyStep > 0
                  ? 'bg-gray-700 hover:bg-gray-600 text-white hover:scale-110'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              title="Undo"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={redo}
              disabled={historyStep >= history.length - 1}
              className={`p-3 rounded-xl transition-all duration-300 ${
                historyStep < history.length - 1
                  ? 'bg-gray-700 hover:bg-gray-600 text-white hover:scale-110'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              title="Redo"
            >
              <Redo2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={downloadCanvas}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-medium"
              title="Download as PNG"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            <button
              onClick={clearCanvas}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-medium"
              title="Clear Canvas"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="flex-1 p-6 bg-gradient-to-br from-gray-800 to-gray-900 relative">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl ring-2 ring-gray-600">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full h-full cursor-crosshair bg-white"
              style={{ 
                touchAction: 'none',
                imageRendering: 'auto'
              }}
            />
          </div>
          
          {/* Text Input Overlay */}
          {showTextInput && (
            <div 
              className="absolute bg-white border-2 border-blue-500 rounded-lg shadow-xl p-2"
              style={{ 
                left: `${textPosition.x}px`, 
                top: `${textPosition.y}px`,
                zIndex: 10 
              }}
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                placeholder="Type text..."
                autoFocus
                className="px-3 py-2 border-none outline-none text-gray-800 bg-transparent"
                style={{ fontSize: `${fontSize}px` }}
              />
              <div className="flex items-center space-x-2 mt-2 border-t pt-2">
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="flex-1"
                />
                <button
                  onClick={handleTextSubmit}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowTextInput(false)}
                  className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 border-t-2 border-gray-600 p-4 flex items-center justify-between text-sm shadow-inner">
          <div className="flex items-center space-x-6 text-gray-300">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Tool:</span>
              <span className="text-blue-400 capitalize font-bold">{currentTool}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Color:</span>
              <span 
                className="inline-block w-5 h-5 rounded-md border-2 border-gray-500 shadow-sm" 
                style={{ backgroundColor: currentColor }}
              ></span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Size:</span>
              <span className="text-blue-400 font-bold">{brushSize}px</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">History:</span>
              <span className="text-blue-400 font-bold">{historyStep + 1}/{history.length}</span>
            </div>
          </div>
          <div className="text-gray-400 font-medium">
            ✨ Click & drag to draw • Shapes preview in real-time • Auto-save enabled
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;