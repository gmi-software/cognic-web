import { Auth0Provider } from '@auth0/auth0-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

if (!domain || !clientId) {
  document.body.innerHTML =
    '<p style="font-family:system-ui;padding:2rem">Brak konfiguracji Auth0. Utwórz plik <code>.env</code> wg <code>.env.example</code>.</p>';
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        }}
        cacheLocation="localstorage">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Auth0Provider>
    </StrictMode>,
  );
}
