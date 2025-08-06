import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import AuthService from '../services/AuthService';
import { COLORS, SIZES, USER_ROLES, SCREENS } from '../config/constants';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminApartmentsScreen from '../screens/admin/AdminApartmentsScreen';
import AdminTeamsScreen from '../screens/admin/AdminTeamsScreen';
import AdminUnitsScreen from '../screens/admin/AdminUnitsScreen';
import AdminActivityLogsScreen from '../screens/admin/AdminActivityLogsScreen';
import AdminTopMarketingScreen from '../screens/admin/AdminTopMarketingScreen';

// Field Team Screens
import FieldDashboardScreen from '../screens/field/FieldDashboardScreen';
import FieldCheckinScreen from '../screens/field/FieldCheckinScreen';
import FieldExtendScreen from '../screens/field/FieldExtendScreen';
import FieldUnitsScreen from '../screens/field/FieldUnitsScreen';

// Shared Screens
import ProfileScreen from '../screens/shared/ProfileScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Admin Tab Navigator
const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case SCREENS.ADMIN_DASHBOARD:
              iconName = 'dashboard';
              break;
            case SCREENS.ADMIN_REPORTS:
              iconName = 'assessment';
              break;
            case SCREENS.ADMIN_APARTMENTS:
              iconName = 'apartment';
              break;
            case SCREENS.ADMIN_TEAMS:
              iconName = 'group';
              break;
            case SCREENS.ADMIN_UNITS:
              iconName = 'meeting-room';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray500,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.gray200,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: SIZES.caption,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.background,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name={SCREENS.ADMIN_DASHBOARD}
        component={AdminDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name={SCREENS.ADMIN_REPORTS}
        component={AdminReportsScreen}
        options={{
          title: 'Laporan',
          tabBarLabel: 'Laporan',
        }}
      />
      <Tab.Screen
        name={SCREENS.ADMIN_APARTMENTS}
        component={AdminApartmentsScreen}
        options={{
          title: 'Apartemen',
          tabBarLabel: 'Apartemen',
        }}
      />
      <Tab.Screen
        name={SCREENS.ADMIN_TEAMS}
        component={AdminTeamsScreen}
        options={{
          title: 'Tim Lapangan',
          tabBarLabel: 'Tim',
        }}
      />
      <Tab.Screen
        name={SCREENS.ADMIN_UNITS}
        component={AdminUnitsScreen}
        options={{
          title: 'Unit',
          tabBarLabel: 'Unit',
        }}
      />
    </Tab.Navigator>
  );
};

// Field Team Tab Navigator
const FieldTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case SCREENS.FIELD_DASHBOARD:
              iconName = 'dashboard';
              break;
            case SCREENS.FIELD_CHECKIN:
              iconName = 'add-circle';
              break;
            case SCREENS.FIELD_UNITS:
              iconName = 'meeting-room';
              break;
            case SCREENS.PROFILE:
              iconName = 'person';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray500,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.gray200,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: SIZES.caption,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.background,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name={SCREENS.FIELD_DASHBOARD}
        component={FieldDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name={SCREENS.FIELD_CHECKIN}
        component={FieldCheckinScreen}
        options={{
          title: 'Check-in',
          tabBarLabel: 'Check-in',
        }}
      />
      <Tab.Screen
        name={SCREENS.FIELD_UNITS}
        component={FieldUnitsScreen}
        options={{
          title: 'Status Unit',
          tabBarLabel: 'Unit',
        }}
      />
      <Tab.Screen
        name={SCREENS.PROFILE}
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const user = await AuthService.loadUserFromStorage();
      setCurrentUser(user);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Or loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!currentUser ? (
          // Auth Stack
          <Stack.Screen name={SCREENS.LOGIN} component={LoginScreen} />
        ) : currentUser.role === USER_ROLES.ADMIN ? (
          // Admin Stack
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
            <Stack.Screen
              name={SCREENS.ADMIN_ACTIVITY_LOGS}
              component={AdminActivityLogsScreen}
              options={{
                headerShown: true,
                title: 'Log Aktivitas',
                headerStyle: { backgroundColor: COLORS.primary },
                headerTintColor: COLORS.background,
              }}
            />
            <Stack.Screen
              name={SCREENS.ADMIN_TOP_MARKETING}
              component={AdminTopMarketingScreen}
              options={{
                headerShown: true,
                title: 'Top Marketing',
                headerStyle: { backgroundColor: COLORS.primary },
                headerTintColor: COLORS.background,
              }}
            />
            <Stack.Screen
              name={SCREENS.PROFILE}
              component={ProfileScreen}
              options={{
                headerShown: true,
                title: 'Profil',
                headerStyle: { backgroundColor: COLORS.primary },
                headerTintColor: COLORS.background,
              }}
            />
            <Stack.Screen
              name={SCREENS.SETTINGS}
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Pengaturan',
                headerStyle: { backgroundColor: COLORS.primary },
                headerTintColor: COLORS.background,
              }}
            />
          </>
        ) : (
          // Field Team Stack
          <>
            <Stack.Screen name="FieldTabs" component={FieldTabNavigator} />
            <Stack.Screen
              name={SCREENS.FIELD_EXTEND}
              component={FieldExtendScreen}
              options={{
                headerShown: true,
                title: 'Extend Check-in',
                headerStyle: { backgroundColor: COLORS.primary },
                headerTintColor: COLORS.background,
              }}
            />
            <Stack.Screen
              name={SCREENS.SETTINGS}
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Pengaturan',
                headerStyle: { backgroundColor: COLORS.primary },
                headerTintColor: COLORS.background,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
