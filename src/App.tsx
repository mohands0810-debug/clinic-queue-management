import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { AuthProvider } from '@/context/AuthContext';
import { Header } from '@/components/common/Header';
import { InitialOpenSplash } from '@/components/common/InitialOpenSplash';
import { HomePage } from '@/pages/HomePage';
import { GetTokenPage } from '@/pages/GetTokenPage';
import { StatusPage } from '@/pages/StatusPage';
import { DisplayPage } from '@/pages/DisplayPage';
import { DoctorPage } from '@/pages/DoctorPage';
import { InstantTokenPage } from '@/pages/InstantTokenPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isTvDisplay = location.pathname === '/display';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <InitialOpenSplash />
      {!isTvDisplay && <Header />}
      <main key={location.pathname} className="flex-1 animate-fade-in">
        {children}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/instant-token" element={<InstantTokenPage />} />
              <Route path="/get-token" element={<GetTokenPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/display" element={<DisplayPage />} />
              <Route path="/doctor" element={<DoctorPage />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </AccessibilityProvider>
    </AuthProvider>
  );
};

export default App;

