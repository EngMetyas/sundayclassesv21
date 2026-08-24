import AsyncStorage from '@react-native-async-storage/async-storage';
export const storage={
 async get<T>(k:string,f:T){try{const v=await AsyncStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}},
 async set(k:string,v:any){await AsyncStorage.setItem(k,JSON.stringify(v))}
};
