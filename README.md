# Cognic Web (MVP)

Przeglądarkowa aplikacja dla terapeuty: lista sesji i szczegóły (podsumowanie, opcjonalnie SOAP + wątki z pola `analysis`, transkrypcja).

## Wymagania

- Node.js 20+
- Konto Auth0 z aplikacją typu **Single Page Application**
- Działające API Cognic (`cognic-server`) z CORS (obecnie `cors: true` na backendzie)

## Konfiguracja Auth0

1. Utwórz aplikację **SPA** w Auth0.
2. **Allowed Callback URLs:** `http://localhost:5173`, później URL produkcyjnej strony (np. `https://web.cognic.example`).
3. **Allowed Logout URLs:** jak wyżej.
4. **Allowed Web Origins:** jak wyżej.
5. **Audience:** użyj identyfikatora API Auth0 zgodnego z `VITE_AUTH0_AUDIENCE` (zwykle URL backendu, tak jak w aplikacji mobilnej).

## Uruchomienie lokalne

```bash
cp .env.example .env
# Uzupełnij VITE_AUTH0_CLIENT_ID i ewentualnie URL API

npm install
npm run dev
```

Aplikacja: [http://localhost:5173](http://localhost:5173)

## Endpointy API

- `GET /v1/session` — lista sesji (JWT)
- `GET /v1/session/:id` — szczegóły

## Build produkcyjny

```bash
npm run build
npm run preview
```

Statyczny build w katalogu `dist/` można hostować na dowolnym CDN / DigitalOcean App Platform / nginx.

## Repozytorium

https://github.com/gmi-software/cognic-web
