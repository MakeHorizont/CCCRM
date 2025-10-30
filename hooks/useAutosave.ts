import { useState, useEffect, useCallback } from 'react';

// Debounce function to limit how often localStorage is written to.
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => void;
};

/**
 * A hook to automatically save component state to localStorage and restore it.
 * @param key A unique key for the localStorage item.
 * @param data The data to be autosaved.
 * @param onRestore A callback function to update the component's state with the restored data.
 * @param enabled A boolean to enable or disable the autosave functionality.
 */
export const useAutosave = <T,>(key: string, data: T, onRestore: (restoredData: T) => void, enabled: boolean = true) => {
  const [hasRestorableData, setHasRestorableData] = useState(false);

  const saveState = useCallback(debounce((stateToSave: T) => {
    if (enabled && stateToSave && Object.keys(stateToSave).length > 0) {
      try {
        localStorage.setItem(key, JSON.stringify(stateToSave));
      } catch (e) {
        console.error("Autosave to localStorage failed:", e);
      }
    }
  }, 1000), [key, enabled]); // Save 1 second after the last change

  // Effect to save data when it changes
  useEffect(() => {
    if (enabled && data) {
      saveState(data);
    }
  }, [data, saveState, enabled]);

  // Effect to check for restorable data on mount
  useEffect(() => {
    if (enabled) {
      try {
        const savedData = localStorage.getItem(key);
        if (savedData) {
          setHasRestorableData(true);
        }
      } catch (e) {
        console.error("Failed to check for restorable data:", e);
      }
    }
  }, [key, enabled]);

  const restoreState = useCallback(() => {
    if (enabled) {
      try {
        const savedData = localStorage.getItem(key);
        if (savedData) {
          onRestore(JSON.parse(savedData));
          clearState(); // Clear after restoring to prevent re-prompting
        }
      } catch (e) {
        console.error("Failed to restore data:", e);
      }
    }
  }, [key, onRestore, enabled]);

  const clearState = useCallback(() => {
    if (enabled) {
      try {
        localStorage.removeItem(key);
        setHasRestorableData(false);
      } catch (e) {
        console.error("Failed to clear autosaved data:", e);
      }
    }
  }, [key, enabled]);

  return { hasRestorableData, restoreState, clearState };
};