import React,{useEffect,useState} from 'react';
import {useAuth} from './AuthContext';
import ProtectedRoute from './ProtectedRoute';

const API=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
const money=v=>`$${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;

async function request(path,token,options={}){
  const r=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(options.headers||{})}});
  const p=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(p.error||`Request failed (${r.status})`);
  return p;
}

function InventoryDashboard({nav}){
 const {token,role}=useAuth();
 const canWrite=role==='admin'||role==='manager';
 const canDelete=role==='admin';
 const [items,setItems]=useState([]);const [zip,setZip]=useState('');const [search,setSearch]=useState('');const [status,setStatus]=useState('all');const [model,setModel]=useState('all');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const [form,setForm]=useState({vin:'',model:'Model Y',trim:'Long Range AWD',exteriorColor:'Pearl White Multi-Coat',interiorColor:'All Black',wheels:'18-inch Photon Wheels',price:'',zipCode:''});
 async function load(){setError('');try{const q=new URLSearchParams();if(zip)q.set('zip',zip);if(search)q.set('search',search);if(status!=='all')q.set('status',status);if(model!=='all')q.set('model',model);const r=await request(`/api/admin/inventory?${q}`,token);setItems(r.data||[]);}catch(e){setError(e.message)}}
 useEffect(()=>{if(token){const t=setTimeout(load,250);return()=>clearTimeout(t)}},[token,zip,search,status,model]);
 const change=e=>setForm(v=>({...v,[e.target.name]:e.target.value}));
 async function add(e){e.preventDefault();setBusy(true);setError('');try{await request('/api/admin/inventory',token,{method:'POST',body:JSON.stringify(form)});setForm(v=>({...v,vin:'',price:''}));await load()}catch(e2){setError(e2.message)}finally{setBusy(false)}}
 async function update(id,next){try{await request(`/api/admin/inventory/${id}/status`,token,{method:'PATCH',body:JSON.stringify({status:next})});await load()}catch(e){setError(e.message)}}
 async function remove(id){if(!window.confirm('Remove this VIN from inventory?'))return;try{await request(`/api/admin/inventory/${id}`,token,{method:'DELETE'});await load()}catch(e){setError(e.message)}}
 return <section className="section admin-dashboard"><div className="heading"><span className="eyebrow">{role?.toUpperCase()} · FLEET</span><h1>VIN inventory.</h1><p>Live VIN-level stock, regional ZIP availability and inventory status from PostgreSQL.</p></div>
  {canWrite&&<form className="account-card" onSubmit={add}><h2>Add vehicle to stock</h2><div className="form-grid">{[['vin','VIN'],['model','Model'],['trim','Trim'],['price','Price'],['zipCode','ZIP code'],['exteriorColor','Exterior color'],['interiorColor','Interior color'],['wheels','Wheels']].map(([name,label])=><label key={name}>{label}<input name={name} value={form[name]} onChange={change} required type={name==='price'?'number':'text'} min={name==='price'?'0':undefined}/></label>)}</div><button className="primary" disabled={busy}>{busy?'Adding…':'Add vehicle to stock →'}</button></form>}
  <div className="filters"><input placeholder="ZIP code" value={zip} onChange={e=>setZip(e.target.value)}/><input placeholder="Search VIN, model or trim" value={search} onChange={e=>setSearch(e.target.value)}/><select value={model} onChange={e=>setModel(e.target.value)}><option value="all">All models</option><option>Model 3</option><option>Model Y</option><option>Model S</option><option>Model X</option></select><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select></div>
  {error&&<p className="error">{error}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>VIN</th><th>Vehicle</th><th>Location</th><th>Price</th><th>Specification</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><b>{item.vin}</b></td><td>{item.model}<br/><small>{item.trim}</small></td><td>{item.zipCode}</td><td>{money(item.price)}</td><td>{item.exteriorColor}<br/><small>{item.interiorColor} · {item.wheels}</small></td><td><span className={`inventory-status ${item.status}`}>{item.status}</span></td><td>{canWrite&&<select value={item.status} onChange={e=>update(item.id,e.target.value)}><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select>}{canDelete&&<button className="text danger" onClick={()=>remove(item.id)}>Remove</button>}{!canWrite&&!canDelete&&<span className="muted">Read only</span>}</td></tr>)}</tbody></table>{!items.length&&<div className="empty">No VIN inventory matches these filters.</div>}</div><button className="secondary" onClick={()=>nav('account')}>← Back to account</button>
 </section>;
}

export default function AdminInventoryDashboard(props){
 return <ProtectedRoute roles={['admin','manager','viewer']}><InventoryDashboard {...props}/></ProtectedRoute>;
}
