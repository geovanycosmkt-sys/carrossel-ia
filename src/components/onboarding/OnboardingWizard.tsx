import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

type ArchetypeType = 'sabio' | 'heroi' | 'rebelde' | 'amigo';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  { id: 0, title: 'Bem-vindo', description: 'Vamos configurar sua conta' },
  { id: 1, title: 'Escolha seu Arquétipo', description: 'Qual é seu estilo de conteúdo?' },
  { id: 2, title: 'Instagram (Opcional)', description: 'Conecte sua conta' },
  { id: 3, title: 'Configurar API', description: 'Adicione sua chave Gemini' },
  { id: 4, title: 'Pronto!', description: 'Tudo configurado' },
];

const ARCHETYPES = [
  {
    id: 'sabio',
    name: 'Sábio',
    emoji: '🧙',
    description: 'Educador que compartilha conhecimento e insights',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'heroi',
    name: 'Herói',
    emoji: '🦸',
    description: 'Inspirador que motiva e desafia seus seguidores',
    color: 'from-red-500 to-red-600',
  },
  {
    id: 'rebelde',
    name: 'Rebelde',
    emoji: '⚡',
    description: 'Criador de tendências que quebra as regras',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'amigo',
    name: 'Amigo',
    emoji: '🤗',
    description: 'Comunicador autêntico que conecta e envolve',
    color: 'from-green-500 to-green-600',
  },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypeType | null>(null);
  const [instagramUsername, setInstagramUsername] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (currentStep === 1 && !selectedArchetype) {
      toast.error('Por favor, escolha um arquétipo');
      return;
    }

    if (currentStep === 3 && !geminiApiKey.trim()) {
      toast.error('Por favor, adicione sua chave Gemini API');
      return;
    }

    if (currentStep === 4) {
      setLoading(true);
      try {
        // Save onboarding data
        localStorage.setItem(
          'carrossel-onboarding',
          JSON.stringify({
            archetype: selectedArchetype,
            instagram: instagramUsername,
            apiKey: geminiApiKey,
            completedAt: new Date().toISOString(),
          })
        );
        toast.success('Onboarding completo!');
        onComplete?.();
      } catch (error) {
        console.error('Onboarding error:', error);
        toast.error('Failed to complete onboarding');
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 min-h-[500px] flex flex-col">
          {currentStep === 0 && (
            <>
              <div className="text-center flex-1 flex flex-col justify-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Bem-vindo ao Carrossel IA</h1>
                <p className="text-xl text-gray-600 mb-8">
                  Vamos configurar sua conta para começar a criar carrosséis incríveis
                </p>
                <div className="space-y-4 text-left max-w-md mx-auto">
                  <div className="flex gap-4">
                    <div className="text-2xl">✨</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Gerador de Conteúdo IA</h3>
                      <p className="text-sm text-gray-600">
                        Crie carrosséis com conteúdo gerado por IA
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-2xl">🎨</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Editor Visual</h3>
                      <p className="text-sm text-gray-600">
                        Customize cada slide com nosso editor
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-2xl">📊</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Kanban Board</h3>
                      <p className="text-sm text-gray-600">Organize seu conteúdo facilmente</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Escolha seu Arquétipo</h2>
              <p className="text-gray-600 mb-8">
                Qual melhor descreve seu estilo de criação de conteúdo?
              </p>

              <div className="grid grid-cols-2 gap-4 flex-1 mb-8">
                {ARCHETYPES.map((archetype) => (
                  <button
                    key={archetype.id}
                    onClick={() => setSelectedArchetype(archetype.id as ArchetypeType)}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      selectedArchetype === archetype.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-4xl mb-3">{archetype.emoji}</div>
                    <h3 className="font-bold text-gray-900">{archetype.name}</h3>
                    <p className="text-sm text-gray-600 mt-2">{archetype.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Conectar Instagram (Opcional)</h2>
              <p className="text-gray-600 mb-8">
                Isso nos ajuda a otimizar conteúdo para seu nicho
              </p>

              <div className="flex-1 flex flex-col justify-center space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seu usuário Instagram
                  </label>
                  <input
                    type="text"
                    value={instagramUsername}
                    onChange={(e) => setInstagramUsername(e.target.value)}
                    placeholder="seu_username_aqui"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    Você pode pular este passo e configurar depois no menu de configurações.
                  </p>
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Configurar Chave Gemini API</h2>
              <p className="text-gray-600 mb-8">Necessário para gerar conteúdo com IA</p>

              <div className="flex-1 flex flex-col justify-center space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sua Chave Gemini API
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-900 mb-2 font-medium">
                    Como obter sua chave:
                  </p>
                  <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
                    <li>Vá para Google AI Studio (ai.google.dev)</li>
                    <li>Clique em "Get API Key"</li>
                    <li>Crie uma nova chave ou use uma existente</li>
                    <li>Cole aqui</li>
                  </ol>
                </div>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Tudo Configurado!</h2>
              <p className="text-gray-600 mb-8 max-w-sm">
                Você está pronto para começar a criar carrosséis incríveis com IA. Boa sorte!
              </p>

              <div className="space-y-2 text-left bg-gray-50 p-6 rounded-lg w-full max-w-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                  <span className="text-gray-900">
                    Arquétipo: {ARCHETYPES.find((a) => a.id === selectedArchetype)?.name}
                  </span>
                </div>
                {instagramUsername && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                    <span className="text-gray-900">Instagram: @{instagramUsername}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                  <span className="text-gray-900">API Gemini: Configurada</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
              Anterior
            </button>

            <div className="flex gap-1">
              {STEPS.map((step, idx) => (
                <div
                  key={step.id}
                  className={`h-2 w-2 rounded-full transition-all ${
                    idx <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {currentStep === STEPS.length - 1 ? 'Começar' : 'Próximo'}
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
