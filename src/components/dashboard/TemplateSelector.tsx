import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Template } from '@/types'
import { Button } from '@/components/common/Button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'

interface TemplateSelectorProps {
  onSelectTemplate: (template: Template) => void
}

export default function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('canva_templates')
        .select('*')
        .eq('is_public', true)
        .limit(12)

      if (error) throw error

      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  const categories = Array.from(new Set(templates.map((t) => t.category)))

  const filteredTemplates = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="group relative bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer"
            >
              {/* Template Thumbnail */}
              {template.thumbnail_url && (
                <img
                  src={template.thumbnail_url}
                  alt={template.name}
                  className="w-full h-40 object-cover"
                />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition">
                  <p className="text-white text-sm font-medium">{template.name}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="p-3">
                <p className="text-xs font-medium text-gray-900 truncate">{template.name}</p>
                <p className="text-xs text-gray-500">
                  {template.template_config.slideCount} slides
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum template disponível</p>
          <Button variant="outline" onClick={fetchTemplates} className="mt-4">
            Tentar Novamente
          </Button>
        </div>
      )}
    </div>
  )
}
