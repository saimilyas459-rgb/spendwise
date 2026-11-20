import { Tabs } from 'expo-router';

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#21C995',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#10182F',
          borderTopColor: '#293450',
          height: 65,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarLabel: 'Reports',
        }}
      />

      <Tabs.Screen
        name="signup"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="add-income"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="add-expense"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="reset-password"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}