import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ViewModeProvider } from './hooks/useViewMode';
import { ProtectedLayout, AdminRoute } from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import ReceiptsPage from './pages/ReceiptsPage';
import ReceiptDetailPage from './pages/ReceiptDetailPage';
import MembersPage from './pages/MembersPage';
import ComparisonPage from './pages/ComparisonPage';
import SettingsPage from './pages/SettingsPage';
import MonitoringPage from './pages/MonitoringPage';

export default function App() {
  return (
    <AuthProvider>
      <ViewModeProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/receipts/:id" element={<ReceiptDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/members" element={<MembersPage />} />
              <Route path="/comparison" element={<ComparisonPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ViewModeProvider>
    </AuthProvider>
  );
}
