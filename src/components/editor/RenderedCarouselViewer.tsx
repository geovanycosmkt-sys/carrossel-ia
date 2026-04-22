import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselContent } from '@/types';

interface RenderedCarouselViewerProps {
  carousel: CarouselContent;
  onClose?: () => void;
}

export const RenderedCarouselViewer: React.FC<RenderedCarouselViewerProps> = ({
  carousel,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSlide = carousel.slides[currentIndex];
  const currentImage = carousel.images?.[currentIndex];

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < carousel.slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  };

  return (
    <div
      className="w-full h-screen bg-black flex flex-col items-center justify-center"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black/50 text-white p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{carousel.title}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center gap-8 px-4">
        {/* Previous Button */}
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Previous slide"
        >
          <ChevronLeft size={32} />
        </button>

        {/* Slide Container */}
        <div className="w-full max-w-2xl">
          {/* Image */}
          {currentImage && (
            <div className="bg-gray-900 rounded-lg overflow-hidden mb-4">
              <img
                src={currentImage}
                alt={`Slide ${currentIndex + 1}`}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Caption */}
          {currentSlide && (
            <div className="bg-white rounded-lg p-6 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {currentSlide.fields.find((f) => f.type === 'title')?.value || `Slide ${currentIndex + 1}`}
              </h3>
              {currentSlide.fields.find((f) => f.type === 'description') && (
                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                  {currentSlide.fields.find((f) => f.type === 'description')?.value}
                </p>
              )}
              {currentSlide.fields.find((f) => f.type === 'cta') && (
                <p className="text-blue-600 font-semibold">
                  {currentSlide.fields.find((f) => f.type === 'cta')?.value}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={goToNext}
          disabled={currentIndex === carousel.slides.length - 1}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Next slide"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Footer - Slide Counter */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4 flex items-center justify-center gap-4">
        <span className="text-lg font-medium">
          {currentIndex + 1} / {carousel.slides.length}
        </span>

        {/* Slide Indicators */}
        <div className="flex gap-2 ml-4">
          {carousel.slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`transition-all ${
                index === currentIndex
                  ? 'bg-white h-2 w-8 rounded-full'
                  : 'bg-white/50 h-2 w-2 rounded-full hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RenderedCarouselViewer;
