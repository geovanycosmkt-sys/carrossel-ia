import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { ChevronLeft, ChevronRight, Undo2, Redo2, Download, Send, Copy } from 'lucide-react';
import { zipDownloadService } from '@/services/zipDownloadService';
import { Template, SlideJSON, FabricObject } from '@/types';
import { toast } from 'sonner';

interface CanvasEditorProps {
  template: Template;
  onSave?: (slides: SlideJSON[]) => void;
  onClose?: () => void;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ template, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Fix fabric.js hidden textarea scroll issue
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__fabricTextareaFixed) {
      const style = document.createElement('style');
      style.textContent = `
        .fabric-textarea {
          position: fixed !important;
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(style);
      (window as any).__fabricTextareaFixed = true;
    }
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1080,
      height: 1350,
      backgroundColor: '#ffffff',
    });

    fabricRef.current = canvas;

    // Load first slide
    loadSlide(0);

    // Setup history tracking
    canvas.on('object:modified', saveToHistory);
    canvas.on('object:added', saveToHistory);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  const loadSlide = (index: number) => {
    if (!fabricRef.current || !template.slides[index]) return;

    const canvas = fabricRef.current;
    canvas.clear();
    setCurrentSlideIndex(index);

    const slideJSON = template.slides[index] as SlideJSON;
    canvas.loadFromJSON(
      slideJSON,
      () => {
        canvas.renderAll();
        setHistory([JSON.stringify(slideJSON)]);
        setHistoryIndex(0);
      }
    );
  };

  const saveToHistory = () => {
    if (!fabricRef.current) return;
    const state = JSON.stringify(fabricRef.current.toJSON());
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0 && fabricRef.current) {
      const newIndex = historyIndex - 1;
      fabricRef.current.loadFromJSON(
        JSON.parse(history[newIndex]),
        () => {
          fabricRef.current?.renderAll();
          setHistoryIndex(newIndex);
        }
      );
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && fabricRef.current) {
      const newIndex = historyIndex + 1;
      fabricRef.current.loadFromJSON(
        JSON.parse(history[newIndex]),
        () => {
          fabricRef.current?.renderAll();
          setHistoryIndex(newIndex);
        }
      );
    }
  };

  const downloadIndividualSlide = () => {
    if (!fabricRef.current) return;
    const dataUrl = fabricRef.current.toDataURL({ format: 'png' });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `slide-${currentSlideIndex + 1}.png`;
    link.click();
    toast.success(`Slide ${currentSlideIndex + 1} downloaded`);
  };

  const downloadAsZip = async () => {
    if (!fabricRef.current) return;

    try {
      toast.loading('Preparing ZIP file...');
      const pngFiles: Record<string, Blob> = {};

      // Generate PNG for each slide
      for (let i = 0; i < template.slides.length; i++) {
        const slideJSON = template.slides[i] as SlideJSON;
        await new Promise((resolve) => {
          fabricRef.current?.loadFromJSON(slideJSON, async () => {
            fabricRef.current?.renderAll();
            const dataUrl = fabricRef.current?.toDataURL({ format: 'png' }) || '';
            const blob = await fetch(dataUrl).then((r) => r.blob());
            pngFiles[`slide-${i + 1}.png`] = blob;
            resolve(null);
          });
        });
      }

      // Download ZIP
      await zipDownloadService.downloadZip(pngFiles, `carousel-${Date.now()}.zip`);
      toast.success('Carousel downloaded as ZIP');

      // Reload current slide
      loadSlide(currentSlideIndex);
    } catch (error) {
      console.error('ZIP download error:', error);
      toast.error('Failed to download ZIP');
    }
  };

  const sendToCanva = () => {
    toast.info('Canva integration coming soon');
  };

  const nextSlide = () => {
    const nextIndex = Math.min(currentSlideIndex + 1, template.slides.length - 1);
    loadSlide(nextIndex);
  };

  const prevSlide = () => {
    const prevIndex = Math.max(currentSlideIndex - 1, 0);
    loadSlide(prevIndex);
  };

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 hover:bg-gray-100 disabled:opacity-50 rounded"
            title="Undo"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 hover:bg-gray-100 disabled:opacity-50 rounded"
            title="Redo"
          >
            <Redo2 size={20} />
          </button>
        </div>

        <h1 className="text-lg font-semibold">{template.name}</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadAsZip}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Download size={18} />
            Download ZIP
          </button>
          <button
            onClick={downloadIndividualSlide}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <Copy size={18} />
            Download
          </button>
          <button
            onClick={sendToCanva}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            <Send size={18} />
            Send to Canva
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <canvas ref={canvasRef} className="border border-gray-300 shadow-lg" />
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between">
        <button
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          className="p-2 hover:bg-gray-100 disabled:opacity-50 rounded"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Slide {currentSlideIndex + 1} of {template.slides.length}
          </span>
          {/* Thumbnails */}
          <div className="flex gap-2 ml-4">
            {template.slides.map((_, index) => (
              <button
                key={index}
                onClick={() => loadSlide(index)}
                className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                  currentSlideIndex === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={nextSlide}
          disabled={currentSlideIndex === template.slides.length - 1}
          className="p-2 hover:bg-gray-100 disabled:opacity-50 rounded"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default CanvasEditor;
