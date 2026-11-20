
import { Tabs } from 'expo-router';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#21C995',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#10182F',
          borderTopColor: '#293450',
          height: 75,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarItemStyle: {
          marginHorizontal: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      {/* Login hidden */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarButton: () => null,
        }}
      />

      {/* Signup hidden */}
      <Tabs.Screen
        name="signup"
        options={{
          tabBarButton: () => null,
        }}
      />

      {/* Dashboard */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Dashboard',
        }}
      />

      {/* Reports */}
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
        }}
      />

      {/* Monthly Budget */}
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
        }}
      />

      {/* Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />

      {/* Add Income hidden */}
      <Tabs.Screen
        name="add-income"
        options={{
          tabBarButton: () => null,
        }}
      />

      {/* Add Expense hidden */}
      <Tabs.Screen
        name="add-expense"
        options={{
          tabBarButton: () => null,
        }}
      />

      {/* Reset Password hidden */}
      <Tabs.Screen
        name="reset-password"
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
