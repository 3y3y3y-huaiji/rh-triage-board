import { AGENT_COPY_PROMPT_EN, AGENT_COPY_PROMPT_ZH } from './config/ecosystem';
import { loadBoardSnapshot, type BoardFallbackReason } from './data/load-board';
import { MOCK_BOARD_SNAPSHOT } from './data/mock-board';
import { analyzeBoard } from './domain/analyze-board';
import type { AnalyzedBoard, ComputeTier, TopicClusterId } from './domain/types';
import { getMessages, normalizeLocale } from './i18n';
import type { Locale } from './i18n/types';
import './index.css';
import {
  renderBoardShell,
  renderLoadingShell,
  type BoardTab,
  type BoardUiState,
} from './views/board-shell';
import type { ThemePreference } from './views/header';

const STORAGE_LOCALE_KEY = 'rh-board-locale';
const STORAGE_THEME_KEY = 'rh-board-theme';

const applyTheme = (theme: ThemePreference): void => {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const readStoredLocale = (): Locale => {
  try {
    const saved = window.localStorage.getItem(STORAGE_LOCALE_KEY);
    if (saved) return normalizeLocale(saved);
  } catch {
    // 忽略受限存储环境
  }
  return normalizeLocale(navigator.language);
};

const readStoredTheme = (): ThemePreference => {
  try {
    const saved = window.localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // 忽略受限存储环境
  }
  return 'system';
};

const bootstrap = async (): Promise<void> => {
  const root = document.getElementById('app');
  if (!root) return;

  let board: AnalyzedBoard | null = null;
  let fallbackReason: BoardFallbackReason = null;
  const expandedSections = new Set<string>();

  const state: BoardUiState = {
    locale: readStoredLocale(),
    theme: readStoredTheme(),
    activeTab: 'all',
    search: '',
    topic: 'all',
    computeTier: 'all',
    hideSubsumed: false,
    promptCopied: false,
    expandedSections,
  };

  const render = (): void => {
    const messages = getMessages(state.locale);
    document.documentElement.lang = messages.htmlLang;
    applyTheme(state.theme);

    if (!board) {
      root.innerHTML = renderLoadingShell(MOCK_BOARD_SNAPSHOT, state, messages);
      return;
    }

    const activeElId =
      document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    const selectionStart =
      document.activeElement instanceof HTMLInputElement
        ? document.activeElement.selectionStart
        : null;

    root.innerHTML = renderBoardShell(board, fallbackReason, state, messages);

    if (activeElId === 'board-search') {
      const searchEl = document.getElementById('board-search');
      if (searchEl instanceof HTMLInputElement) {
        searchEl.focus();
        if (selectionStart !== null) {
          searchEl.setSelectionRange(selectionStart, selectionStart);
        }
      }
    }
  };

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === 'locale-select' && target instanceof HTMLSelectElement) {
      state.locale = normalizeLocale(target.value);
      try {
        window.localStorage.setItem(STORAGE_LOCALE_KEY, state.locale);
      } catch {
        // 忽略受限存储环境
      }
      render();
    } else if (target.id === 'theme-select' && target instanceof HTMLSelectElement) {
      const value = target.value;
      state.theme = value === 'light' || value === 'dark' ? value : 'system';
      try {
        window.localStorage.setItem(STORAGE_THEME_KEY, state.theme);
      } catch {
        // 忽略受限存储环境
      }
      render();
    } else if (target.id === 'topic-select' && target instanceof HTMLSelectElement) {
      state.topic = target.value as TopicClusterId | 'all';
      render();
    } else if (target.id === 'hide-subsumed-toggle' && target instanceof HTMLInputElement) {
      state.hideSubsumed = target.checked;
      render();
    }
  });

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.id === 'board-search') {
      state.search = target.value;
      render();
    }
  });

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest<HTMLElement>('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    if (action === 'set-tab' && button.dataset.tab) {
      state.activeTab = button.dataset.tab as BoardTab;
      render();
    } else if (action === 'set-theme' && button.dataset.theme) {
      const value = button.dataset.theme;
      state.theme = value === 'light' || value === 'dark' ? value : 'system';
      try {
        window.localStorage.setItem(STORAGE_THEME_KEY, state.theme);
      } catch {
        // 忽略受限存储环境
      }
      render();
    } else if (action === 'set-compute-tier' && button.dataset.tier) {
      state.computeTier = button.dataset.tier as ComputeTier | 'all';
      render();
    } else if (action === 'toggle-section' && button.dataset.section) {
      const key = button.dataset.section;
      if (expandedSections.has(key)) expandedSections.delete(key);
      else expandedSections.add(key);
      render();
    } else if (action === 'copy-agent-prompt') {
      const prompt = state.locale === 'zh' ? AGENT_COPY_PROMPT_ZH : AGENT_COPY_PROMPT_EN;
      void navigator.clipboard?.writeText(prompt).catch(() => undefined);
      state.promptCopied = true;
      render();
      window.setTimeout(() => {
        state.promptCopied = false;
        render();
      }, 2000);
    }
  });

  render();

  const loaded = await loadBoardSnapshot();
  board = analyzeBoard(loaded.snapshot);
  fallbackReason = loaded.fallbackReason;
  render();
};

void bootstrap();
