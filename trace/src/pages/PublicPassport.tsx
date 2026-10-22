import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock3, SearchX } from 'lucide-react';
import { CornerMarks, Logo } from '../components/brand/Logo';
import { PassportView } from '../components/passport/PassportView';
import type { PassportLookup, PublicDocument } from '../domain/passport';
import { useDocumentTitle } from '../hooks/misc';
import { downloadBlob } from '../lib/download';
import { repository } from '../storage';
import { toast } from '../state/toast';
import '../styles/passport.css';

export default function PublicPassportPage() {
  const { token = '' } = useParams();
  const [lookup, setLookup] = useState<PassportLookup | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      repository
        .getPassport(token)
        .then((res) => alive && setLookup(res))
        .catch(() => alive && setLookup({ status: 'not-found' }));
    void load();
    // Если производитель изменил паспорт в соседней вкладке — показываем актуальную версию
    const unsubscribe = repository.subscribe(() => void load());
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [token]);

  useDocumentTitle(lookup?.status === 'ok' ? `${lookup.passport.product.name} — цифровой паспорт` : 'Цифровой паспорт изделия');

  if (!lookup) {
    return (
      <div className="pp-state" role="status" aria-label="Загрузка паспорта">
        <span className="spinner" />
      </div>
    );
  }

  if (lookup.status !== 'ok') {
    const notFound = lookup.status === 'not-found';
    return (
      <main className="pp-state">
        <div className="pp-state__card">
          <div className="pp-state__icon">
            <CornerMarks size={18} />
            {notFound ? <SearchX aria-hidden /> : <Clock3 aria-hidden />}
          </div>
          <h1 className="pp-state__title">{notFound ? 'Паспорт не найден' : 'Паспорт ещё не опубликован'}</h1>
          <p className="pp-state__text">
            {notFound
              ? 'По этому коду нет паспорта изделия. Проверьте, что QR-код отсканирован целиком, или обратитесь к продавцу.'
              : 'Производитель подготовил паспорт этого изделия, но пока не открыл к нему доступ. Попробуйте открыть код позже.'}
          </p>
          {notFound && <span className="pp-state__token mono">Код: {token}</span>}
          <Link to="/" className="pp-state__foot" aria-label="TRACE — цифровые паспорта изделий">
            <Logo size={22} />
          </Link>
        </div>
      </main>
    );
  }

  const openDocument = async (doc: PublicDocument, mode: 'view' | 'download') => {
    // Окно открывается синхронно с кликом, иначе браузер заблокирует его как всплывающее
    const win = mode === 'view' ? window.open('', '_blank') : null;
    try {
      const file = await repository.getPassportFile(token, doc.id);
      if (!file) throw new Error('missing');
      if (mode === 'download' || !win) {
        downloadBlob(file.blob, doc.fileName);
        win?.close();
        return;
      }
      const url = URL.createObjectURL(file.blob);
      win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      win?.close();
      toast.error('Документ недоступен', 'Файл не найден в хранилище. Сообщите производителю серийный номер изделия.');
    }
  };

  return (
    <div className="public-page">
      <main className="passport-shell">
        <PassportView passport={lookup.passport} publicToken={token} onOpenDocument={openDocument} />
      </main>
      {lookup.passport.isDemo && (
        <p className="public-note">
          Демонстрационный паспорт: производитель «ФОРМАТ МЕТАЛЛ» и его контакты вымышлены. <Link to="/">Что такое TRACE</Link>
        </p>
      )}
    </div>
  );
}
