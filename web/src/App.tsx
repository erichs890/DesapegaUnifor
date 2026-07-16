import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RequireAuth } from './components/RequireAuth';
import { RouteProgress } from './components/RouteProgress';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import Landing from './pages/Landing';
import Anunciar from './pages/Anunciar';
import MeusAnuncios from './pages/MeusAnuncios';
import Entrar from './pages/Entrar';
import Cadastro from './pages/Cadastro';
import Perfil from './pages/Perfil';
import Item from './pages/Item';
import NotFound from './pages/NotFound';

/** Move o foco para o conteúdo principal a cada troca de rota (a11y). */
function FocusOnRouteChange() {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.getElementById('conteudo');
    main?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <a href="#conteudo" className="skip-link">
            Pular para o conteúdo
          </a>
          <RouteProgress />
          <FocusOnRouteChange />
          <Navbar />
          <main id="conteudo" tabIndex={-1} style={{ outline: 'none' }}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/item/:id" element={<Item />} />
              <Route path="/entrar" element={<Entrar />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route
                path="/anunciar"
                element={
                  <RequireAuth>
                    <Anunciar />
                  </RequireAuth>
                }
              />
              <Route
                path="/meus"
                element={
                  <RequireAuth>
                    <MeusAnuncios />
                  </RequireAuth>
                }
              />
              <Route
                path="/perfil"
                element={
                  <RequireAuth>
                    <Perfil />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <BottomNav />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
