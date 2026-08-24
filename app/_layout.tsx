import 'react-native-gesture-handler';
import React from 'react';
import { I18nManager } from 'react-native';
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {AuthProvider} from '../src/AuthProvider';
export default function Layout(){return <AuthProvider><StatusBar style="dark"/><Stack screenOptions={{headerShown:false}}/></AuthProvider>}
