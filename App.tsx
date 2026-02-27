import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

import { supabase } from './src/services/supabase';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { RouteScreen } from './src/screens/RouteScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ session }: any) {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, 
        tabBarActiveTintColor: colors.primary, 
        tabBarInactiveTintColor: colors.tabBarInactive, 
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          paddingBottom: 20,
          paddingTop: 5,
          height: 70,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Início') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Rota') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Início">
        {(props) => <HomeScreen {...props} session={session} />}
      </Tab.Screen>
      <Tab.Screen name="Rota" component={RouteScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { colors, isDarkMode } = useTheme();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (!session && session !== undefined) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={{
      ...DefaultTheme,
      dark: isDarkMode,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.borderLight,
        notification: colors.primary,
      },
    }}>
      <Stack.Navigator screenOptions={{ 
        headerShown: false, 
        contentStyle: { backgroundColor: colors.background },
      }}>
        <Stack.Screen name="MainTabs">
          {(props) => <MainTabs {...props} session={session} />}
        </Stack.Screen>
        
        <Stack.Screen 
          name="Camera" 
          component={CameraScreen} 
          options={{ presentation: 'transparentModal' }} 
        />

        <Stack.Screen 
          name="EditProfile" 
          component={EditProfileScreen} 
          options={{ presentation: 'transparentModal', animation: 'slide_from_right' }} 
        />

        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ presentation: 'transparentModal', animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}