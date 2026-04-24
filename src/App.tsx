import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { AdminHomePage } from './pages/AdminHomePage';
import { AdminUserPage } from './pages/AdminUserPage';
import { AdminUserSessionPage } from './pages/AdminUserSessionPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { SessionsPage } from './pages/SessionsPage';
import { RequireAuth } from './routes/RequireAuth';
import { RequireStaffAdmin } from './routes/RequireStaffAdmin';

export default function App() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/sessions" replace />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
          <Route element={<RequireStaffAdmin />}>
            <Route path="/admin" element={<AdminHomePage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/users/:userId" element={<AdminUserPage />} />
            <Route
              path="/admin/users/:userId/sessions/:sessionId"
              element={<AdminUserSessionPage />}
            />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
