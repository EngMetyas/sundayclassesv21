export const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
export const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const anon = process.env.VITE_SUPABASE_ANON_KEY || '';
export async function json(r:Response){const t=await r.text();try{return t?JSON.parse(t):null}catch{return {raw:t}}}
export async function db(path:string, init:RequestInit={}){const r=await fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json',...(init.headers||{})}});const d=await json(r);if(!r.ok)throw new Error(d?.message||d?.error||d?.hint||`Database error ${r.status}`);return d;}
export async function currentUser(req:any){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return null;const token=h.slice(7);const r=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:`Bearer ${token}`}});if(!r.ok)return null;return json(r)}
export async function profile(id:string){const rows=await db(`profiles?select=id,role,sector_id,class_id,stage&id=eq.${encodeURIComponent(id)}&limit=1`);return rows?.[0]||null}
