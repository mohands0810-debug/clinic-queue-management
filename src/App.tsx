import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { Header } from '@/components/common/Header';
import { HomePage } from '@/pages/HomePage';
import { GetTokenPage } from '@/pages/GetTokenPage';
import { StatusPage } from '@/pages/StatusPage';
import { DisplayPage } from '@/pages/DisplayPage';
import { DoctorPage } from '@/pages/DoctorPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isTvDisplay = location.pathname === '/display';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {!isTvDisplay && <Header />}
      <main className="flex-1">{children}</main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AccessibilityProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/get-token" element={<GetTokenPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/display" element={<DisplayPage />} />
            <Route path="/doctor" element={<DoctorPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AccessibilityProvider>
  );
};

export default App;
