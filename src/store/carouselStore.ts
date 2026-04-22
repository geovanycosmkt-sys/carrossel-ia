import { create } from 'zustand';
import { Template, Hook, ChatMessage } from '@/types';

export interface CarouselStore {
  // Current creation flow
  step: 'template' | 'input' | 'chat' | 'preview' | 'editor';
  selectedTemplate: Template | null;
  inputType: 'text' | 'url' | 'chat';
  inputContent: string;

  // Generated content
  hooks: Hook[];
  selectedHook: Hook | null;
  carouselText: Record<string, Record<string, string>> | null;
  caption: string;
  imageKeywords: Record<string, string> | null;
  generatedImages: Record<string, string> | null;
  fabricSlides: any[] | null;

  // Chat
  chatMessages: ChatMessage[];

  // Loading states
  isGenerating: boolean;
  isLoadingImages: boolean;

  // Actions
  setStep(step: 'template' | 'input' | 'chat' | 'preview' | 'editor'): void;
  setSelectedTemplate(template: Template | null): void;
  setInputType(type: 'text' | 'url' | 'chat'): void;
  setInputContent(content: string): void;
  setHooks(hooks: Hook[]): void;
  selectHook(hook: Hook): void;
  setCarouselText(text: Record<string, Record<string, string>> | null): void;
  setCaption(caption: string): void;
  setImageKeywords(keywords: Record<string, string> | null): void;
  setGeneratedImages(images: Record<string, string> | null): void;
  setFabricSlides(slides: any[] | null): void;
  addChatMessage(message: ChatMessage): void;
  clearChatMessages(): void;
  setIsGenerating(loading: boolean): void;
  setIsLoadingImages(loading: boolean): void;
  reset(): void;
}

export const useCarouselStore = create<CarouselStore>((set) => ({
  // Initial state
  step: 'template',
  selectedTemplate: null,
  inputType: 'text',
  inputContent: '',

  hooks: [],
  selectedHook: null,
  carouselText: null,
  caption: '',
  imageKeywords: null,
  generatedImages: null,
  fabricSlides: null,

  chatMessages: [],

  isGenerating: false,
  isLoadingImages: false,

  // Actions
  setStep: (step) => set({ step }),

  setSelectedTemplate: (template) => set({ selectedTemplate: template }),

  setInputType: (inputType) => set({ inputType }),

  setInputContent: (inputContent) => set({ inputContent }),

  setHooks: (hooks) => set({ hooks }),

  selectHook: (hook) => set({ selectedHook: hook }),

  setCarouselText: (text) => set({ carouselText: text }),

  setCaption: (caption) => set({ caption }),

  setImageKeywords: (keywords) => set({ imageKeywords: keywords }),

  setGeneratedImages: (images) => set({ generatedImages: images }),

  setFabricSlides: (slides) => set({ fabricSlides: slides }),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  clearChatMessages: () => set({ chatMessages: [] }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setIsLoadingImages: (isLoadingImages) => set({ isLoadingImages }),

  reset: () =>
    set({
      step: 'template',
      selectedTemplate: null,
      inputType: 'text',
      inputContent: '',
      hooks: [],
      selectedHook: null,
      carouselText: null,
      caption: '',
      imageKeywords: null,
      generatedImages: null,
      fabricSlides: null,
      chatMessages: [],
      isGenerating: false,
      isLoadingImages: false,
    }),
}));
