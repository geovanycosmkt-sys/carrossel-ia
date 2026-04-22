import React, { useState } from 'react';
import { Lightbulb, Zap, Calendar, CheckCircle2, Send } from 'lucide-react';
import { ContentItem } from '@/types';
import ContentCard from './ContentCard';

interface KanbanBoardProps {
  items: ContentItem[];
  onItemMove?: (itemId: string, newStatus: string) => void;
  onSelectItem?: (item: ContentItem) => void;
  favoriteIds?: string[];
  onFavoriteToggle?: (id: string) => void;
}

interface Column {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const COLUMNS: Column[] = [
  {
    id: 'idea',
    title: 'Ideias',
    icon: <Lightbulb size={20} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'draft',
    title: 'Em Produção',
    icon: <Zap size={20} />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  {
    id: 'review',
    title: 'Em Revisão',
    icon: <CheckCircle2 size={20} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'scheduled',
    title: 'Agendado',
    icon: <Calendar size={20} />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  {
    id: 'published',
    title: 'Publicado',
    icon: <Send size={20} />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  items,
  onItemMove,
  onSelectItem,
  favoriteIds = [],
  onFavoriteToggle,
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getItemsByStatus = (status: string) => {
    return items.filter((item) => item.status === status);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (columnId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);

    const contentId = e.dataTransfer.getData('contentId');
    if (contentId && onItemMove) {
      onItemMove(contentId, columnId);
    }
  };

  return (
    <div className="w-full overflow-x-auto bg-gray-100 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-w-full">
        {COLUMNS.map((column) => {
          const columnItems = getItemsByStatus(column.id);

          return (
            <div
              key={column.id}
              className="bg-white rounded-lg shadow-sm flex flex-col min-h-[500px] overflow-hidden"
            >
              {/* Column Header */}
              <div className={`${column.bgColor} p-4 border-b-2 border-gray-200`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={column.color}>{column.icon}</span>
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                </div>
                <p className="text-sm text-gray-600">
                  {columnItems.length} {columnItems.length === 1 ? 'item' : 'items'}
                </p>
              </div>

              {/* Droppable area */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(column.id, e)}
                onDragEnter={() => setDragOverColumn(column.id)}
                onDragLeave={() => setDragOverColumn(null)}
                className={`flex-1 p-3 space-y-3 overflow-y-auto transition-colors ${
                  dragOverColumn === column.id ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
                }`}
              >
                {columnItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Nenhum item aqui</p>
                    <p className="text-xs mt-1">Arraste items para esta coluna</p>
                  </div>
                ) : (
                  columnItems.map((item) => (
                    <ContentCard
                      key={item.id}
                      item={item}
                      onSelect={onSelectItem}
                      onFavoriteToggle={onFavoriteToggle}
                      isFavorite={favoriteIds.includes(item.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
