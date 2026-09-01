import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './brand.css';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const fallbackImages = [
  'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1597007066704-67bf2068d5b2?auto=format&fit=crop&w=1600&q=90'
];

async function api(path, options = {}) {
  if (!API) throw new Error('The backend URL is not configured.');
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}
function meta(vehicle, key, fallback = '') { return vehicle.metadata?.[key] || fallback; }
function vehicleImage(vehicle, index) { return vehicle.imageUrl || vehicle.metadata?.imageUrl || fallbackImages[index % fallbackImages.length]; }

function App() {
  const [vehicles, setVehicles] = useState([]), [query, setQuery] = useState(''), [modelFilter, setModelFilter] = useState('all'), [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null), [page, setPage] = useState('home'), [loading, setLoading] = useState(true), [notice, setNotice] = useState('');
  const [trackingId, setTrackingId] = useState(''), [tracking, setTracking] = useState(null);
  const [purchase, setPurchase] = useState({ name: '', email: '', phone: '', notes: '' }), [submitting, setSubmitting] = useState(false);

  useEffect(() => { let active = true; setLoading(true); api('/api/vehicles').then(p => active && setVehicles(p.data || [])).catch(e => active && setNotice(e.message)).finally(() => active && setLoading(false)); return () => { active = false; }; }, []);
  const models = useMemo(() => [...new Set(vehicles.map(v => v.model))].sort(), [vehicles]);
  const filteredVehicles = useMemo(() => vehicles.filter(v => { const hay = `${v.model} ${v.year} ${v.status} ${meta(v,'trim')} ${meta(v,'color')} ${meta(v,'body')}`.toLowerCase(); return hay.includes(query.toLowerCase()) && (modelFilter === 'all' || v.model === modelFilter) && (statusFilter === 'all' || v.status === statusFilter); }), [vehicles, query, modelFilter, statusFilter]);

  async function submitPurchase(e) { e.preventDefault(); if (!selected) return; setSubmitting(true); setNotice(''); try { const r = await api('/api/purchase-requests', { method:'POST', body:JSON.stringify({ vehicleId:selected.id, ...purchase }) }); setNotice(`Request received. Tracking ID: ${r.data.trackingId}`); setTrackingId(r.data.trackingId); setTracking(r.data); setSelected(null); setPurchase({name:'',email:'',phone:'',notes:''}); setPage('track'); } catch(e) { setNotice(e.message); } finally { setSubmitting(false); } }
  async function lookupTracking(e) { e?.preventDefault(); if (!trackingId.trim()) return; try { const r=await api(`/api/orders/track/${encodeURIComponent(trackingId.trim())}`); setTracking(r.data); setNotice(''); } catch(e) { setTracking(null); setNotice(e.message); } }

  return <div className="app-shell">
    <header className="site-header tm-nav"><div className="tm-shell tm-nav-inner">
      <button className="brand tm-brand" onClick={()=>setPage('home')}><span className="brand-mark tm-brand-mark">TM</span><span>TeslaMarketplace</span></button>
      <nav className="tm-nav-links"><button className={page==='home'?'active':''} onClick={()=>setPage('home')}>Home</button><button className={page==='inventory'?'active':''} onClick={()=>setPage('inventory')}>Inventory</button><button className={page==='track'?'active':''} onClick={()=>setPage('track')}>Track Order</button></nav>
      <button className="outline-button tm-btn tm-btn-dark" onClick={()=>setPage('inventory')}>Browse vehicles</button>
    </div></header>
    {notice && <div className="notice" role="status">{notice}</div>}

    {page==='home' && <>
      <section className="hero tm-hero"><div className="tm-hero-inner"><div className="hero-copy"><span className="eyebrow tm-kicker">TESLAMARKETPLACE · 2026 COLLECTION</span><h1>Electric cars.<br/><em>Chosen differently.</em></h1><p>Explore current, pre-owned and previous-generation electric vehicles alongside charging, accessories, parts and lifestyle products.</p><div className="hero-actions tm-actions"><button className="primary-button tm-btn tm-btn-dark" onClick={()=>setPage('inventory')}>Explore inventory <span>→</span></button><button className="text-button" onClick={()=>setPage('track')}>Track an order</button></div><div className="hero-models"><span>{vehicles.length || '—'} listings</span><span>{models.length || '—'} models</span><span>Marketplace</span></div></div><div className="hero-visual tm-media"><img src={vehicleImage(vehicles[0]||{},0)} alt="Featured electric vehicle"/><div className="hero-caption"><span>FEATURED</span><strong>{vehicles[0]?.model || 'Electric vehicle'}</strong><small>{vehicles[0] ? `${vehicles[0].year} · ${meta(vehicles[0],'trim','Available')}` : 'Live inventory'}</small></div></div></div></section>
      <section className="model-showcase tm-section tm-shell"><div className="section-top"><div><span className="eyebrow tm-kicker">BROWSE THE MARKETPLACE</span><h2>Find what fits you.</h2></div><button className="text-button" onClick={()=>setPage('inventory')}>Explore all →</button></div><div className="tm-cats"><button className="tm-cat" onClick={()=>{setPage('inventory');setModelFilter('all')}}><strong>Vehicles</strong><span className="tm-muted">Current & previous models</span></button><button className="tm-cat"><strong>Charging</strong><span className="tm-muted">Home & vehicle charging</span></button><button className="tm-cat"><strong>Accessories</strong><span className="tm-muted">Model-specific & universal</span></button><button className="tm-cat"><strong>Parts</strong><span className="tm-muted">Vehicle parts & equipment</span></button><button className="tm-cat"><strong>Lifestyle</strong><span className="tm-muted">Selected marketplace goods</span></button></div><div className="model-chips">{models.map(m=><button key={m} onClick={()=>{setModelFilter(m);setPage('inventory')}}>{m}</button>)}</div></section>
      <section className="featured tm-section tm-shell"><div className="section-top"><div><span className="eyebrow tm-kicker">FEATURED INVENTORY</span><h2>Find your vehicle.</h2></div><button className="text-button" onClick={()=>setPage('inventory')}>View all →</button></div><VehicleGrid vehicles={filteredVehicles.slice(0,6)} onSelect={setSelected}/></section>
    </>}

    {page==='inventory' && <section className="inventory-page tm-section tm-shell"><div className="page-heading"><span className="eyebrow tm-kicker">MARKETPLACE INVENTORY</span><h1>Choose your next vehicle.</h1><p>Compare models, years, trims, colors, specifications and availability.</p></div><div className="filters"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search model, trim, color or year"/><select value={modelFilter} onChange={e=>setModelFilter(e.target.value)}><option value="all">All models</option>{models.map(m=><option key={m}>{m}</option>)}</select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All status</option><option value="available">Available</option><option value="reserved">Reserved</option></select></div>{loading?<div className="empty">Loading live inventory…</div>:filteredVehicles.length?<VehicleGrid vehicles={filteredVehicles} onSelect={setSelected}/>:<div className="empty">No vehicles match your search.</div>}</section>}

    {page==='track' && <section className="tracking-page tm-section tm-shell"><div className="page-heading"><span className="eyebrow tm-kicker">ORDER TRACKING</span><h1>Track your order.</h1><p>Enter the Tracking ID provided with your purchase request.</p></div><form className="tracking-form" onSubmit={lookupTracking}><input value={trackingId} onChange={e=>setTrackingId(e.target.value)} placeholder="Tracking ID"/><button className="primary-button tm-btn tm-btn-dark">Track order</button></form>{tracking&&<TrackingCard data={tracking}/>}</section>}

    {selected&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setSelected(null)}><div className="modal" role="dialog" aria-modal="true"><button className="close" onClick={()=>setSelected(null)}>×</button><img src={vehicleImage(selected,vehicles.indexOf(selected))} alt={`${selected.year} ${selected.model}`}/><div className="modal-body"><span className="eyebrow tm-kicker">{selected.year} · {meta(selected,'body','ELECTRIC VEHICLE')}</span><h2>{selected.model}</h2><div className="trim-line"><strong>{meta(selected,'trim','Available configuration')}</strong><span>{meta(selected,'color','Color on request')}</span></div><div className="vehicle-specs"><span><strong>${Number(selected.price).toLocaleString()}</strong>Price</span><span><strong>{selected.range??'—'}</strong>mi range</span><span><strong>{meta(selected,'drive','—')}</strong>Drive</span></div><p>{meta(selected,'description','Electric vehicle available through TeslaMarketplace.')}</p><div className="detail-tags"><span>{meta(selected,'body')}</span><span>{meta(selected,'color')}</span><span>{selected.status}</span></div><h3>Submit purchase request</h3><form onSubmit={submitPurchase} className="purchase-form"><input required value={purchase.name} onChange={e=>setPurchase({...purchase,name:e.target.value})} placeholder="Full name"/><input required type="email" value={purchase.email} onChange={e=>setPurchase({...purchase,email:e.target.value})} placeholder="Email address"/><input value={purchase.phone} onChange={e=>setPurchase({...purchase,phone:e.target.value})} placeholder="Phone (optional)"/><textarea value={purchase.notes} onChange={e=>setPurchase({...purchase,notes:e.target.value})} placeholder="Notes (optional)" rows="3"/><button className="primary-button tm-btn tm-btn-dark" disabled={submitting}>{submitting?'Submitting…':'Submit purchase request'}</button></form></div></div></div>}
  </div>;
}

