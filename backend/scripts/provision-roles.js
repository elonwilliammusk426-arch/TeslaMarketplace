const {query,closeDatabase,isDatabaseConfigured}=require('../src/db');
const {hashPassword,ensureRoleSchema}=require('../src/auth');

async function ensureUser(role,{email,password,name}){
  if(!email||!password)return false;
  if(password.length<12)throw new Error(`${role} password must be at least 12 characters`);
  const normalized=String(email).trim().toLowerCase();
  const existing=await query('SELECT id FROM users WHERE email=$1',[normalized]);
  if(existing.rows[0]){
    await query('UPDATE users SET role=$1,name=COALESCE(NULLIF($2,\'\'),name),updated_at=NOW() WHERE id=$3',[role,String(name||'').trim(),existing.rows[0].id]);
  }else{
    const id=`USR-${role.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const passwordHash=await hashPassword(password);
    await query(`INSERT INTO users (id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5)`,[id,String(name||role).trim(),normalized,passwordHash,role]);
  }
  return true;
}

async function main(){
  if(!isDatabaseConfigured())throw new Error('DATABASE_URL is required');
  await ensureRoleSchema();
  const changed=[];
  if(await ensureUser('manager',{email:process.env.MANAGER_EMAIL,password:process.env.MANAGER_PASSWORD,name:process.env.MANAGER_NAME||'Fleet Manager'}))changed.push('manager');
  if(await ensureUser('viewer',{email:process.env.VIEWER_EMAIL,password:process.env.VIEWER_PASSWORD,name:process.env.VIEWER_NAME||'Fleet Viewer'}))changed.push('viewer');
  console.log(changed.length?`Provisioned roles: ${changed.join(', ')}`:'No role credentials configured; existing users were left unchanged.');
}

main().catch(error=>{console.error(error.message);process.exitCode=1}).finally(closeDatabase);
