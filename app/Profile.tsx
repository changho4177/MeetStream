import API_URL from "@/config";
import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, } from "react-native";
import { Button, Card, Text, TextInput, Snackbar } from "react-native-paper";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useAuth } from "../app/src/utils/context/AuthContext";

const Profile = () => {
    const { user, token, login, logout } = useAuth();
    const defaultLocation = { lat: 3.139, lng: 101.6869 };

    const [name, setName] = useState(user?.name || "");
    const [role, setRole] = useState(user?.role || "participant");
    const [homeLocation, setHomeLocation] = useState(
        user?.homeLocation?.lat && user?.homeLocation?.lng
            ? user.homeLocation
            : defaultLocation
    );
    const [homeAddress, setHomeAddress] = useState(user?.homeAddress || ""); // 👈 new state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const mapRef = useRef<MapView | null>(null);

    useEffect(() => {
        if (!user) fetchProfile();
    }, [token, user?.id]);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to fetch profile");
            login(data, token);
            setName(data.name);
            setRole(data.role);
            setHomeLocation(data.homeLocation || defaultLocation);
            setHomeAddress(data.homeAddress || "");
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleUpdate = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API_URL}/api/users/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name, role, homeLocation, homeAddress }), // 👈 include address
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Update failed");

            login(data, token);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const setCurrentLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            alert("Permission to access location was denied");
            return;
        }
        const location = await Location.getCurrentPositionAsync({});
        const coords = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
        };
        setHomeLocation(coords);
        await reverseGeocode(coords);

        // 👇 Animate map to new region
        mapRef.current?.animateToRegion(
            {
                latitude: coords.lat,
                longitude: coords.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            },
            1000 // animation duration (ms)
        );
    };

    const reverseGeocode = async (coords: { lat: number; lng: number }) => {
        try {
            const result = await Location.reverseGeocodeAsync({
                latitude: coords.lat,
                longitude: coords.lng,
            });
            if (result[0]) {
                const { name, street, city, region, country } = result[0];
                const address = [name, street, city, region, country]
                    .filter(Boolean)
                    .join(", ");
                setHomeAddress(address);
            }
        } catch (e) {
            console.warn("Reverse geocode failed", e);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <Card style={styles.card}>
                    <Card.Title title="Profile" />
                    <Card.Content>
                        <TextInput
                            label="Name"
                            value={name}
                            onChangeText={setName}
                            mode="outlined"
                            style={styles.input}
                        />
                        <TextInput
                            label="Email"
                            value={user?.email || ""}
                            mode="outlined"
                            style={styles.input}
                            disabled
                        />
                        <TextInput
                            label="Role"
                            value={role}
                            onChangeText={setRole}
                            mode="outlined"
                            style={styles.input}
                        />

                        {/* 👇 New input for Home Address */}
                        <TextInput
                            label="Home Address"
                            value={homeAddress}
                            onChangeText={setHomeAddress}
                            mode="outlined"
                            style={styles.input}
                        />

                        <Text style={{ marginBottom: 8 }}>Home Location:</Text>
                        <MapView
                            ref={mapRef}   // 👈 attach ref
                            style={styles.map}
                            initialRegion={{
                                latitude: homeLocation.lat || defaultLocation.lat,
                                longitude: homeLocation.lng || defaultLocation.lng,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                            onPoiClick={(e) => {
                                const coords = {
                                    lat: e.nativeEvent.coordinate.latitude,
                                    lng: e.nativeEvent.coordinate.longitude,
                                };
                                setHomeLocation(coords);
                                reverseGeocode(coords);

                                // auto-center when POI selected
                                mapRef.current?.animateToRegion(
                                    {
                                        latitude: coords.lat,
                                        longitude: coords.lng,
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                    },
                                    1000
                                );
                            }}
                            onPress={(e) => {
                                const coords = {
                                    lat: e.nativeEvent.coordinate.latitude,
                                    lng: e.nativeEvent.coordinate.longitude,
                                };
                                setHomeLocation(coords);
                                reverseGeocode(coords);

                                // auto-center when tapping anywhere
                                mapRef.current?.animateToRegion(
                                    {
                                        latitude: coords.lat,
                                        longitude: coords.lng,
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                    },
                                    1000
                                );
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: homeLocation.lat || defaultLocation.lat,
                                    longitude: homeLocation.lng || defaultLocation.lng,
                                }}
                            />
                        </MapView>

                        <Button
                            mode="outlined"
                            onPress={setCurrentLocation}
                            style={{ marginVertical: 10 }}
                        >
                            Use Current Location
                        </Button>

                        {error ? <Text style={styles.error}>{error}</Text> : null}

                        <Button
                            mode="contained"
                            onPress={handleUpdate}
                            loading={loading}
                            style={styles.button}
                        >
                            Update
                        </Button>

                        <Button
                            mode="outlined"
                            onPress={logout}
                            style={{ marginTop: 10 }}
                        >
                            Logout
                        </Button>
                    </Card.Content>
                </Card>

                {/* Snackbar for success */}
                <Snackbar
                    visible={success}
                    onDismiss={() => setSuccess(false)}
                    duration={3000}
                    action={{ label: "OK", onPress: () => setSuccess(false) }}
                >
                    Profile updated successfully!
                </Snackbar>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default Profile;

const styles = StyleSheet.create({
    container: { padding: 20 },
    card: { padding: 20 },
    input: { marginBottom: 10 },
    button: { marginTop: 10 },
    error: { color: "red", marginBottom: 10 },
    map: { height: 200, marginBottom: 10, borderRadius: 8 },
});
