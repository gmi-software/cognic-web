import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './routes/RequireAuth';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { SessionsPage } from './pages/SessionsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/sessions" replace />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
