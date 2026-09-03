const {query}=require('./db');

const BASE_URL=(process.env.MARKETCHECK_BASE_URL||'https://api.marketcheck.com/v2').replace(/\/$/,'');
const API_KEY=process.env.MARKETCHECK_API_KEY;

function requireConfig(){
  if(!API_KEY)throw new Error('MARKETCHECK_API_KEY is not configured');
}

function first(...values){return values.find(value=>value!==undefined&&value!==null&&String(value).trim()!=='')||null}

function normalizeListing(listing){
  const vin=first(listing.vin,listing.VIN);
  const make=first(listing.make,listing.make_name);
  if(!vin||String(make).toLowerCase()!=='tesla')return null;
  const model=first(listing.model,listing.model_name);
  const trim=first(listing.trim,listing.trim_name)||'Inventory';
  const price=Number(first(listing.price,listing.dealer_price,listing.msrp)||0);
  if(!model||!Number.isFinite(price)||price<=0)return null;
  const dealer=listing.dealer||listing.dealer_info||{};
  const zip=first(listing.dealer_zip,listing.zip,listing.zip_code,dealer.zip,dealer.zip_code)||'';
  const exterior=first(listing.exterior_color,listing.base_ext_color,listing.ext_color)||'Unknown';
  const interior=first(listing.interior_color,listing.int_color)||'Unknown';
  const wheels=first(listing.wheels,listing.wheel_type)||'Standard';
  const photos=Array.isArray(listing.media?.photo_links)?listing.media.photo_links:Array.isArray(listing.photo_links)?listing.photo_links:[];
  return {vin:String(vin).trim().toUpperCase(),model,trim,price,zipCode:String(zip),exteriorColor:exterior,interiorColor:interior,wheels,listingId:first(listing.id,listing.listing_id),source:first(listing.source,listing.data_source)||'marketcheck',photos,raw:listing};
}

async function fetchPage({start=0,rows=100,model}={}){
  requireConfig();
  const params=new URLSearchParams({api_key:API_KEY,make:'Tesla',start:String(start),rows:String(rows)});
  if(model)params.set('model',model);
  const response=await fetch(`${BASE_URL}/search/car/active?${params.toString()}`,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`MarketCheck request failed (${response.status})`);
  return response.json();
}

async function ensureMarketCheckColumns(){
  await query(`
    ALTER TABLE inventory_vins ADD COLUMN IF NOT EXISTS source VARCHAR(80);
    ALTER TABLE inventory_vins ADD COLUMN IF NOT EXISTS source_listing_id VARCHAR(160);
    ALTER TABLE inventory_vins ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
    ALTER TABLE inventory_vins ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE inventory_vins ADD COLUMN IF NOT EXISTS source_payload JSONB NOT NULL DEFAULT '{}'::jsonb;
    CREATE UNIQUE INDEX IF NOT EXISTS inventory_vins_source_listing_idx ON inventory_vins(source,source_listing_id) WHERE source_listing_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS inventory_vins_last_seen_idx ON inventory_vins(last_seen_at);
  `);
}

async function upsertListing(listing){
  const normalized=normalizeListing(listing);
  if(!normalized)return false;
  await query(`
    INSERT INTO inventory_vins
      (vin,vehicle_id,model_name,trim,exterior_color,interior_color,wheels,price,zip_code,status,source,source_listing_id,last_seen_at,photos,source_payload,updated_at)
    VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,'available',$9,$10,NOW(),$11,$12,NOW())
    ON CONFLICT (vin) DO UPDATE SET
      model_name=EXCLUDED.model_name,
      trim=EXCLUDED.trim,
      exterior_color=EXCLUDED.exterior_color,
      interior_color=EXCLUDED.interior_color,
      wheels=EXCLUDED.wheels,
      price=EXCLUDED.price,
      zip_code=EXCLUDED.zip_code,
      status=CASE WHEN inventory_vins.status='sold' THEN 'sold' ELSE 'available' END,
      source=EXCLUDED.source,
      source_listing_id=EXCLUDED.source_listing_id,
      last_seen_at=NOW(),
      photos=EXCLUDED.photos,
      source_payload=EXCLUDED.source_payload,
      updated_at=NOW()
  `,[normalized.vin,normalized.model,normalized.trim,normalized.exteriorColor,normalized.interiorColor,normalized.wheels,normalized.price,normalized.zipCode,normalized.source,normalized.listingId,JSON.stringify(normalized.photos),JSON.stringify(normalized.raw)]);
  return true;
}

async function syncMarketCheck({maxPages=Number(process.env.MARKETCHECK_MAX_PAGES||25),rows=Number(process.env.MARKETCHECK_ROWS||100),model=process.env.MARKETCHECK_MODEL||''}={}){
  await ensureMarketCheckColumns();
  let imported=0;
  let pages=0;
  for(let page=0;page<maxPages;page+=1){
    const data=await fetchPage({start:page*rows,rows,model});
    const listings=Array.isArray(data.listings)?data.listings:[];
    if(!listings.length)break;
    for(const listing of listings)if(await upsertListing(listing))imported+=1;
    pages+=1;
    if(listings.length<rows)break;
  }
  return {imported,pages};
}

module.exports={syncMarketCheck,normalizeListing,fetchPage};
