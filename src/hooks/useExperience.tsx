import { useCallback, useEffect, useState } from 'react';

export type Experience = 'classic' | 'new';

const KEY = 'pie-experience';

const read = (): Experience | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'classic' || v === 'new' ? v : null;
  } catch {
    return null;
  }
};

/**
 * Which version of the app the user chose after logging in.
 * `null` means they haven't picked yet, so the chooser is shown.
 */
export const useExperience = () => {
  const [experience, setExperienceState] = useState<Experience | null>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setExperienceState(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setExperience = useCallback((next: Experience) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    setExperienceState(next);
  }, []);

  const clearExperience = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setExperienceState(null);
  }, []);

  return { experience, setExperience, clearExperience };
};
