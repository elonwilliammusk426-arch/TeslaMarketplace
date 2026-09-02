import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './brand.css';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1597007066704-67bf2068d5b2?auto=format&fit=crop&w=1600&q=90'
];
const meta = (v, key, fallback = '') => v?.metadata?.[key] ?? fallback;
const image = (v, i = 0) => v?.imageUrl || v?.metadata?.imageUrl || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [page, setPage] = useState('home');
  const [query, setQuery] = useState('');
  const [model, setModel] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [gallery, setGallery] = useState(0);
  const [notice, setNotice] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [tracking, setTracking] = useState(null);
  const [orders, setOrders] = useState([]);
  const [purchase, setPurchase] = useState({ name: '', email: '', phone: '', notes: '' });
  const [consignment, setConsignment] = useState({ name: '', email: '', vehicleDescription: '' });
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState({ name: '', email: '', password: '' });
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');

  const loadVehicles = async () => {
    try {
      const result = await api('/api/vehicles');
      setVehicles(result.data || []);
      setNotice('');
    } catch (error) { setNotice(error.message); }
  };

  useEffect(() => {
    loadVehicles();
    const token = localStorage.getItem('tm_token');
    if (token) api('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem('tm_token'));
  }, []);

  const models = useMemo(() => [...new Set(vehicles.map((v) => v.model))].sort(), [vehicles]);
  const filtered = useMemo(() => vehicles.filter((v) => {
    const text = `${v.model} ${v.year} ${v.status} ${meta(v, 'trim')} ${meta(v, 'color')} ${meta(v, 'body')}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (model === 'all' || v.model === model) && (status === 'all' || v.status === status);
  }), [vehicles, query, model, status]);
  const navigate = (next) => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  async function auth(event) {
    event.preventDefault(); setBusy(true);
    try {
      const path = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const result = await api(path, { method: 'POST', body: JSON.stringify(account) });
      localStorage.setItem('tm_token', result.data.token); setUser(result.data.user);
      setAccount({ name: '', email: '', password: '' }); setNotice('Welcome to TeslaMarketplace.'); navigate('account');
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }

  async function submitPurchase(event) {
    event.preventDefault(); if (!selected) return; setBusy(true);
    try {
      const result = await api('/api/purchase-requests', { method: 'POST', body: JSON.stringify({ vehicleId: selected.id, ...purchase }) });
      setTrackingId(result.data.trackingId); setTracking(result.data); setSelected(null);
      setPurchase({ name: '', email: '', phone: '', notes: '' }); setNotice(`Request received — ${result.data.trackingId}`); navigate('track'); await loadVehicles();
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }

  async function track(event) {
    event.preventDefault(); setBusy(true);
    try { const result = await api(`/api/orders/track/${encodeURIComponent(trackingId.trim())}`); setTracking(result.data); setNotice(''); }
    catch (error) { setTracking(null); setNotice(error.message); } finally { setBusy(false); }
  }

  async function submitConsignment(event) {
    event.preventDefault(); setBusy(true);
    try {
      await api('/api/consignment-requests', { method: 'POST', body: JSON.stringify(consignment) });
      setConsignment({ name: '', email: '', vehicleDescription: '' }); setNotice('Consignment request submitted for review.');
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }

  async function loadOrders() {
    const token = localStorage.getItem('tm_token'); if (!token) return;
    try { const result = await api('/api/orders', { headers: { Authorization: `Bearer ${token}` } }); setOrders(result.data || []); }
    catch (error) { setNotice(error.message); }
  }
  function signOut() { localStorage.removeItem('tm_token'); setUser(null); setOrders([]); navigate('home'); }
  const openVehicle = (vehicle) => { setSelected(vehicle); setGallery(0); };

  return <div className="app-shell">
    <Header page={page} navigate={navigate} user={user} />
    {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}
    {page === 'home' && <Home vehicles={vehicles} models={models} navigate={navigate} openVehicle={openVehicle} />}
    {page === 'inventory' && <Inventory vehicles={filtered} models={models} query={query} setQuery={setQuery} model={model} setModel={setModel} status={status} setStatus={setStatus} openVehicle={openVehicle} />}
    {page === 'charging' && <CategoryPage title="Charging" kicker="CHARGING" intro="Home and mobile charging equipment for electric driving." items={['Home charging equipment', 'Mobile charging', 'Adapters and cables', 'Charging accessories']} />}
    {page === 'accessories' && <CategoryPage title="Accessories" kicker="ACCESSORIES" intro="Model-specific and universal equipment for daily driving, travel and protection." items={['Interior protection', 'Cargo and travel', 'Wheels and exterior', 'Technology and utility']} />}
    {page === 'parts' && <CategoryPage title="Parts & equipment" kicker="PARTS" intro="Components, service equipment and replacement items." items={['Replacement components', 'Service equipment', 'Body and exterior parts', 'Interior components']} />}
    {page === 'lifestyle' && <CategoryPage title="Lifestyle" kicker="LIFESTYLE" intro="Selected marketplace goods beyond the vehicle itself. Apparel is intentionally excluded." items={['Desk and home goods', 'Travel equipment', 'Vehicle-care goods', 'Limited marketplace items']} />}
    {page === 'consign' && <ConsignmentForm data={consignment} setData={setConsignment} submit={submitConsignment} busy={busy} />}
    {page === 'track' && <TrackingPage trackingId={trackingId} setTrackingId={setTrackingId} tracking={tracking} submit={track} busy={busy} />}
    {page === 'account' && <AccountPage user={user} orders={orders} loadOrders={loadOrders} account={account} setAccount={setAccount} authMode={authMode} setAuthMode={setAuthMode} auth={auth} busy={busy} signOut={signOut} navigate={navigate} />}
    <Footer navigate={navigate} />
    {selected && <VehicleModal vehicle={selected} gallery={gallery} setGallery={setGallery} onClose={() => setSelected(null)} purchase={purchase} setPurchase={setPurchase} submit={submitPurchase} busy={busy} />}
  </div>;
}

function Header({ page, navigate, user }) {
  return <header className="site-header tm-nav"><div className="tm-shell tm-nav-inner">
    <button className="brand tm-brand" onClick={() => navigate('home')}><span className="brand-mark tm-brand-mark">TM</span><span>TeslaMarketplace</span></button>
    <nav className="tm-nav-links" aria-label="Main navigation">
      <button className={page === 'home' ? 'active' : ''} onClick={() => navigate('home')}>Home</button>
      <button className={page === 'inventory' ? 'active' : ''} onClick={() => navigate('inventory')}>Vehicles</button>
      <button className={page === 'charging' ? 'active' : ''} onClick={() => navigate('charging')}>Charging</button>
      <button className={page === 'accessories' ? 'active' : ''} onClick={() => navigate('accessories')}>Accessories</button>
      <button className={page === 'parts' ? 'active' : ''} onClick={() => navigate('parts')}>Parts</button>
      <button className={page === 'consign' ? 'active' : ''} onClick={() => navigate('consign')}>Sell / Consign</button>
    </nav>
    <div className="nav-account"><button className="outline-button tm-btn" onClick={() => navigate('account')}>{user ? 'Account' : 'Sign in'}</button><button className="outline-button tm-btn tm-btn-dark" onClick={() => navigate('inventory')}>Browse</button></div>
  </div></header>;
}

function Home({ vehicles, models, navigate, openVehicle }) {
  return <>
    <section className="hero tm-hero"><div className="tm-hero-inner home-layout"><div className="hero-copy"><span className="eyebrow tm-kicker">TESLAMARKETPLACE · 2026 COLLECTION</span><h1>Electric cars.<br /><em>Chosen differently.</em></h1><p>Shop current, pre-owned and previous-generation vehicles, then explore charging, accessories, parts and selected marketplace goods.</p><div className="hero-actions tm-actions"><button className="primary-button tm-btn tm-btn-dark" onClick={() => navigate('inventory')}>Explore inventory →</button><button className="text-button" onClick={() => navigate('track')}>Track an order</button></div><div className="hero-models"><span>{vehicles.length} listings</span><span>{models.length} models</span><span>Live marketplace</span></div></div><div className="hero-visual tm-media"><img src={image(vehicles[0])} alt="Featured electric vehicle" /><div className="hero-caption"><span>FEATURED INVENTORY</span><strong>{vehicles[0]?.model || 'Electric vehicle'}</strong><small>{vehicles[0] ? `${vehicles[0].year} · ${meta(vehicles[0, 'trim', 'Available'])}` : 'Browse the marketplace'}</small></div></div></div></section>
    <section className="tm-section tm-shell"><div className="section-top"><div><span className="eyebrow tm-kicker">MARKETPLACE</span><h2>Everything in one place.</h2></div></div><div className="feature-panels"><Feature title="Vehicles" text="Current and previous generations, trims, colors and configurations." action={() => navigate('inventory')} /><Feature title="Charging" text="Home and mobile charging equipment." action={() => navigate('charging')} /><Feature title="Accessories" text="Model-specific and universal equipment." action={() => navigate('accessories')} /><Feature title="Parts" text="Components and service equipment." action={() => navigate('parts')} /><Feature title="Sell / Consign" text="Submit your vehicle for marketplace review." action={() => navigate('consign')} /></div></section>
    <section className="tm-section tm-shell"><div className="section-top"><div><span className="eyebrow tm-kicker">VEHICLES</span><h2>Explore the lineup.</h2></div><button className="text-button" onClick={() => navigate('inventory')}>View all →</button></div><VehicleGrid vehicles={vehicles.slice(0, 6)} onSelect={openVehicle} /></section>
    <section className="tm-section tm-shell split-banner"><div><span className="eyebrow tm-kicker">OWNERSHIP</span><h2>Find it. Request it. Track it.</h2><p>Browsing, purchase requests, accounts and order tracking are connected into one marketplace flow.</p></div><button className="primary-button tm-btn tm-btn-dark" onClick={() => navigate('track')}>Track an order →</button></section>
  </>;
}
function Feature({ title, text, action }) { return <button className="feature-panel" onClick={action}><span>{title}</span><strong>{text}</strong><small>Explore →</small></button>; }

function Inventory({ vehicles, models, query, setQuery, model, setModel, status, setStatus, openVehicle }) {
  return <section className="inventory-page tm-section tm-shell"><div className="page-heading"><span className="eyebrow tm-kicker">MARKETPLACE INVENTORY</span><h1>Choose your next vehicle.</h1><p>Search across model, year, trim, color and availability.</p></div><div className="filters"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search model, trim, color or year" /><select value={model} onChange={(e) => setModel(e.target.value)}><option value="all">All models</option>{models.map((m) => <option key={m} value={m}>{m}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All status</option><option value="available">Available</option><option value="reserved">Reserved</option></select></div>{vehicles.length ? <VehicleGrid vehicles={vehicles} onSelect={openVehicle} /> : <div className="empty">No vehicles match your search.</div>}</section>;
}
function VehicleGrid({ vehicles, onSelect }) { return <div className="vehicle-grid tm-grid tm-grid-products">{vehicles.map((v, i) => <article className="vehicle-card tm-card" key={v.id} onClick={() => onSelect(v)} tabIndex="0" onKeyDown={(e) => e.key === 'Enter' && onSelect(v)}><div className="vehicle-image tm-media"><img src={image(v, i)} alt={`${v.year} ${v.model}`} loading="lazy" /><span className={`status-pill ${v.status}`}>{v.status}</span><span className="vehicle-color">{meta(v, 'color', 'Color on request')}</span></div><div className="vehicle-info tm-content"><div className="vehicle-kicker"><span>{v.year}</span><span>{meta(v, 'body')}</span></div><h3 className="tm-title">{v.model}</h3><p className="vehicle-trim tm-muted">{meta(v, 'trim')} · {meta(v, 'drive')}</p><div><strong className="tm-price">${Number(v.price).toLocaleString()}</strong><small>{v.range ? ` ${v.range} mi range` : ''}</small></div></div></article>)}</div>; }

function VehicleModal({ vehicle: v, gallery, setGallery, onClose, purchase, setPurchase, submit, busy }) {
  const images = [image(v, 0), image(v, 1), image(v, 2), image(v, 3)];
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal vehicle-modal"><button className="close" onClick={onClose} aria-label="Close">×</button><div className="detail-gallery"><div className="gallery-main"><img key={gallery} src={images[gallery]} alt={`${v.model} view ${gallery + 1}`} /><button className="gallery-arrow left" onClick={() => setGallery((gallery + 3) % 4)}>‹</button><button className="gallery-arrow right" onClick={() => setGallery((gallery + 1) % 4)}>›</button></div><div className="gallery-thumbs">{images.map((src, i) => <button type="button" className={gallery === i ? 'active' : ''} key={i} onClick={() => setGallery(i)}><img src={src} alt={`${v.model} thumbnail ${i + 1}`} /></button>)}</div></div><div className="modal-body"><span className="eyebrow tm-kicker">{v.year} · {meta(v, 'body', 'ELECTRIC VEHICLE')}</span><h2>{v.model}</h2><div className="trim-line"><strong>{meta(v, 'trim', 'Available configuration')}</strong><span>{meta(v, 'color', 'Color on request')}</span></div><div className="vehicle-specs"><span><strong>${Number(v.price).toLocaleString()}</strong>Price</span><span><strong>{v.range ?? '—'}</strong>mi range</span><span><strong>{meta(v, 'drive', '—')}</strong>Drive</span></div><p>{meta(v, 'description', 'Electric vehicle available through TeslaMarketplace.')}</p><div className="detail-tags"><span>{meta(v, 'body')}</span><span>{meta(v, 'color')}</span><span>{v.status}</span></div><h3>Submit purchase request</h3><form onSubmit={submit} className="purchase-form"><input required value={purchase.name} onChange={(e) => setPurchase({ ...purchase, name: e.target.value })} placeholder="Full name" /><input required type="email" value={purchase.email} onChange={(e) => setPurchase({ ...purchase, email: e.target.value })} placeholder="Email address" /><input value={purchase.phone} onChange={(e) => setPurchase({ ...purchase, phone: e.target.value })} placeholder="Phone (optional)" /><textarea value={purchase.notes} onChange={(e) => setPurchase({ ...purchase, notes: e.target.value })} placeholder="Notes (optional)" rows="3" /><button className="primary-button tm-btn tm-btn-dark" disabled={busy}>{busy ? 'Submitting…' : 'Submit purchase request'}</button></form></div></div></div>;
}

function CategoryPage({ title, kicker, intro, items }) { return <section className="tm-section tm-shell category-page"><div className="page-heading"><span className="eyebrow tm-kicker">{kicker}</span><h1>{title}.</h1><p>{intro}</p></div><div className="category-grid">{items.map((item, i) => <div className="category-card" key={item}><span>0{i + 1}</span><h3>{item}</h3><p>Catalog area ready for inventory, pricing, specifications and availability.</p><button className="text-button">Explore →</button></div>)}</div></section>; }
function ConsignmentForm({ data, setData, submit, busy }) { return <section className="tm-section tm-shell"><div className="page-heading"><span className="eyebrow tm-kicker">SELL / CONSIGN</span><h1>Put your vehicle on the marketplace.</h1><p>Send the vehicle details for review. This creates a persistent consignment request.</p></div><form className="wide-form" onSubmit={submit}><input required placeholder="Full name" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} /><input required type="email" placeholder="Email address" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} /><textarea required minLength="10" rows="7" placeholder="Model, year, mileage, condition, location, options and other details" value={data.vehicleDescription} onChange={(e) => setData({ ...data, vehicleDescription: e.target.value })} /><button className="primary-button tm-btn tm-btn-dark" disabled={busy}>{busy ? 'Submitting…' : 'Submit consignment request'}</button></form></section>; }
function TrackingPage({ trackingId, setTrackingId, tracking, submit, busy }) { return <section className="tracking-page tm-section tm-shell"><div className="page-heading"><span className="eyebrow tm-kicker">ORDER TRACKING</span><h1>Track your order.</h1><p>Enter the Tracking ID from your purchase request.</p></div><form className="tracking-form" onSubmit={submit}><input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="TMX-YYYYMMDD-XXXXXXXX" required /><button className="primary-button tm-btn tm-btn-dark" disabled={busy}>{busy ? 'Checking…' : 'Track order'}</button></form>{tracking && <div className="tracking-card"><div className="tracking-head"><div><span className="eyebrow tm-kicker">TRACKING ID</span><h2>{tracking.trackingId}</h2></div><span className="order-status">{tracking.status}</span></div><div className="timeline">{(tracking.tracking || []).map((event, i) => <div className="timeline-item" key={`${event.createdAt}-${i}`}><span className="timeline-dot" /><div><strong>{event.status}</strong><p>{event.note}</p><small>{new Date(event.createdAt).toLocaleString()}</small></div></div>)}</div></div>}</section>; }

function AccountPage({ user, orders, loadOrders, account, setAccount, authMode, setAuthMode, auth, busy, signOut, navigate }) {
  useEffect(() => { if (user) loadOrders(); }, [user]);
  if (!user) return <section className="tm-section tm-shell account-page"><div className="auth-layout"><div className="account-intro"><span className="eyebrow tm-kicker">TESLAMARKETPLACE ACCOUNT</span><h1>{authMode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1><p>Sign in to view orders and keep marketplace activity in one place.</p></div><div className="tracking-card auth-card"><form className="purchase-form" onSubmit={auth}>{authMode === 'register' && <input required minLength="2" placeholder="Full name" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} />}<input required type="email" placeholder="Email address" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} /><input required minLength="8" type="password" placeholder="Password (8+ characters)" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} /><button className="primary-button tm-btn tm-btn-dark" disabled={busy}>{busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}</button></form><button className="text-button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Create an account →' : 'Already registered? Sign in →'}</button></div></div></section>;
  return <section className="tm-section tm-shell account-page"><div className="page-heading"><span className="eyebrow tm-kicker">ACCOUNT</span><h1>{user.name || user.email}.</h1><p>{user.email} · {user.role}</p></div><div className="account-grid"><div className="tracking-card"><span className="eyebrow tm-kicker">YOUR ORDERS</span>{orders.length ? orders.map((order) => <div className="order-row" key={order.id}><strong>{order.trackingId}</strong><span>{order.status}</span><button className="text-button" onClick={() => { setTrackingIdGlobal(order.trackingId); navigate('track'); }}>Track →</button></div>) : <p className="tm-muted">No orders yet. Browse inventory to start a purchase request.</p>}<button className="primary-button tm-btn tm-btn-dark" onClick={() => navigate('inventory')}>Browse inventory</button></div><div className="tracking-card"><span className="eyebrow tm-kicker">ACCOUNT ACCESS</span><h3>Customer account</h3><p className="tm-muted">Your customer account is separate from the protected owner/admin area.</p><button className="outline-button" onClick={signOut}>Sign out</button></div></div></section>;
}
function setTrackingIdGlobal() {}
function Footer({ navigate }) { return <footer className="tm-footer"><div className="tm-shell footer-grid"><div><strong>TeslaMarketplace</strong><p>Independent vehicle marketplace experience.</p></div><div><span>Shop</span><button onClick={() => navigate('inventory')}>Vehicles</button><button onClick={() => navigate('charging')}>Charging</button><button onClick={() => navigate('accessories')}>Accessories</button></div><div><span>Marketplace</span><button onClick={() => navigate('parts')}>Parts</button><button onClick={() => navigate('lifestyle')}>Lifestyle</button><button onClick={() => navigate('consign')}>Sell / Consign</button></div><div><span>Support</span><button onClick={() => navigate('track')}>Track order</button><button onClick={() => navigate('account')}>Account</button></div></div></footer>; }

createRoot(document.getElementById('root')).render(<App />);
