import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const fallbackImages = [
  'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1597007066704-67bf2068d5b2?auto=format&fit=crop&w=1400&q=85'
];

async function api(path, options = {}) {
  if (!API) throw new Error('The backend URL is not configured.');
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

function vehicleImage(vehicle, index) {
  return vehicle.imageUrl || vehicle.metadata?.imageUrl || fallbackImages[index % fallbackImages.length];
}

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState('home');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [tracking, setTracking] = useState(null);
  const [purchase, setPurchase] = useState({ name: '', email: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api('/api/vehicles')
      .then((payload) => active && setVehicles(payload.data || []))
      .catch((error) => active && setNotice(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filteredVehicles = useMemo(() => vehicles.filter((vehicle) => {
    const haystack = `${vehicle.model} ${vehicle.year} ${vehicle.status}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (statusFilter === 'all' || vehicle.status === statusFilter);
  }), [vehicles, query, statusFilter]);

  async function submitPurchase(event) {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setNotice('');
    try {
      const result = await api('/api/purchase-requests', {
        method: 'POST',
        body: JSON.stringify({ vehicleId: selected.id, ...purchase })
      });
      setNotice(`Request received. Your Tracking ID is ${result.data.trackingId}.`);
      setSelected(null);
      setPurchase({ name: '', email: '', phone: '', notes: '' });
      setPage('track');
      setTrackingId(result.data.trackingId);
      setTracking(result.data);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function lookupTracking(event) {
    event?.preventDefault();
    if (!trackingId.trim()) return;
    try {
      const result = await api(`/api/orders/track/${encodeURIComponent(trackingId.trim())}`);
      setTracking(result.data);
      setNotice('');
    } catch (error) {
      setTracking(null);
      setNotice(error.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => setPage('home')} aria-label="TeslaMarketplace home">
          <span className="brand-mark">TM</span><span>TeslaMarketplace</span>
        </button>
        <nav>
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>Home</button>
          <button className={page === 'inventory' ? 'active' : ''} onClick={() => setPage('inventory')}>Inventory</button>
          <button className={page === 'track' ? 'active' : ''} onClick={() => setPage('track')}>Track Order</button>
        </nav>
        <button className="outline-button" onClick={() => setPage('inventory')}>Browse vehicles</button>
      </header>

      {notice && <div className="notice" role="status">{notice}</div>}

      {page === 'home' && (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">ELECTRIC VEHICLE MARKETPLACE</span>
              <h1>Move electric.<br /><em>Choose yours.</em></h1>
              <p>Explore available electric vehicles, review the details, submit a purchase request, and follow your order with a dedicated tracking ID.</p>
              <div className="hero-actions"><button className="primary-button" onClick={() => setPage('inventory')}>Explore inventory <span>→</span></button><button className="text-button" onClick={() => setPage('track')}>Track an order</button></div>
            </div>
            <div className="hero-visual"><img src={vehicleImage(vehicles[0] || {}, 0)} alt="Electric vehicle" /><div className="hero-badge"><strong>{vehicles.length || '—'}</strong><span>vehicles<br />available</span></div></div>
          </section>
          <section className="feature-strip"><div><strong>Live inventory</strong><span>Availability from the marketplace database</span></div><div><strong>Purchase requests</strong><span>Submit a request against an available vehicle</span></div><div><strong>Order tracking</strong><span>Follow progress using your Tracking ID</span></div></section>
          <section className="featured"><div className="section-top"><div><span className="eyebrow">CURRENT INVENTORY</span><h2>Find your vehicle.</h2></div><button className="text-button" onClick={() => setPage('inventory')}>View all →</button></div><VehicleGrid vehicles={filteredVehicles.slice(0, 3)} onSelect={setSelected} /></section>
        </>
      )}

      {page === 'inventory' && (
        <section className="inventory-page">
          <div className="page-heading"><span className="eyebrow">MARKETPLACE INVENTORY</span><h1>Choose your next vehicle.</h1><p>Browse vehicles currently listed as available or reserved in the marketplace.</p></div>
          <div className="filters"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search model or year" aria-label="Search vehicles" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All status</option><option value="available">Available</option><option value="reserved">Reserved</option></select></div>
          {loading ? <div className="empty">Loading live inventory…</div> : filteredVehicles.length ? <VehicleGrid vehicles={filteredVehicles} onSelect={setSelected} /> : <div className="empty">No vehicles match your search.</div>}
        </section>
      )}

      {page === 'track' && (
        <section className="tracking-page"><div className="page-heading"><span className="eyebrow">ORDER TRACKING</span><h1>Track your order.</h1><p>Enter the Tracking ID provided when your purchase request was received.</p></div><form className="tracking-form" onSubmit={lookupTracking}><input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="TMX-YYYYMMDD-XXXXXXXX" aria-label="Tracking ID" /><button className="primary-button">Track order</button></form>{tracking && <TrackingCard data={tracking} />}</section>
      )}

      {selected && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}><div className="modal" role="dialog" aria-modal="true"><button className="close" onClick={() => setSelected(null)}>×</button><img src={vehicleImage(selected, vehicles.indexOf(selected))} alt={`${selected.year} ${selected.model}`} /><div className="modal-body"><span className="eyebrow">{selected.year} · {selected.status}</span><h2>{selected.model}</h2><div className="vehicle-specs"><span><strong>${Number(selected.price).toLocaleString()}</strong>Price</span><span><strong>{selected.range ?? '—'}</strong>mi range</span></div><p>{selected.metadata?.description || 'Electric vehicle available through TeslaMarketplace.'}</p><h3>Submit purchase request</h3><form onSubmit={submitPurchase} className="purchase-form"><input required value={purchase.name} onChange={(e) => setPurchase({ ...purchase, name: e.target.value })} placeholder="Full name" /><input required type="email" value={purchase.email} onChange={(e) => setPurchase({ ...purchase, email: e.target.value })} placeholder="Email address" /><input value={purchase.phone} onChange={(e) => setPurchase({ ...purchase, phone: e.target.value })} placeholder="Phone (optional)" /><textarea value={purchase.notes} onChange={(e) => setPurchase({ ...purchase, notes: e.target.value })} placeholder="Notes (optional)" rows="3" /><button className="primary-button" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit purchase request'}</button></form></div></div></div>}
    </div>
  );
}

function VehicleGrid({ vehicles, onSelect }) {
  return <div className="vehicle-grid">{vehicles.map((vehicle, index) => <article className="vehicle-card" key={vehicle.id} onClick={() => onSelect(vehicle)}><div className="vehicle-image"><img src={vehicleImage(vehicle, index)} alt={`${vehicle.year} ${vehicle.model}`} loading="lazy" /><span className={`status-pill ${vehicle.status}`}>{vehicle.status}</span></div><div className="vehicle-info"><span>{vehicle.year}</span><h3>{vehicle.model}</h3><div><strong>${Number(vehicle.price).toLocaleString()}</strong><small>{vehicle.range ? `${vehicle.range} mi range` : 'Range on request'}</small></div></div></article>)}</div>;
}

function TrackingCard({ data }) {
  return <div className="tracking-card"><div className="tracking-head"><div><span className="eyebrow">TRACKING ID</span><h2>{data.trackingId}</h2></div><span className="order-status">{data.status}</span></div><div className="timeline">{(data.tracking || []).map((event, index) => <div className="timeline-item" key={`${event.status}-${index}`}><span className="timeline-dot" /><div><strong>{event.status}</strong><p>{event.note}</p><small>{new Date(event.createdAt).toLocaleString()}</small></div></div>)}</div></div>;
}

createRoot(document.getElementById('root')).render(<App />);
