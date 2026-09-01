const express = require('express');
const crypto = require('node:crypto');
const { securityMiddleware } = require('./src/security');
const { query, getClient, isDatabaseConfigured, closeDatabase } = require('./src/db');
const { initializeDatabase } = require('./src/init-db');
const { hashPassword, verifyPassword, signToken, requireAuth, requireAdmin } = require('./src/auth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
securityMiddleware(app);

const allowedOrigins = (process.env.FRONTEND_ORIGIN || process.env.CLIENT_ORIGIN || '').split(',').map((v) => v.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '1mb' }));

const id = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const trackingId = () => `TMX-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const vehicleFromRow = (r) => ({ id:r.id, model:r.model, year:r.year, price:Number(r.price), range:r.range_miles, status:r.status, imageUrl:r.image_url || undefined, metadata:r.metadata || {} });
const orderFromRow = (r, events=[]) => ({ id:r.id, trackingId:r.tracking_id, vehicleId:r.vehicle_id, customer:{name:r.customer_name,email:r.customer_email,phone:r.customer_phone || ''}, total:Number(r.total), status:r.status, notes:r.notes || '', tracking:events.map(e=>({status:e.status,note:e.note || '',createdAt:e.created_at})), createdAt:r.created_at });

async function databaseReady(){ if(!isDatabaseConfigured()) return false; await query('SELECT 1'); return true; }

app.get('/health', async (_req,res)=>{ try { await databaseReady(); res.json({status:'ok',service:'TeslaMarketplace API',database:'connected',timestamp:new Date().toISOString()}); } catch { res.status(503).json({status:'degraded',service:'TeslaMarketplace API',database:'disconnected'}); } });
app.get('/api/health', async (_req,res)=>{ try { await databaseReady(); res.json({status:'ok',service:'TeslaMarketplace API',database:'connected'}); } catch { res.status(503).json({status:'degraded',service:'TeslaMarketplace API',database:'disconnected'}); } });
app.get('/api', (_req,res)=>res.json({name:'TeslaMarketplace API',version:'3.0.0',persistence:'postgresql'}));

app.post('/api/auth/register', async (req,res,next)=>{
  try {
    const {name,email,password,phone=''} = req.body || {};
    if(!name || !email || !password) return res.status(400).json({error:'Name, email and password are required'});
    if(String(password).length < 8) return res.status(400).json({error:'Password must be at least 8 characters'});
    const normalizedEmail=String(email).trim().toLowerCase();
    const passwordHash=await hashPassword(String(password));
    const result=await query(`INSERT INTO users (name,email,phone,password_hash) VALUES ($1,$2,$3,$4) RETURNING id,name,email,phone,role,created_at`,[String(name).trim(),normalizedEmail,phone,passwordHash]);
    const user=result.rows[0];
    const token=signToken({userId:user.id,role:user.role});
    res.status(201).json({data:{user,token}});
  } catch(error){ if(error.code==='23505') return res.status(409).json({error:'An account with that email already exists'}); next(error); }
});

app.post('/api/auth/login', async (req,res,next)=>{
  try {
    const {email,password}=req.body || {};
    if(!email || !password) return res.status(400).json({error:'Email and password are required'});
    const {rows}=await query(`SELECT id,name,email,phone,role,password_hash FROM users WHERE email=$1`,[String(email).trim().toLowerCase()]);
    if(!rows[0] || !(await verifyPassword(String(password),rows[0].password_hash))) return res.status(401).json({error:'Invalid email or password'});
    const user=rows[0]; delete user.password_hash;
    res.json({data:{user,token:signToken({userId:user.id,role:user.role})}});
  } catch(error){ next(error); }
});

app.get('/api/me', requireAuth, async (req,res,next)=>{
  try { const {rows}=await query(`SELECT id,name,email,phone,role,created_at FROM users WHERE id=$1`,[req.user.userId]); if(!rows[0]) return res.status(404).json({error:'User not found'}); res.json({data:rows[0]}); } catch(error){ next(error); }
});

app.get('/api/vehicles', async (_req,res,next)=>{ try { const {rows}=await query(`SELECT id,model,year,price,range_miles,status,image_url,metadata FROM vehicles WHERE status <> 'draft' ORDER BY created_at,id`); res.json({data:rows.map(vehicleFromRow)}); } catch(error){ next(error); } });
app.get('/api/vehicles/:id', async (req,res,next)=>{ try { const {rows}=await query(`SELECT id,model,year,price,range_miles,status,image_url,metadata FROM vehicles WHERE id=$1`,[req.params.id]); if(!rows[0]) return res.status(404).json({error:'Vehicle not found'}); res.json({data:vehicleFromRow(rows[0])}); } catch(error){ next(error); } });

app.post('/api/purchase-requests', async (req,res,next)=>{
  const client=await getClient();
  try {
    const {vehicleId,name,email,phone='',notes=''}=req.body || {};
    if(!vehicleId || !name || !email) return res.status(400).json({error:'Vehicle ID, name and email are required'});
    if(!client) return res.status(503).json({error:'Database unavailable'});
    await client.query('BEGIN');
    const vr=await client.query(`SELECT id,price,status FROM vehicles WHERE id=$1 FOR UPDATE`,[vehicleId]);
    const vehicle=vr.rows[0];
    if(!vehicle){await client.query('ROLLBACK');return res.status(404).json({error:'Vehicle not found'});}
    if(vehicle.status!=='available'){await client.query('ROLLBACK');return res.status(409).json({error:'Vehicle is not currently available'});}
    const emailNormalized=String(email).trim().toLowerCase();
    const existing=await client.query(`SELECT id FROM users WHERE email=$1`,[emailNormalized]);
    let userId=existing.rows[0]?.id;
    if(!userId){ const u=await client.query(`INSERT INTO users (name,email,phone) VALUES ($1,$2,$3) RETURNING id`,[String(name).trim(),emailNormalized,phone]); userId=u.rows[0].id; }
    const oid=id('TM'), tid=trackingId();
    const order=await client.query(`INSERT INTO orders (id,tracking_id,vehicle_id,user_id,customer_name,customer_email,customer_phone,total,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'received',$9) RETURNING id,tracking_id,vehicle_id,customer_name,customer_email,customer_phone,total,status,notes,created_at`,[oid,tid,vehicleId,userId,name,emailNormalized,phone,vehicle.price,notes]);
    await client.query(`UPDATE vehicles SET status='reserved',updated_at=NOW() WHERE id=$1`,[vehicleId]);
    await client.query(`INSERT INTO tracking_events (order_id,status,note) VALUES ($1,$2,$3)`,[oid,'Order Received','Purchase request received by TeslaMarketplace.']);
    await client.query(`INSERT INTO consignments (id,order_id,status) VALUES ($1,$2,'pending')`,[id('CON'),oid]);
    await client.query('COMMIT');
    res.status(201).json({data:orderFromRow(order.rows[0],[{status:'Order Received',note:'Purchase request received by TeslaMarketplace.',created_at:new Date().toISOString()}])});
  } catch(error){ if(client){try{await client.query('ROLLBACK')}catch{}} next(error); } finally { if(client) client.release(); }
});

app.get('/api/orders/track/:trackingId',async(req,res,next)=>{try{const {rows}=await query(`SELECT id,tracking_id,vehicle_id,total,status FROM orders WHERE tracking_id=$1`,[req.params.trackingId]);if(!rows[0])return res.status(404).json({error:'Tracking ID not found'});const events=await query(`SELECT status,note,created_at FROM tracking_events WHERE order_id=$1 ORDER BY created_at`,[rows[0].id]);res.json({data:{trackingId:rows[0].tracking_id,status:rows[0].status,vehicleId:rows[0].vehicle_id,total:Number(rows[0].total),tracking:events.rows.map(e=>({status:e.status,note:e.note || '',createdAt:e.created_at}))}})}catch(error){next(error)}});

app.get('/api/orders',requireAuth,async(req,res,next)=>{try{const {rows}=await query(`SELECT id,tracking_id,vehicle_id,customer_name,customer_email,customer_phone,total,status,notes,created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC`,[req.user.userId]);res.json({data:rows.map(r=>orderFromRow(r))})}catch(error){next(error)}});
app.get('/api/orders/:id',requireAuth,async(req,res,next)=>{try{const {rows}=await query(`SELECT id,tracking_id,vehicle_id,customer_name,customer_email,customer_phone,total,status,notes,created_at FROM orders WHERE id=$1 AND user_id=$2`,[req.params.id,req.user.userId]);if(!rows[0])return res.status(404).json({error:'Order not found'});const events=await query(`SELECT status,note,created_at FROM tracking_events WHERE order_id=$1 ORDER BY created_at`,[req.params.id]);res.json({data:orderFromRow(rows[0],events.rows)})}catch(error){next(error)}});

app.post('/api/consignment-requests',async(req,res,next)=>{try{const {name,email,vehicleDescription}=req.body||{};if(!name||!email||!vehicleDescription)return res.status(400).json({error:'Name, email and vehicle description are required'});const request=await query(`INSERT INTO consignment_requests (id,name,email,vehicle_description) VALUES ($1,$2,$3,$4) RETURNING id,name,email,vehicle_description,status,created_at`,[id('CONREQ'),name,email,vehicleDescription]);res.status(201).json({data:request.rows[0]})}catch(error){next(error)}});

app.get('/api/admin/orders',requireAuth,requireAdmin,async(_req,res,next)=>{try{const {rows}=await query(`SELECT id,tracking_id,vehicle_id,customer_name,customer_email,customer_phone,total,status,notes,created_at FROM orders ORDER BY created_at DESC`);res.json({data:rows.map(r=>orderFromRow(r))})}catch(error){next(error)}});
app.get('/api/admin/vehicles',requireAuth,requireAdmin,async(_req,res,next)=>{try{const {rows}=await query(`SELECT id,model,year,price,range_miles,status,image_url,metadata,created_at,updated_at FROM vehicles ORDER BY created_at DESC`);res.json({data:rows.map(vehicleFromRow)})}catch(error){next(error)}});
app.post('/api/admin/vehicles',requireAuth,requireAdmin,async(req,res,next)=>{try{const {id:vehicleId,model,year,price,range_miles,image_url,description,metadata={}}=req.body||{};if(!vehicleId||!model||!year||price===undefined)return res.status(400).json({error:'id, model, year and price are required'});const result=await query(`INSERT INTO vehicles (id,model,year,price,range_miles,status,image_url,metadata) VALUES ($1,$2,$3,$4,$5,'available',$6,$7) RETURNING id,model,year,price,range_miles,status,image_url,metadata`,[vehicleId,model,year,price,range_miles || null,image_url || null,{...metadata,description:description || ''}]);res.status(201).json({data:vehicleFromRow(result.rows[0])})}catch(error){if(error.code==='23505')return res.status(409).json({error:'Vehicle ID already exists'});next(error)}});

app.use((_req,res)=>res.status(404).json({error:'API route not found'}));
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'Internal server error'});});

async function start(){if(!isDatabaseConfigured())throw new Error('DATABASE_URL is required in production');await initializeDatabase();await databaseReady();const server=app.listen(PORT,'0.0.0.0',()=>console.log(`TeslaMarketplace API listening on port ${PORT}`));const shutdown=async()=>server.close(async()=>{await closeDatabase();process.exit(0)});process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown)}
if(require.main===module)start().catch(error=>{console.error('Failed to start TeslaMarketplace API:',error);process.exit(1)});
module.exports=app;
