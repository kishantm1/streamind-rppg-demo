import { Tabs } from 'expo-router';
import { BarChart3, Heart, Smile, Wind } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabsLayout() {
  const { palette } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTitleStyle: { color: palette.text, fontWeight: '600' },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Monitor',
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="breathing"
        options={{
          title: 'Breathe',
          tabBarIcon: ({ color, size }) => <Wind color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: 'Mood',
          tabBarIcon: ({ color, size }) => <Smile color={color} size={size} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
