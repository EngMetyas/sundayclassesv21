import webpush from 'web-push';
import { db, url, service, currentUser, profile } from './_common';
const key=(name:string)=>process.env[name]||'';
export default async function handler(req:any,res:any){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!url||!service||!key('VAPID_PUBLIC_KEY')||!key('VAPID_PRIVATE_KEY')||!key('VAPID_SUBJECT'))return res.status(500).json({error:'Push environment variables are missing.'});
 try{const user=await currentUser(req);if(!user)return res.status(401).json({error:'Unauthorized'});const actor=await profile(user.id);if(!actor||!['site_admin','priest','secretary','sector_secretary','servant'].includes(actor.role))return res.status(403).json({error:'ليس لديك صلاحية إرسال إشعارات.'});
 const {type='announcement',title='خِدمة',body='',sector_id=null,class_id=null,user_ids=null,exclude_user_id=null,tab='dashboard'}=req.body||{};
 const pref=type==='announcement'?'announcements':type==='chat'?'chat':type==='visit'?'visits':type==='event'?'events':type==='challenge'?'challenges':'daily_verse';
 let q='push_subscriptions?select=user_id,endpoint,p256dh,auth&active=eq.true';
 const subs=await db(q)||[]; const ids=new Set<string>((user_ids||[]).map(String));
 const candidates=(subs as any[]).filter(s=>!exclude_user_id||s.user_id!==exclude_user_id).filter(s=>s[pref]!==false);
 let targetProfiles:any[]=[];
 if(sector_id) targetProfiles=await db(`profiles?select=id&sector_id=eq.${encodeURIComponent(sector_id)}&active=eq.true`)||[];
 if(class_id) targetProfiles=await db(`profiles?select=id&class_id=eq.${encodeURIComponent(class_id)}&active=eq.true`)||[];
 const targetSet=new Set<string>([...ids,...targetProfiles.map((x:any)=>x.id)]);
 const filtered=(sector_id||class_id||ids.size)?candidates.filter(s=>targetSet.has(s.user_id)):candidates;
 const notificationRows=await db('notifications',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({type,title,body,tab,target_scope:sector_id?'sector':class_id?'class':ids.size?'users':'all',target_id:sector_id||class_id||null,created_by:user.id})}).catch(()=>[]); const notificationId=notificationRows?.[0]?.id||null;
 webpush.setVapidDetails(key('VAPID_SUBJECT'),key('VAPID_PUBLIC_KEY'),key('VAPID_PRIVATE_KEY'));
 let sent=0,removed=0;for(const s of filtered){try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},{title,body,icon:'/favicon.svg',badge:'/favicon.svg',data:{tab,type}});sent++;if(notificationId)await db('notification_deliveries',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({notification_id:notificationId,user_id:s.user_id,endpoint:s.endpoint,status:'sent',delivered_at:new Date().toISOString()})}).catch(()=>{})}catch(e:any){if(e?.statusCode===404||e?.statusCode===410){await db(`push_subscriptions?endpoint=eq.${encodeURIComponent(s.endpoint)}`,{method:'DELETE'}).catch(()=>{});removed++;}}}
 return res.status(200).json({ok:true,sent,removed,pref});}catch(e:any){return res.status(500).json({error:e.message||'Failed to send notifications'})}}
