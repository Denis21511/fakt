import { useEffect, useRef, useState } from 'react';
import { repository, type StoredFile } from '../storage';

export interface BlobUrlState {
  url: string | null;
  status: 'idle' | 'loading' | 'ready' | 'missing';
}

/**
 * Object URL для файла из хранилища. key — что однозначно определяет файл;
 * при его смене загрузка повторяется, прошлый URL освобождается.
 */
export function useBlobUrl(key: string | null | undefined, load: () => Promise<StoredFile | Blob | null>): BlobUrlState {
  const [state, setState] = useState<BlobUrlState>({ url: null, status: key ? 'loading' : 'idle' });
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!key) {
      setState({ url: null, status: 'idle' });
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    setState({ url: null, status: 'loading' });
    loadRef
      .current()
      .then((res) => {
        if (cancelled) return;
        const blob = res instanceof Blob ? res : res?.blob;
        if (!blob) {
          setState({ url: null, status: 'missing' });
          return;
        }
        url = URL.createObjectURL(blob);
        setState({ url, status: 'ready' });
      })
      .catch(() => !cancelled && setState({ url: null, status: 'missing' }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key]);

  return state;
}

export function useFileUrl(fileId: string | null | undefined): BlobUrlState {
  return useBlobUrl(fileId, () => repository.files.get(fileId!));
}

/** Превью выбранного, но ещё не сохранённого файла */
export function useLocalFileUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}
