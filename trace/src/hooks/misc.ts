import { useEffect, useState } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — TRACE` : 'TRACE — цифровые паспорта изделий';
    return () => {
      document.title = prev;
    };
  }, [title]);
}

const PREFS_KEY = 'trace:prefs';

function readPrefs(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch {
    return {};
  }
}

/** Настройки интерфейса (вид каталога и т. п.) — отдельно от рабочих данных */
export function usePref<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const v = readPrefs()[key];
    return allowed.includes(v as T) ? (v as T) : fallback;
  });
  const update = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), [key]: v }));
    } catch {
      // Не критично: вид просто не запомнится
    }
  };
  return [value, update];
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}
