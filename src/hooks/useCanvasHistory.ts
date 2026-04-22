import { useState, useCallback } from 'react';

interface CanvasHistoryState {
  history: any[];
  currentIndex: number;
}

const MAX_HISTORY_STATES = 50;

/**
 * Hook for managing undo/redo functionality with Fabric.js canvas
 * Stores canvas JSON states with a maximum of 50 states
 */
export function useCanvasHistory(initialState?: any) {
  const [historyState, setHistoryState] = useState<CanvasHistoryState>({
    history: initialState ? [initialState] : [],
    currentIndex: initialState ? 0 : -1,
  });

  /**
   * Push a new canvas state to the history
   */
  const pushState = useCallback((canvasJSON: any) => {
    setHistoryState((prev) => {
      // Remove any states after the current index (when redo was previously possible)
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);

      // Add the new state
      newHistory.push(canvasJSON);

      // Keep only the last MAX_HISTORY_STATES
      if (newHistory.length > MAX_HISTORY_STATES) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        currentIndex: newHistory.length - 1,
      };
    });
  }, []);

  /**
   * Undo to the previous state
   */
  const undo = useCallback(() => {
    setHistoryState((prev) => {
      if (prev.currentIndex <= 0) return prev;

      return {
        ...prev,
        currentIndex: prev.currentIndex - 1,
      };
    });
  }, []);

  /**
   * Redo to the next state
   */
  const redo = useCallback(() => {
    setHistoryState((prev) => {
      if (prev.currentIndex >= prev.history.length - 1) return prev;

      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
      };
    });
  }, []);

  /**
   * Check if undo is available
   */
  const canUndo = historyState.currentIndex > 0;

  /**
   * Check if redo is available
   */
  const canRedo = historyState.currentIndex < historyState.history.length - 1;

  /**
   * Get the current state
   */
  const currentState =
    historyState.currentIndex >= 0 ? historyState.history[historyState.currentIndex] : null;

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistoryState({
      history: [],
      currentIndex: -1,
    });
  }, []);

  /**
   * Get the full history (for debugging or advanced use cases)
   */
  const getHistory = useCallback(() => {
    return historyState.history;
  }, [historyState.history]);

  /**
   * Get current history index
   */
  const getCurrentIndex = useCallback(() => {
    return historyState.currentIndex;
  }, [historyState.currentIndex]);

  return {
    // State
    history: historyState.history,
    currentIndex: historyState.currentIndex,
    currentState,
    canUndo,
    canRedo,

    // Actions
    pushState,
    undo,
    redo,
    clearHistory,
    getHistory,
    getCurrentIndex,
  };
}
