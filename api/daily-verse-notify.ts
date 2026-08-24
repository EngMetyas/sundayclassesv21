import webpush from 'web-push';
import { db, url, service } from './notifications/_common';
const env=(n:string)=>process.env[n]||'';
export default async function handler(req:any,res:any){
 if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const cron=req.headers['x-vercel-cron']||req.headers['authorization'];if(env('CRON_SECRET')&&cron!==`Bearer ${env('CRON_SECRET')}`&&cron!==env('CRON_SECRET'))return res.status(401).json({error:'Unauthorized'});
 try{
  webpush.setVapidDetails(env('VAPID_SUBJECT'),env('VAPID_PUBLIC_KEY'),env('VAPID_PRIVATE_KEY'));
  const host=req.headers.host;const proto=req.headers['x-forwarded-proto']||'https';const b=host?await fetch(`${proto}://${host}/bible.json`).catch(()=>null):null;
  let daily={book:'يوحنا',chapter:3,verse:16,text:'لأَنَّهُ هكَذَا أَحَبَّ اللهُ الْعَالَمَ...'} as any;
  if(b?.ok){const d=await b.json().catch(()=>null);const all:any[]=[];for(const book of d?.books||[])for(const ch of book.chapters||[])for(const v of ch.verses||[])all.push({book:book.name,chapter:ch.number,verse:v.number,text:v.text});if(all.length)daily=all[Math.floor(Date.now()/86400000)%all.length];}
  const rows=await db('push_subscriptions?select=user_id,endpoint,p256dh,auth&active=eq.true&daily_verse=eq.true')||[];let sent=0,removed=0;
  for(const s of rows){try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},{title:'آية اليوم',body:`${daily.book} ${daily.chapter}:${daily.verse} — ${daily.text}`,icon:'/favicon.svg',badge:'/favicon.svg',data:{tab:'bible',type:'daily_verse'}});sent++}catch(e:any){if(e?.statusCode===404||e?.statusCode===410){await db(`push_subscriptions?endpoint=eq.${encodeURIComponent(s.endpoint)}`,{method:'DELETE'}).catch(()=>{});removed++}}}
  return res.status(200).json({ok:true,sent,removed,reference:`${daily.book} ${daily.chapter}:${daily.verse}`});
 }catch(e:any){return res.status(500).json({error:e.message||'Failed'})}}
