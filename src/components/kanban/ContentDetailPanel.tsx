import React, { useState } from 'react';
import { X, Pencil, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { ContentItem } from '@/types';

interface ContentDetailPanelProps {
  item: ContentItem | null;
  onClose?: () => void;
  onEdit?: (item: ContentItem) => void;
  onDelete?: (itemId: string) => void;
}

export const ContentDetailPanel: React.FC<ContentDetailPanelProps> = ({
  item,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!item) return null;

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      onDelete?.(item.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col animate-in slide-in-from-right z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Detalhes do Conteúdo</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Título</h3>
          <p className="text-lg font-semibold text-gray-900">{item.title}</p>
        </div>

        {/* Description */}
        {item.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Descrição</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* Status */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Status</h3>
          <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(item.status)}`}>
            {getStatusLabel(item.status)}
          </span>
        </div>

        {/* Dates */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2 flex items-center gap-2">
              <Calendar size={16} />
              Criado
            </h3>
            <p className="text-gray-700 text-sm">{formatDate(item.created_at)}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2 flex items-center gap-2">
              <Calendar size={16} />
              Atualizado
            </h3>
            <p className="text-gray-700 text-sm">{formatDate(item.updated_at)}</p>
          </div>
        </div>

        {/* Carousel ID */}
        {item.carousel_id && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">ID do Carrossel</h3>
            <p className="text-gray-700 text-sm font-mono break-all">{item.carousel_id}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        <button
          onClick={() => onEdit?.(item)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
        >
          <Pencil size={18} />
          Editar no Editor
        </button>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 font-medium transition-colors"
        >
          <Trash2 size={18} />
          {isDeleting ? 'Deletando...' : 'Excluir'}
        </button>
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

export default ContentDetailPanel;
