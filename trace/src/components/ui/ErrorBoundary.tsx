import { Component, type ReactNode } from 'react';
import { CornerMarks } from '../brand/Logo';

interface State {
  error: Error | null;
}

/** Ошибка отрисовки не должна оставлять пустой экран: показываем, что случилось, и даём перезагрузить */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('TRACE: ошибка отрисовки', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="standalone">
        <div />
        <div className="lost">
          <div className="lost__code">
            <CornerMarks size={18} />
            <span className="mono">ERR</span>
          </div>
          <h1 className="lost__title">Экран не отрисовался</h1>
          <p className="lost__text">
            Данные в хранилище не пострадали. Перезагрузите страницу — если ошибка повторится, вернитесь на панель производства.
          </p>
          <p className="lost__text mono" style={{ fontSize: 13 }}>
            {this.state.error.message}
          </p>
          <div className="lost__actions">
            <button type="button" className="btn btn--dark" onClick={() => window.location.reload()}>
              Перезагрузить
            </button>
            <a className="btn btn--secondary" href={`${import.meta.env.BASE_URL}app`}>
              На панель производства
            </a>
          </div>
        </div>
      </div>
    );
  }
}
