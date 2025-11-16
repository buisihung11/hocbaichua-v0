import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Pressable } from "react-native";
import { ThemeToggle } from "@/components/theme-toggle";

function DrawerLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");

  const renderThemeToggle = useCallback(() => <ThemeToggle />, []);

  return (
    <Drawer
      screenOptions={{
        headerTintColor: themeColorForeground,
        headerStyle: { backgroundColor: themeColorBackground },
        headerTitleStyle: {
          fontWeight: "600",
          color: themeColorForeground,
        },
        headerRight: renderThemeToggle,
        drawerStyle: { backgroundColor: themeColorBackground },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: "Home",
          drawerLabel: "Home",
          drawerIcon: ({ size, color }) => (
            <Ionicons color={color} name="home-outline" size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: "Tabs",
          drawerLabel: "Tabs",
          drawerIcon: ({ size, color }) => (
            <MaterialIcons color={color} name="border-bottom" size={size} />
          ),
          headerRight: () => (
            <Link asChild href="/modal">
              <Pressable className="mr-4">
                <Ionicons
                  color={themeColorForeground}
                  name="add-outline"
                  size={24}
                />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Drawer.Screen
        name="todos"
        options={{
          headerTitle: "Todos",
          drawerLabel: "Todos",
          drawerIcon: ({ size, color }) => (
            <Ionicons color={color} name="checkbox-outline" size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="ai"
        options={{
          headerTitle: "AI",
          drawerLabel: "AI",
          drawerIcon: ({ size, color }) => (
            <Ionicons
              color={color}
              name="chatbubble-ellipses-outline"
              size={size}
            />
          ),
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
