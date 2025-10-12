import React, { useRef, useState, useEffect } from 'react';
import { Palette, Square, Minus, Eraser, RotateCcw, X } from 'lucide-react';

const Whiteboard = ({ isOpen, onClose, initialData, onSave }) => {
  console.log('🖊️ Whiteboard component rendered with isOpen:', isOpen);
  
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);

  const colors = [
    '#000000', '#EF4444', '#10B981', '#F59E0B',
    '#3B82F6', '#8B5CF6', '#F97316', '#06B6D4', 
    '#84CC16', '#EC4899', '#6366F1', '#6B7280'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && isOpen) {
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Set white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Load initial data if available
      if (initialData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = initialData;
      }
    }
  }, [isOpen, initialData]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    
    if (currentTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      // Auto-save when drawing stops
      saveCanvas();
    }
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas && onSave) {
      const dataURL = canvas.toDataURL();
      onSave(dataURL);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Save after clearing
    saveCanvas();
  };

  if (!isOpen) {
    console.log('🖊️ Whiteboard not rendering - isOpen is false');
    return null;
  }
  
  console.log('🖊️ Whiteboard rendering modal');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[80vh] flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Square className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Collaborative Whiteboard</h2>
              <p className="text-blue-100 text-sm">Draw, sketch, and collaborate in real-time</p>
            </div>
          </div>
          <button
            onClick={() => {
              saveCanvas();
              onClose();
            }}
            className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-700 border-b border-gray-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Tools */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentTool('pen')}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  currentTool === 'pen'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                }`}
                title="Pen"
              >
                <Minus className="w-5 h-5 rotate-45" />
              </button>
              
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  currentTool === 'eraser'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                }`}
                title="Eraser"
              >
                <Eraser className="w-5 h-5" />
              </button>
            </div>

            {/* Brush Size */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20 h-2 bg-gray-600 rounded-lg outline-none slider-thumb"
              />
              <span className="text-sm text-gray-300 w-8">{brushSize}</span>
            </div>

            {/* Colors */}
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5 text-gray-300" />
              <div className="flex space-x-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-8 h-8 rounded-lg transition-all duration-300 transform hover:scale-110 ${
                      currentColor === color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-700' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Color: ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Clear Button */}
          <button
            onClick={clearCanvas}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-6 bg-gray-800">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full h-full border border-gray-600 rounded-xl cursor-crosshair bg-white"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Footer */}
        <div className="bg-gray-700 border-t border-gray-600 p-4 flex items-center justify-between text-sm text-gray-300">
          <div className="flex items-center space-x-4">
            <span>Current tool: <span className="text-blue-400 capitalize">{currentTool}</span></span>
            <span>Color: <span className="inline-block w-4 h-4 rounded ml-1" style={{ backgroundColor: currentColor }}></span></span>
            <span>Size: <span className="text-blue-400">{brushSize}px</span></span>
          </div>
          <div className="text-gray-400">
            Click and drag to draw • Right-click for context menu
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;