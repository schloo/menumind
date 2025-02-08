import { Tabs } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      {/* Scan Menu Tab */}
      <Tabs.Screen name="index" options={{
        title: "Menu Scanner",
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons 
            name="camera-enhance" 
            size={size} 
            color={color}
          />
        ),
      }} />
      
      {/* Dining Preferences Tab */}
      <Tabs.Screen name="settings" options={{
        title: "Dining Preferences",
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons 
            name="format-list-bulleted" 
            size={size} 
            color={color}
          />
        ),
      }} />
    </Tabs>
  );
}