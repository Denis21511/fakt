import { Link } from 'react-router-dom';
import { CornerMarks, Logo } from '../components/brand/Logo';
import { useDocumentTitle } from '../hooks/misc';

export function NotFound({ inApp = false }: { inApp?: boolean }) {
  useDocumentTitle('Страница не найдена');
  return (
    <div className={inApp ? 'page' : 'standalone'}>
      {!inApp && (
        <Link to="/" className="standalone__logo" aria-label="TRACE — на главную">
          <Logo />
        </Link>
      )}
      <div className="lost">
        <div className="lost__code">
          <CornerMarks size={18} />
          <span className="mono">404</span>
        </div>
        <h1 className="lost__title">Такой страницы нет</h1>
        <p className="lost__text">Адрес набран с ошибкой или страница была удалена.</p>
        <div className="lost__actions">
          {inApp ? (
            <Link className="btn btn--dark" to="/app">
              На панель производства
            </Link>
          ) : (
            <>
              <Link className="btn btn--dark" to="/">
                На главную
              </Link>
              <Link className="btn btn--secondary" to="/app">
                Открыть демо
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
