import { createRoot } from 'react-dom/client';

import App from './App';
import { installApiAuthFetch } from './lib/api-auth';

import './index.css';

installApiAuthFetch();

createRoot(document.getElementById('root')!).render(<App />);
