import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { getClientAuth } from './lib/auth';
import { installApiAuthFetch } from './lib/api-auth';
import './lib/install-prompt'; // must run before the browser's one-time install event fires
import App from './App';
import './index.css';

installApiAuthFetch();

// Lets browsers install the portal as an app (desktop / home-screen shortcut via "Add to Shortcut")
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

setAuthTokenGetter(() => {
  const auth = getClientAuth();
  return auth?.email || null;
});

createRoot(document.getElementById('root')!).render(<App />);
