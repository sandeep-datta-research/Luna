import { create } from 'zustand';

interface ToastData {
  id: string;
  message: string;
}

interface RetryPayload {
  type: string;
  prompt: string;
  sessionId: string;
}

interface LunaStore {
  isSidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  searchQuery: string;
  characterSearchQuery: string;
  toast: ToastData | null;
  lastRetryPayload: RetryPayload | null;
  inputValue: string;
  selectedModel: string;
  webSearchMode: boolean;
  researchMode: boolean;
  imageMode: boolean;
  attachments: string[];

  setIsSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setMobileSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setSearchQuery: (val: string | ((prev: string) => string)) => void;
  setCharacterSearchQuery: (val: string | ((prev: string) => string)) => void;
  setToast: (toast: ToastData | null) => void;
  setLastRetryPayload: (payload: RetryPayload | null) => void;
  setInputValue: (val: string | ((prev: string) => string)) => void;
  setSelectedModel: (val: string | ((prev: string) => string)) => void;
  setWebSearchMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  setResearchMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  setImageMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  setAttachments: (val: string[] | ((prev: string[]) => string[])) => void;
}

export const useLunaStore = create<LunaStore>((set) => ({
  isSidebarOpen: true,
  mobileSidebarOpen: false,
  searchQuery: '',
  characterSearchQuery: '',
  toast: null,
  lastRetryPayload: null,
  inputValue: '',
  selectedModel: 'luna-2.5',
  webSearchMode: false,
  researchMode: false,
  imageMode: false,
  attachments: [],

  setIsSidebarOpen: (val) => set((state) => ({ isSidebarOpen: typeof val === 'function' ? val(state.isSidebarOpen) : val })),
  setMobileSidebarOpen: (val) => set((state) => ({ mobileSidebarOpen: typeof val === 'function' ? val(state.mobileSidebarOpen) : val })),
  setSearchQuery: (val) => set((state) => ({ searchQuery: typeof val === 'function' ? val(state.searchQuery) : val })),
  setCharacterSearchQuery: (val) => set((state) => ({ characterSearchQuery: typeof val === 'function' ? val(state.characterSearchQuery) : val })),
  setToast: (toast) => set({ toast }),
  setLastRetryPayload: (lastRetryPayload) => set({ lastRetryPayload }),
  setInputValue: (val) => set((state) => ({ inputValue: typeof val === 'function' ? val(state.inputValue) : val })),
  setSelectedModel: (val) => set((state) => ({ selectedModel: typeof val === 'function' ? val(state.selectedModel) : val })),
  setWebSearchMode: (val) => set((state) => ({ webSearchMode: typeof val === 'function' ? val(state.webSearchMode) : val })),
  setResearchMode: (val) => set((state) => ({ researchMode: typeof val === 'function' ? val(state.researchMode) : val })),
  setImageMode: (val) => set((state) => ({ imageMode: typeof val === 'function' ? val(state.imageMode) : val })),
  setAttachments: (val) => set((state) => ({ attachments: typeof val === 'function' ? val(state.attachments) : val })),
}));
