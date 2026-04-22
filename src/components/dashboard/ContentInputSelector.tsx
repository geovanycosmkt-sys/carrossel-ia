import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs'
import { detectInputType, isUrl, validateUrl } from '@/utils/inputDetector'
import { toast } from 'sonner'
import { FileText, Link2, Sparkles } from 'lucide-react'

interface ContentInputSelectorProps {
  onSubmit: (content: string, type: 'text' | 'url' | 'chat') => void
  isLoading?: boolean
}

export default function ContentInputSelector({ onSubmit, isLoading = false }: ContentInputSelectorProps) {
  const [textContent, setTextContent] = useState('')
  const [urlContent, setUrlContent] = useState('')
  const [activeTab, setActiveTab] = useState<'text' | 'url' | 'chat'>('text')

  const handleTextSubmit = () => {
    if (!textContent.trim()) {
      toast.error('Por favor, insira seu conteúdo')
      return
    }

    onSubmit(textContent, 'text')
    setTextContent('')
  }

  const handleUrlSubmit = () => {
    if (!urlContent.trim()) {
      toast.error('Por favor, insira uma URL')
      return
    }

    const validation = validateUrl(urlContent)
    if (!validation.valid) {
      toast.error(validation.error || 'URL inválida')
      return
    }

    onSubmit(urlContent, 'url')
    setUrlContent('')
  }

  const handleChatSubmit = () => {
    onSubmit('', 'chat')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insira seu Conteúdo</CardTitle>
        <CardDescription>Escolha como deseja fornecer o conteúdo para seu carrossel</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text" className="flex gap-2">
              <FileText className="h-4 w-4" />
              Texto Livre
            </TabsTrigger>
            <TabsTrigger value="url" className="flex gap-2">
              <Link2 className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex gap-2">
              <Sparkles className="h-4 w-4" />
              Chat IA
            </TabsTrigger>
          </TabsList>

          {/* Text Input Tab */}
          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="text-input" className="text-sm font-medium">
                Seu Conteúdo
              </label>
              <textarea
                id="text-input"
                placeholder="Cole seu texto aqui... Pode ser um artigo, roteiro, tópicos, etc."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                disabled={isLoading}
                className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTextSubmit}
                disabled={isLoading || !textContent.trim()}
                className="flex-1"
              >
                Continuar com Texto
              </Button>
            </div>
          </TabsContent>

          {/* URL Input Tab */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="url-input" className="text-sm font-medium">
                URL
              </label>
              <Input
                id="url-input"
                type="url"
                placeholder="https://exemplo.com/artigo ou https://youtube.com/watch?v=..."
                value={urlContent}
                onChange={(e) => setUrlContent(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                Suporta artigos, vídeos do YouTube, posts do Instagram e outras URLs
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUrlSubmit}
                disabled={isLoading || !urlContent.trim()}
                className="flex-1"
              >
                Continuar com URL
              </Button>
            </div>
          </TabsContent>

          {/* Chat IA Tab */}
          <TabsContent value="chat" className="space-y-4 mt-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-indigo-900">
                Converse com a IA para criar o conteúdo do seu carrossel do zero. Você pode descrever o tema, estilo e público-alvo.
              </p>
            </div>

            <Button onClick={handleChatSubmit} disabled={isLoading} className="w-full">
              Abrir Chat IA
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
