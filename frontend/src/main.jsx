import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!apiUrl) return;
    fetch(`${apiUrl}/api/vehicles`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Backend unavailable')))
      .then((payload) => setVehicles(payload.data || []))
      .catch(() => setStatus('Marketplace inventory will appear when the backend is connected.'));
  }, []);

  async function checkAvailability() {
    if (!/^https?:\/\//.test(apiUrl)) {
      setStatus('Backend URL has not been configured.');
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/health`);
      if (!response.ok) throw new Error('Backend unavailable');
      const payload = await response.json();
      setStatus(payload.database === 'connected' ? 'Backend and PostgreSQL are connected.' : 'Backend is online; PostgreSQL is not configured yet.');
    } catch {
      setStatus('Backend connection is not available yet.');
    }
  }

  return (
    <main className="page">
      <header className="header"><strong>TeslaMarketplace</strong><span>Independent EV marketplace</span></header>
      <section className="hero">
        <p className="eyebrow">ELECTRIC VEHICLES</p>
        <h1>Find your next EV.</h1>
        <p>Browse vehicles, submit purchase requests, create an account, and track your journey from one marketplace.</p>
        <button onClick={checkAvailability}>Check availability</button>
        {status && <p className="status" role="status">{status}</p>}
      </section>
      <section className="inventory" aria-labelledby="inventory-title">
        <div className="section-heading"><p className="eyebrow">LIVE INVENTORY</p><h2 id="inventory-title">Marketplace</h2></div>
        {vehicles.length === 0 ? <p className="muted">Connect the backend to load current inventory.</p> : <div className="vehicle-grid">{vehicles.map((vehicle) => <article className="vehicle-card" key={vehicle.id}><div><span>{vehicle.year}</span><h3>{vehicle.model}</h3><p>{vehicle.description || 'Electric vehicle'}</p></div><strong>${Number(vehicle.price).toLocaleString()}</strong><small>{vehicle.range ? `${vehicle.range} mi estimated range` : 'Range available on request'} · {vehicle.status}</small></article>)}</div>}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
