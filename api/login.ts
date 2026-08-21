const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anon = process.env.VITE_SUPABASE_ANON_KEY || '';

async function parse(r:Response){const t=await r.text();if(!t)return null;try{return JSON.parse(t)}catch{return {raw:t}}}
async function db(path:string){
  const r=await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'}});
  const d=await parse(r);
  if(!r.ok) throw new Error(d?.message||d?.error||d?.details||`Database error ${r.status}`);
  return d;
}
export default async function handler(req:any,res:any){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(!url||!service||!anon) return res.status(500).json({error:'Supabase server environment variables are missing.'});
  try{
    const username=String(req.body?.username||'').trim();
    const password=String(req.body?.password||'');
    if(!username||!password) return res.status(400).json({error:'أدخل اسم المستخدم وكلمة المرور.'});
    const rows=await db(`profiles?select=id,email,active&username=eq.${encodeURIComponent(username)}&limit=1`);
    const profile=rows?.[0];
    if(!profile||profile.active===false) return res.status(401).json({error:profile?'هذا الحساب موقوف.':'اسم المستخدم أو كلمة المرور غير صحيحة.'});
    const r=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({email:profile.email,password})});
    const d=await parse(r);
    if(!r.ok) return res.status(401).json({error:'اسم المستخدم أو كلمة المرور غير صحيحة.'});
    return res.status(200).json(d);
  }catch(e:any){return res.status(500).json({error:e.message||'تعذر تسجيل الدخول'})}
}
