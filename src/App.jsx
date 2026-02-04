import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { createPageUrl } from './utils';
import PerfilFuncionario from './pages/PerfilFuncionario';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => {
  if (!Layout) {
    return <>{children}</>;
  }
  if (String(currentPageName).toLowerCase() === 'login') {
    return <>{children}</>;
  }
  return <Layout currentPageName={currentPageName}>{children}</Layout>;
};

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      if (location.pathname.toLowerCase() !== '/login') {
        return <Navigate to="/login" replace />;
      }
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      <Route path="/perfil-funcionario/:id" element={
        <LayoutWrapper currentPageName="GestaoEquipe">
          <PerfilFuncionario />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route key={path} path={createPageUrl(path)} element={
          <LayoutWrapper currentPageName={path}>
            <Page />
          </LayoutWrapper>
        } />
      ))}
      {Object.keys(Pages).map((path) => (
        <Route key={`${path}-legacy`} path={`/${path}`} element={<Navigate to={createPageUrl(path)} replace />} />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
