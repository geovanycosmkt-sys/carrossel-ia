import React, { useState } from 'react';
import { Copy, RefreshCw, Pencil, Plus } from 'lucide-react';
import { CarouselContent, Template } from '@/types';
import TiptapEditor from './TiptapEditor';
import { toast } from 'sonner';

interface EditableCarouselPreviewProps {
  carousel: CarouselContent;
  template: Template;
  onEdit?: () => void;
  onSlideUpdate?: (slideIndex: number, content: Record<string, string>) => void;
  onCreateDesign?: () => void;
  onRegenerateSlide?: (slideIndex: number) => void;
}

export const EditableCarouselPreview: React.FC<EditableCarouselPreviewProps> = ({
  carousel,
  template,
  onEdit,
  onSlideUpdate,
  onCreateDesign,
  onRegenerateSlide,
}) => {
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});

  const handleEditStart = (slideIndex: number) => {
    setEditingSlide(slideIndex);
    const slide = carousel.slides[slideIndex];
    const content: Record<string, string> = {};
    slide.fields.forEach((field) => {
      content[field.key] = field.value;
    });
    setEditContent(content);
  };

  const handleEditSave = (slideIndex: number) => {
    if (onSlideUpdate) {
      onSlideUpdate(slideIndex, editContent);
    }
    setEditingSlide(null);
    toast.success('Slide updated');
  };

  const handleCopyCaption = async (slideIndex: number) => {
    const slide = carousel.slides[slideIndex];
    const captionField = slide.fields.find((f) => f.type === 'description');
    if (captionField) {
      try {
        await navigator.clipboard.writeText(captionField.value);
        toast.success('Caption copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy caption');
      }
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{carousel.title}</h2>
        {carousel.description && (
          <p className="text-gray-600 mt-2">{carousel.description}</p>
        )}
      </div>

      {/* Slides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {carousel.slides.map((slide, slideIndex) => (
          <div
            key={slideIndex}
            className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Slide Preview Image */}
            {carousel.images && carousel.images[slideIndex] && (
              <div className="bg-gray-100 aspect-video overflow-hidden">
                <img
                  src={carousel.images[slideIndex]}
                  alt={`Slide ${slideIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-4">
              {/* Slide Number */}
              <div className="text-sm text-gray-500 mb-4">
                Slide {slideIndex + 1} of {carousel.slides.length}
              </div>

              {/* Editable Content */}
              {editingSlide === slideIndex ? (
                <div className="space-y-4 mb-4">
                  {slide.fields.map((field) => (
                    <div key={field.key}>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                        {field.limit && <span className="text-gray-400"> ({field.limit} chars)</span>}
                      </label>
                      {field.type === 'description' ? (
                        <TiptapEditor
                          content={editContent[field.key] || ''}
                          onUpdate={(html) =>
                            setEditContent({
                              ...editContent,
                              [field.key]: html,
                            })
                          }
                          placeholder={`Enter ${field.type}...`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={editContent[field.key] || ''}
                          onChange={(e) =>
                            setEditContent({
                              ...editContent,
                              [field.key]: e.target.value.slice(0, field.limit || 500),
                            })
                          }
                          placeholder={`Enter ${field.type}...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-blue-500"
                          maxLength={field.limit}
                        />
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSave(slideIndex)}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSlide(null)}
                      className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {slide.fields.map((field) => (
                    <div key={field.key}>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                        {field.type}
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {field.value || '(empty)'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {editingSlide !== slideIndex && (
                  <>
                    <button
                      onClick={() => handleEditStart(slideIndex)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleCopyCaption(slideIndex)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-sm font-medium"
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                    {onRegenerateSlide && (
                      <button
                        onClick={() => onRegenerateSlide(slideIndex)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 text-sm font-medium"
                      >
                        <RefreshCw size={16} />
                        Regen
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex gap-4 justify-center">
        {onCreateDesign && (
          <button
            onClick={onCreateDesign}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            <Plus size={20} />
            Criar Design
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            <Pencil size={20} />
            Edit Layout
          </button>
        )}
      </div>
    </div>
  );
};

export default EditableCarouselPreview;
