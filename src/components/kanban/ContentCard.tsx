import React, { useState } from 'react';
import { Star, Calendar } from 'lucide-react';
import { ContentItem } from '@/types';

interface ContentCardProps {
  item: ContentItem;
  onSelect?: (item: ContentItem) => void;
  onFavoriteToggle?: (id: string) => void;
  isFavorite?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onSelect,
  onFavoriteToggle,
  isFavorite = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('contentId', item.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect?.(item)}
      className={`p-4 bg-white border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-all ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      {/* Header with title and favorite */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex-1 line-clamp-2">{item.title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle?.(item.id);
          }}
          className="ml-2 flex-shrink-0 focus:outline-none transition-colors"
        >
          <Star
            size={18}
            className={isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}
          />
        </button>
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{item.description}</p>
      )}

      {/* Tags/Status */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}
        >
          {getStatusLabel(item.status)}
        </span>
      </div>

      {/* Footer with date */}
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Calendar size={14} />
        <span>{formatDate(item.created_at)}</span>
      </div>
    </div>
  );
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'idea':
      return 'bg-purple-100 text-purple-700';
    case 'draft':
      return 'bg-yellow-100 text-yellow-700';
    case 'review':
      return 'bg-blue-100 text-blue-700';
    case 'scheduled':
      return 'bg-cyan-100 text-cyan-700';
    case 'published':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    idea: 'Ideia',
    draft: 'Rascunho',
    review: 'Revisão',
    scheduled: 'Agendado',
    published: 'Publicado',
  };
  return labels[status] || status;
}

export default ContentCard;