function VehicleGrid({vehicles,onSelect}) { return <div className="vehicle-grid tm-grid tm-grid-products">{vehicles.map((v,i)=><article className="vehicle-card tm-card" key={v.id} onClick={()=>onSelect(v)}><div className="vehicle-image tm-media"><img src={vehicleImage(v,i)} alt={`${v.year} ${v.model}`} loading="lazy"/><span className={`status-pill ${v.status}`}>{v.status}</span><span className="vehicle-color">{meta(v,'color')}</span></div><div className="vehicle-info tm-content"><div className="vehicle-kicker"><span>{v.year}</span><span>{meta(v,'body')}</span></div><h3 className="tm-title">{v.model}</h3><p className="vehicle-trim tm-muted">{meta(v,'trim')} · {meta(v,'drive')}</p><div><strong className="tm-price">${Number(v.price).toLocaleString()}</strong><small>{v.range?` ${v.range} mi range`:' Range on request'}</small></div></div></article>)}</div>; }
function TrackingCard({data}) { return <div className="tracking-card"><div className="tracking-head"><div><span className="eyebrow tm-kicker">TRACKING ID</span><h2>{data.trackingId}</h2></div><span className="order-status">{data.status}</span></div><div className="timeline">{(data.tracking||[]).map((e,i)=><div className="timeline-item" key={`${e.status}-${i}`}><span className="timeline-dot"/><div><strong>{e.status}</strong><p>{e.note}</p><small>{new Date(e.createdAt).toLocaleString()}</small></div></div>)}</div></div>; }

createRoot(document.getElementById('root')).render(<App/>);
