import { db, url, service, currentUser } from './_common';
export default async function handler(req:any,res:any){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 try{const user=await currentUser(req);if(!user)return res.status(401).json({error:'Unauthorized'});const p=req.body?.preferences||{};const allowed=['daily_verse','announcements','visits','chat','events','challenges'];const patch:any={updated_at:new Date().toISOString()};for(const k of allowed)if(typeof p[k]==='boolean')patch[k]=p[k];await db(`push_subscriptions?user_id=eq.${encodeURIComponent(user.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(patch)});return res.status(200).json({ok:true});}catch(e:any){return res.status(500).json({error:e.message||'Failed'})}}
