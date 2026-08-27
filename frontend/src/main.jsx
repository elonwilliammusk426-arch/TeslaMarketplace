import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return (
    <main className="page">
      <header className="header"><strong>TeslaMarketplace</strong><span>Owner-operated vehicle sales</span></header>
      <section className="hero">
        <p className="eyebrow">TESLA VEHICLES</p>
        <h1>Find your next Tesla.</h1>
        <p>Browse vehicles, place an order, pay securely, and track delivery from one account.</p>
        <button onClick={() => fetch(`${apiUrl}/health`).then(() => alert('Backend connection is available.')).catch(() => alert('Backend connection is not available yet.'))}>Check availability</button>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
