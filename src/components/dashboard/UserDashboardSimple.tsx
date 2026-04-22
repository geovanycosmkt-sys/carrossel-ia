import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/common/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/common/Dialog'
import { Settings, Plus, Zap } from 'lucide-react'
import TemplateSelector from './TemplateSelector'

export default function UserDashboardSimple() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Mock data for recent carousels
  const recentCarousels = [
    { id: 1, title: 'Social Media Tips', status: 'draft', slides: 10 },
    { id: 2, title: 'Product Launch', status: 'published', slides: 15 },
    { id: 3, title: 'Customer Testimonials', status: 'draft', slides: 8 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Carrossel IA</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500">{user?.name || 'Usuário'}</p>
            </div>

            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Configurações"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </button>

            <button
              onClick={handleSignOut}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total de Carrosséis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-600">12</p>
              <p className="text-sm text-gray-500 mt-1">Criados no total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Este Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">4</p>
              <p className="text-sm text-gray-500 mt-1">Carrosséis novos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Publicados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">8</p>
              <p className="text-sm text-gray-500 mt-1">Prontos para compartilhar</p>
            </CardContent>
          </Card>
        </div>

        {/* Create New Carousel */}
        <div className="mb-12">
          <Button
            onClick={() => setShowTemplateDialog(true)}
            className="gap-2"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Novo Carrossel
          </Button>
        </div>

        {/* Recent Carousels */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Carrosséis Recentes</h2>

          {recentCarousels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentCarousels.map((carousel) => (
                <Card key={carousel.id} className="hover:shadow-md transition cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">{carousel.title}</CardTitle>
                    <CardDescription>{carousel.slides} slides</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          carousel.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {carousel.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-center mb-4">Nenhum carrossel criado ainda</p>
                <Button
                  onClick={() => setShowTemplateDialog(true)}
                  variant="outline"
                >
                  Criar Primeiro Carrossel
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Template Selector Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecionar Template</DialogTitle>
            <DialogDescription>
              Escolha um template para começar a criar seu carrossel
            </DialogDescription>
          </DialogHeader>
          <TemplateSelector onSelectTemplate={() => setShowTemplateDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
