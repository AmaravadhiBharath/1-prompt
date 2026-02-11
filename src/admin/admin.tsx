import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminPage from './AdminPage';
import '../sidepanel/oneprompt.css';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <AdminPage />
        </React.StrictMode>
    );
}
