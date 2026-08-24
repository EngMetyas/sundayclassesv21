import React from 'react';import {Redirect} from 'expo-router';import {useAuth} from '../src/AuthProvider';
export default function Index(){const{session,loading}=useAuth();if(loading)return null;return <Redirect href={session?'/(tabs)':'/login'}/>}
