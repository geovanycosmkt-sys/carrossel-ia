import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { ChatMessage, Hook, TemplateConfig } from '@/types';
import { chatWithTools } from '@/services/openai';
import { toast } from 'sonner';

interface CarouselChatGeneratorProps {
  templateConfig: TemplateConfig;
  onContentGenerated?: (content: {
    hooks: Hook[];
    script: string;
    slides: Record<string, Record<string, string>>;
  }) => void;
}

type ChatStep = 'topic' | 'hooks' | 'script' | 'adjustments' | 'ready';

export const CarouselChatGenerator: React.FC<CarouselChatGeneratorProps> = ({
  templateConfig,
  onContentGenerated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Vou ajudar você a criar um carrossel incrível. Qual é o tema ou tópico do seu conteúdo?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ChatStep>('topic');
  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [generatedScript, setGeneratedScript] = useState('');
  const [generatedSlides, setGeneratedSlides] = useState<Record<string, Record<string, string>>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    addMessage('user', userMessage);
    setInput('');
    setLoading(true);

    try {
      // Prepare system prompt based on step
      let systemPrompt = '';
      let toolDefinitions = [];

      if (step === 'topic') {
        systemPrompt = `Você é um assistente especializado em criar carrosséis virais. O usuário forneceu um tema ou tópico.
        Gere 3 hooks (ganchos) diferentes para atrair atenção. Cada hook deve ser único e viralizar.
        Responda no formato JSON com uma array 'hooks' contendo objetos com 'text', 'type' (question|statement|curiosity|benefit|story) e 'engagement_score'.`;
        setStep('hooks');
      } else if (step === 'hooks') {
        systemPrompt = `O usuário selecionou um hook ou deu feedback. Agora gere o script completo para o carrossel.
        O script deve ter ${templateConfig.slideCount} slides com conteúdo atrativo e estruturado.
        Responda no formato JSON com 'script' (texto geral) e 'slides' (objeto com índices de slide e campos de conteúdo).`;
        setStep('script');
      } else if (step === 'script') {
        systemPrompt = `O usuário deu feedback sobre o script. Refine o conteúdo conforme solicitado.
        Mantenha a estrutura JSON com 'script' e 'slides' atualizados.`;
        setStep('adjustments');
      }

      const messageList: ChatMessage[] = [
        ...messages,
        {
          id: Date.now().toString(),
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
      ];

      const response = await chatWithTools(
        messageList,
        templateConfig,
        systemPrompt,
        toolDefinitions,
        undefined,
        undefined,
        'pt-BR'
      );

      const assistantMessage = response.content;
      addMessage('assistant', assistantMessage);

      // Try to parse JSON content
      try {
        const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          if (parsed.hooks && Array.isArray(parsed.hooks)) {
            setHooks(parsed.hooks);
          }

          if (parsed.script) {
            setGeneratedScript(parsed.script);
          }

          if (parsed.slides) {
            setGeneratedSlides(parsed.slides);
          }
        }
      } catch (e) {
        // Content might not be JSON, that's okay
      }

      toast.success('Response generated');
    } catch (error) {
      console.error('Chat error:', error);
      addMessage('assistant', 'Desculpa, houve um erro ao processar sua mensagem. Tente novamente.');
      toast.error('Failed to generate response');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHook = (hook: Hook) => {
    setSelectedHook(hook.text);
    addMessage('user', `Gostei do hook: "${hook.text}"`);

    setTimeout(() => {
      addMessage(
        'assistant',
        'Ótimo! Vou criar o script completo para este hook. Deixa eu montar o conteúdo para cada slide...'
      );
    }, 500);
  };

  const handleUseCarousel = () => {
    if (onContentGenerated && (hooks.length > 0 || generatedScript)) {
      onContentGenerated({
        hooks: selectedHook ? [{ text: selectedHook, type: 'curiosity' }] : hooks,
        script: generatedScript,
        slides: generatedSlides,
      });
      toast.success('Carousel content loaded');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-xl font-bold text-gray-900">Gerador de Carrossel IA</h2>
        <p className="text-sm text-gray-600 mt-1">Chat para criar conteúdo do zero</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Hook Selection UI */}
        {hooks.length > 0 && step === 'hooks' && !selectedHook && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-3">Escolha um dos hooks:</p>
            <div className="space-y-2">
              {hooks.map((hook, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectHook(hook)}
                  className="w-full text-left p-3 bg-white border-2 border-blue-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <p className="text-sm font-medium text-gray-900">{hook.text}</p>
                  {hook.engagement_score && (
                    <p className="text-xs text-gray-600 mt-1">
                      Viral Score: {Math.round(hook.engagement_score * 100)}%
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg rounded-bl-none flex items-center gap-2">
              <Loader size={18} className="animate-spin" />
              <span className="text-sm">Pensando...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        {/* Use Carousel Button */}
        {(generatedScript || selectedHook) && (
          <button
            onClick={handleUseCarousel}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition-colors"
          >
            Usar este Carrossel
          </button>
        )}

        {/* Input Field */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              step === 'topic'
                ? 'Ex: Dicas de produtividade...'
                : step === 'hooks'
                  ? 'Escolha um hook acima ou descreva qual prefere...'
                  : 'Peça ajustes (ex: "muda o slide 3...")...'
            }
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Powered by OpenAI • {step === 'topic' && 'Step 1: Choose topic'}
          {step === 'hooks' && 'Step 2: Select hook'}
          {step === 'script' && 'Step 3: Review script'}
          {step === 'adjustments' && 'Step 4: Fine-tune'}
          {step === 'ready' && 'Ready to create!'}
        </p>
      </div>
    </div>
  );
};

export default CarouselChatGenerator;
