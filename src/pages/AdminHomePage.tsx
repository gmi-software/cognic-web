import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function AdminHomePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const id = userId.trim();
    if (!id) return;
    void navigate(`/admin/users/${encodeURIComponent(id)}`);
  };

  return (
    <div className="page">
      <p className="muted">
        <Link to="/sessions">← Lista sesji</Link>
      </p>
      <h1>Panel administratora</h1>
      <p className="muted">
        Wpisz Auth0 <code>sub</code> użytkownika (np. z Auth0 Dashboard → Users).
      </p>

      <form className="card admin-form" onSubmit={onSubmit}>
        <label className="stack">
          <span className="meta-label">User ID (Auth0 sub)</span>
          <input
            className="input"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="auth0|… lub google-oauth2|…"
            autoComplete="off"
          />
        </label>
        <div className="admin-form__actions">
          <button type="submit" className="btn btn--primary" disabled={!userId.trim()}>
            Otwórz użytkownika
          </button>
        </div>
      </form>

      <p className="muted small" style={{ marginTop: '1.5rem' }}>
        <Link to="/admin/analytics">Analityka użycia (sesje w zakresie dat)</Link>
      </p>
    </div>
  );
}
