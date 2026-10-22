import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PageFallback } from './components/ui/PageFallback';
import { Toaster } from './components/ui/Toaster';
import { NotFound } from './pages/NotFound';

const Landing = lazy(() => import('./pages/Landing'));
const PublicPassportPage = lazy(() => import('./pages/PublicPassport'));
const AppLayout = lazy(() => import('./layouts/AppLayout'));
const Overview = lazy(() => import('./pages/app/Overview'));
const Products = lazy(() => import('./pages/app/Products'));
const ProductEditor = lazy(() => import('./pages/app/ProductEditor'));
const ProductDetail = lazy(() => import('./pages/app/ProductDetail'));
const QrCodes = lazy(() => import('./pages/app/QrCodes'));
const Documents = lazy(() => import('./pages/app/Documents'));
const Warranties = lazy(() => import('./pages/app/Warranties'));
const Settings = lazy(() => import('./pages/app/Settings'));

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/p/:token" element={<PublicPassportPage />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Overview />} />
              <Route path="products" element={<Products />} />
              <Route path="products/new" element={<ProductEditor />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="products/:id/edit" element={<ProductEditor />} />
              <Route path="qr" element={<QrCodes />} />
              <Route path="documents" element={<Documents />} />
              <Route path="warranties" element={<Warranties />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound inApp />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Toaster />
    </BrowserRouter>
  );
}
