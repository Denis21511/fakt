import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/Layout';
import { EmptyState } from './components/ui';
import { Analytics } from './pages/Analytics';
import { OrderDetail } from './pages/OrderDetail';
import { Orders } from './pages/Orders';
import { Overview } from './pages/Overview';
import { SettingsPage } from './pages/Settings';

function NotFound() {
  return (
    <div className="page">
      <div className="panel">
        <EmptyState
          title="Страница не найдена"
          text="Проверьте адрес или вернитесь на обзор."
          action={
            <Link to="/" className="btn btn-secondary">
              На обзор
            </Link>
          }
        />
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
