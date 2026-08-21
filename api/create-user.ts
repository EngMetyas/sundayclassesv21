const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anon = process.env.VITE_SUPABASE_ANON_KEY || '';
const INTERNAL_DOMAIN='StMarySaqel.com';
async function parseResponse(r:Response){const text=await r.text();if(!text)return null;try{return JSON.parse(text)}catch{return {raw:text}}}
async function db(path:string, init:RequestInit={}){const r=await fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json',...(init.headers||{})}});const d=await parseResponse(r);if(!r.ok)throw new Error(d?.message||d?.error||d?.hint||d?.details||`Database error ${r.status}`);return d;}
function internalEmail(username:string){return `${username.toLowerCase()}@${INTERNAL_DOMAIN}`}
export default async function handler(req:any,res:any){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!url||!service||!anon)return res.status(500).json({error:'Supabase server environment variables are missing.'});
 try{
  const auth=req.headers.authorization||'';if(!auth.startsWith('Bearer '))return res.status(401).json({error:'Unauthorized'});
  const token=auth.slice(7);const me=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:`Bearer ${token}`}});const meData=await parseResponse(me);if(!me.ok)return res.status(401).json({error:'Invalid session'});
  const rows=await db(`profiles?select=id,role,sector_id&id=eq.${encodeURIComponent(meData.id)}&limit=1`);const actor=rows?.[0];if(!actor||!['site_admin','priest','secretary','sector_secretary','servant'].includes(actor.role))return res.status(403).json({error:'ليس لديك صلاحية إنشاء حسابات.'});
  const {full_name,username,password,role='member',sector_id=null,class_id=null,phone=null,birth_date=null,address=null,gender=null,stage=null}=req.body||{};
  if(!full_name||!username||!password)return res.status(400).json({error:'الاسم واسم المستخدم وكلمة المرور مطلوبة.'});
  if(!/^[A-Za-z0-9._-]{3,40}$/.test(String(username)))return res.status(400).json({error:'اسم المستخدم يجب أن يكون 3-40 حرفًا إنجليزيًا أو رقمًا، ويمكن استخدام النقطة والشرطة.'});
  if(!['site_admin','priest','secretary','sector_secretary','servant','member'].includes(role))return res.status(400).json({error:'نوع الحساب غير صحيح.'});
  const allowed:Record<string,string[]>={site_admin:['priest','secretary','sector_secretary','servant','member'],priest:['secretary','sector_secretary','servant','member'],secretary:['sector_secretary','servant','member'],sector_secretary:['servant','member'],servant:['member']};if(!allowed[actor.role]?.includes(role))return res.status(403).json({error:'لا يمكنك إنشاء هذا النوع من الحسابات.'});
  if((role==='servant'||role==='sector_secretary')&&!sector_id)return res.status(400).json({error:'يجب تحديد قطاع الخادم.'});
  if(actor.role==='servant'&&sector_id!==actor.sector_id)return res.status(403).json({error:'الخادم لا يمكنه إنشاء حساب خارج قطاعه.'});
  const existing=await db(`profiles?select=id&username=eq.${encodeURIComponent(username)}&limit=1`);if(existing?.length)return res.status(409).json({error:'اسم المستخدم مستخدم بالفعل.'});
  let classRow:any=null;
  if(role==='member'){
   if(!class_id)return res.status(400).json({error:'يجب اختيار فصل للمخدوم.'});
   const cr=await db(`classes?select=id,sector_id,servant_id&id=eq.${encodeURIComponent(class_id)}&limit=1`);classRow=cr?.[0];if(!classRow)return res.status(400).json({error:'الفصل المختار غير موجود.'});
   if(sector_id&&sector_id!==classRow.sector_id)return res.status(400).json({error:'القطاع لا يطابق قطاع الفصل.'});
   if(actor.role==='servant'&&classRow.sector_id!==actor.sector_id)return res.status(403).json({error:'لا يمكنك إضافة مخدوم إلى فصل خارج قطاعك.'});
   if(actor.role==='servant'&&classRow.servant_id&&classRow.servant_id!==actor.id)return res.status(403).json({error:'هذا الفصل مسند إلى خادم آخر.'});
  }
  const finalSector=sector_id||classRow?.sector_id||null; if(role==='member'&&stage){const expected=finalSector==='baby'?'baby':finalSector==='primary'?'primary':finalSector?.includes('prep')?'prep':finalSector?.includes('secondary')?'secondary':finalSector==='youth'?'youth':null;if(expected&&stage!==expected)return res.status(400).json({error:'المرحلة لا تتوافق مع قطاع الفصل.'});}const email=internalEmail(username);
  const cr=await fetch(`${url}/auth/v1/admin/users`,{method:'POST',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'},body:JSON.stringify({email,password,email_confirm:true,user_metadata:{full_name,username}})});
  const user=await parseResponse(cr);if(!cr.ok)return res.status(cr.status).json({error:user?.msg||user?.message||user?.error_description||'فشل إنشاء حساب الدخول'});
  try{await db('profiles',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:user.id,full_name,username,email,role,sector_id:finalSector,class_id:role==='member'?class_id:null,phone:phone||null,birth_date:birth_date||null,address:address||null,gender:gender||null,stage:stage||null,active:true})});}
  catch(profileError:any){await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`,{method:'DELETE',headers:{apikey:service,Authorization:`Bearer ${service}`}}).catch(()=>{});throw profileError;}
  return res.status(200).json({id:user.id,username});
 }catch(e:any){return res.status(500).json({error:e.message||'Unexpected error'})}
}
