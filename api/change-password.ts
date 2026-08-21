const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anon = process.env.VITE_SUPABASE_ANON_KEY || '';

async function parseResponse(r:Response){
  const text=await r.text(); if(!text)return null; try{return JSON.parse(text)}catch{return {raw:text}}
}
async function db(path:string, init:RequestInit={}){
  const r=await fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json',...(init.headers||{})}});
  const d=await parseResponse(r); if(!r.ok) throw new Error(typeof d==='string'?d:(d?.message||d?.error||d?.hint||d?.details||`Database error ${r.status}`)); return d;
}

export default async function handler(req:any,res:any){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(!url||!service||!anon) return res.status(500).json({error:'Supabase server environment variables are missing.'});
  try{
    const auth=req.headers.authorization||''; if(!auth.startsWith('Bearer ')) return res.status(401).json({error:'Unauthorized'});
    const token=auth.slice(7);
    const me=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:`Bearer ${token}`}});
    const meData=await parseResponse(me); if(!me.ok) return res.status(401).json({error:'Invalid session'});
    const actorRows=await db(`profiles?select=id,role,sector_id&id=eq.${encodeURIComponent(meData.id)}&limit=1`); const actor=actorRows?.[0];
    if(!actor||!['site_admin','priest','secretary','sector_secretary'].includes(actor.role)) return res.status(403).json({error:'ليس لديك صلاحية تغيير كلمات المرور.'});
    const {user_id,password}=req.body||{};
    if(!user_id||!password||typeof password!=='string') return res.status(400).json({error:'بيانات تغيير كلمة المرور ناقصة.'});
    if(password.length<6) return res.status(400).json({error:'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'});
    const targetRows=await db(`profiles?select=id,role,sector_id,full_name&id=eq.${encodeURIComponent(user_id)}&limit=1`); const target=targetRows?.[0];
    if(!target) return res.status(404).json({error:'الحساب المطلوب غير موجود.'});
    if(target.id===actor.id) return res.status(400).json({error:'استخدم إعدادات حسابك لتغيير كلمة مرورك الشخصية.'});
    let allowed=false;
    if(actor.role==='site_admin') allowed=target.role!=='site_admin';
    else if(actor.role==='priest') allowed=target.role!=='site_admin';
    else if(actor.role==='secretary') allowed=['sector_secretary','servant','member'].includes(target.role);
    else if(actor.role==='sector_secretary') allowed=['servant','member'].includes(target.role) && target.sector_id===actor.sector_id;
    if(!allowed) return res.status(403).json({error:'لا يمكنك تغيير كلمة مرور هذا الحساب.'});
    const r=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user_id)}`,{method:'PUT',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'},body:JSON.stringify({password})});
    const d=await parseResponse(r); if(!r.ok) return res.status(r.status).json({error:d?.message||d?.msg||d?.error_description||'فشل تغيير كلمة المرور.'});
    return res.status(200).json({ok:true});
  }catch(e:any){return res.status(500).json({error:e.message||'Unexpected error'})}
}
