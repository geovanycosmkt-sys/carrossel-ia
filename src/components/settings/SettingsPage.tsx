import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react'

interface UserSettings {
  gemini_api_key?: string
  instagram_token?: string
  ai_system_prompt?: string
  ai_style_instructions?: string
  image_preference?: 'ai' | 'search' | 'both'
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({})
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showInstagramToken, setShowInstagramToken] = useState(false)

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error
        throw error
      }

      if (data) {
        setSettings({
          gemini_api_key: data.gemini_api_key,
          instagram_token: data.instagram_token,
          ai_system_prompt: data.ai_system_prompt,
          ai_style_instructions: data.ai_style_instructions,
          image_preference: data.image_preference,
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)

      const { error } = await supabase.from('user_settings').upsert({
        user_id: user.id,
        gemini_api_key: settings.gemini_api_key,
        instagram_token: settings.instagram_token,
        ai_system_prompt: settings.ai_system_prompt,
        ai_style_instructions: settings.ai_style_instructions,
        image_preference: settings.image_preference,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api">APIs</TabsTrigger>
            <TabsTrigger value="ai">IA</TabsTrigger>
            <TabsTrigger value="images">Imagens</TabsTrigger>
          </TabsList>

          {/* API Settings Tab */}
          <TabsContent value="api" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gemini API</CardTitle>
                <CardDescription>
                  Chave da API do Google Gemini para geração de conteúdo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="gemini-key" className="text-sm font-medium">
                    API Key
                  </label>
                  <div className="relative mt-1">
                    <Input
                      id="gemini-key"
                      type={showGeminiKey ? 'text' : 'password'}
                      placeholder="sk-..."
                      value={settings.gemini_api_key || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, gemini_api_key: e.target.value })
                      }
                      className="pr-10"
                    />
                    <button
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showGeminiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Encontre sua chave em{' '}
                    <a
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      makersuite.google.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instagram</CardTitle>
                <CardDescription>Conectar com sua conta do Instagram</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="instagram-token" className="text-sm font-medium">
                    Access Token
                  </label>
                  <div className="relative mt-1">
                    <Input
                      id="instagram-token"
                      type={showInstagramToken ? 'text' : 'password'}
                      placeholder="IGQA_..."
                      value={settings.instagram_token || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, instagram_token: e.target.value })
                      }
                      className="pr-10"
                    />
                    <button
                      onClick={() => setShowInstagramToken(!showInstagramToken)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showInstagramToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Obtenha um token através da API do Instagram
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings Tab */}
          <TabsContent value="ai" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Prompt do Sistema</CardTitle>
                <CardDescription>
                  Instruções personalizadas para a IA ao gerar conteúdo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="system-prompt" className="text-sm font-medium">
                    Prompt
                  </label>
                  <textarea
                    id="system-prompt"
                    placeholder="Ex: Você é um especialista em marketing digital focado em..."
                    value={settings.ai_system_prompt || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, ai_system_prompt: e.target.value })
                    }
                    className="mt-1 w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instruções de Estilo</CardTitle>
                <CardDescription>
                  Preferências de tom, estilo e formatação para o conteúdo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="style-instructions" className="text-sm font-medium">
                    Instruções
                  </label>
                  <textarea
                    id="style-instructions"
                    placeholder="Ex: Mantenha um tom descontraído e amigável. Use emojis. Frases curtas..."
                    value={settings.ai_style_instructions || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ai_style_instructions: e.target.value,
                      })
                    }
                    className="mt-1 w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Image Settings Tab */}
          <TabsContent value="images" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferência de Imagens</CardTitle>
                <CardDescription>
                  Escolha de onde buscar imagens para seus carrosséis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    {
                      value: 'ai',
                      label: 'Geradas por IA',
                      description: 'Usar apenas imagens geradas por IA',
                    },
                    {
                      value: 'search',
                      label: 'Busca na Web',
                      description: 'Usar apenas imagens encontradas na web',
                    },
                    {
                      value: 'both',
                      label: 'Ambas',
                      description: 'Combinar imagens de IA e web',
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="image-preference"
                        value={option.value}
                        checked={settings.image_preference === option.value}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            image_preference: e.target.value as 'ai' | 'search' | 'both',
                          })
                        }
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{option.label}</p>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex gap-3 mt-8">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? <LoadingSpinner size="sm" /> : 'Salvar Configurações'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancelar
          </Button>
        </div>
      </main>
    </div>
  )
}
