import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  async function checkAvailability() {
    if (!/^https?:\/\//.test(apiUrl)) {
      alert('Backend URL has not been configured. Please contact the site administrator.');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/health`);
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      alert('Backend connection is available.');
    } catch {
      alert('Backend connection is not available yet.');
    }
  }

  return (
    <main className="page">
      <header className="header"><strong>TeslaMarketplace</strong><span>Owner-operated vehicle sales</span></header>
      <section className="hero">
        <p className="eyebrow">TESLA VEHICLES</p>
        <h1>Find your next Tesla.</h1>
        <p>Browse vehicles, place an order, pay securely, and track delivery from one account.</p>
        <button onClick={checkAvailability}>Check availability</button>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
