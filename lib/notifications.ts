import * as Notifications from 'expo-notifications';
export async function registerNotifications(){
 const p=await Notifications.getPermissionsAsync();
 if(p.status!=='granted'){const r=await Notifications.requestPermissionsAsync(); if(r.status!=='granted') return false;}
 await Notifications.setNotificationChannelAsync('daily-verse',{name:'Daily Verse',importance:Notifications.AndroidImportance.DEFAULT});
 return true;
}
export async function scheduleDailyVerse(text:string,ref:string){
 await Notifications.cancelAllScheduledNotificationsAsync();
 await Notifications.scheduleNotificationAsync({content:{title:'آية اليوم',body:`${text}\n${ref}`,data:{type:'daily-verse'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour:8,minute:0,channelId:'daily-verse'}});
}
