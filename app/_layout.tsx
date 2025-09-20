import * as React from "react";
import { Provider as PaperProvider } from "react-native-paper";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { AuthProvider, useAuth } from "./src/utils/context/AuthContext";
import { en, registerTranslation } from "react-native-paper-dates";
import { MaterialIcons } from "@expo/vector-icons";
import Home from "./Home";
import CreateEvent from "./CreateEvent";
import Profile from "./Profile";
import Login from "./Login";
import EventDetail from "./EventDetail";

registerTranslation("en", en);

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function OrganizerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#1976d2",
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="CreateEvent"
        component={CreateEvent}
        options={{
          tabBarLabel: "Create",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function PaticipantTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#1976d2",
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ---------------- ROOT ----------------
function Root() {
  const { user } = useAuth();

  return (
    <PaperProvider>
      <Drawer.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // If no user → show login screen only
          <Drawer.Screen name="Login" component={Login} />
        ) : user.role === "organizer" ? (
          <Stack.Screen name="OrganizerTabs" component={OrganizerTabs} />
        ) : (
          <Stack.Screen name="ParticipantTabs" component={PaticipantTabs} />
        )}
        <Drawer.Screen
          name="EventDetail"
          component={EventDetail}
          options={{ drawerLabel: "EventDetails", title: "Participant" }}
        />
      </Drawer.Navigator>
    </PaperProvider >
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
