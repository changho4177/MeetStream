import React, { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { TextInput, Button, Card, Text, Divider } from "react-native-paper";
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import API_URL from "@/config";
import { useAuth } from "./src/utils/context/AuthContext";
import MultiSelect from "react-native-multiple-select";

const CreateEvent = ({ navigation }: any) => {
    const { user } = useAuth();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [venueName, setVenueName] = useState("");
    const [venueAddress, setVenueAddress] = useState("");
    const [start, setStart] = useState(new Date());
    const [end, setEnd] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    const [organizers, setOrganizers] = useState<any[]>([]);
    const [selectedOrganizers, setSelectedOrganizers] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");

    // Map location
    const [region, setRegion] = useState({
        latitude: 3.139,
        longitude: 101.6869,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });
    const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);

    // Fetch all users for organizer selection
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch(`${API_URL}/api/users/organizers`);
                const data = await res.json();
                setOrganizers(
                    data.map((u: any) => ({
                        label: `${u.name} (${u.role})`,
                        value: u._id,
                    }))
                );
            } catch (err) {
                console.error("Failed to fetch users:", err);
            }
        };
        fetchUsers();
    }, []);

    // Get current location
    const handleUseCurrentLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            alert("Permission to access location was denied");
            return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
        setRegion({ ...region, ...coords });
        setMarker(coords);
    };

    const handleCreateEvent = async () => {
        setLoading(true);
        setSuccess("");

        try {
            const res = await fetch(`${API_URL}/api/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    organizerIds: [user._id, ...selectedOrganizers],
                    venue: {
                        name: venueName,
                        address: venueAddress,
                        lat: marker?.latitude || 0,
                        lng: marker?.longitude || 0,
                    },
                    start,
                    end,
                }),
            });

            if (!res.ok) throw new Error("Failed to create event");

            const data = await res.json();
            console.log("Event created:", data);

            setSuccess("✅ Event created successfully!");
            setTitle("");
            setDescription("");
            setVenueName("");
            setVenueAddress("");
            setSelectedOrganizers([]);
            setMarker(null);
        } catch (err: any) {
            setSuccess("❌ " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle start datetime confirm
    const handleStartDateConfirm = ({ date }: { date: Date | undefined }) => {
        setShowStartPicker(false);
        if (date) {
            // Save the picked date first
            setStart(date);
            // Then open time picker
            setShowStartTimePicker(true);
        }
    };

    const handleStartTimeConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
        setShowStartTimePicker(false);
        const updated = new Date(start);
        updated.setHours(hours);
        updated.setMinutes(minutes);
        setStart(updated);
    };

    // Handle end datetime confirm
    const handleEndDateConfirm = ({ date }: { date: Date | undefined }) => {
        setShowEndPicker(false);
        if (date) {
            setEnd(date);
            setShowEndTimePicker(true);
        }
    };

    const handleEndTimeConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
        setShowEndTimePicker(false);
        const updated = new Date(end);
        updated.setHours(hours);
        updated.setMinutes(minutes);
        setEnd(updated);
    };

    return (
        <KeyboardAwareScrollView
            contentContainerStyle={styles.container}
            enableOnAndroid
            extraScrollHeight={80}
        >
            <Card style={styles.card}>
                <Card.Title title="Create Event" />

                <Card.Content>
                    {/* --- Section: Event Info --- */}
                    <Text style={styles.sectionTitle}>📌 Event Info</Text>
                    <Divider style={styles.divider} />
                    <TextInput
                        label="Event Title"
                        value={title}
                        onChangeText={setTitle}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Description"
                        value={description}
                        onChangeText={setDescription}
                        mode="outlined"
                        multiline
                        style={styles.input}
                    />
                    <MultiSelect
                        items={organizers}
                        uniqueKey="value"
                        onSelectedItemsChange={setSelectedOrganizers}
                        selectedItems={selectedOrganizers}
                        selectText="Pick Organizers"
                        searchInputPlaceholderText="Search organizers..."
                        tagRemoveIconColor="#CCC"
                        tagBorderColor="#CCC"
                        tagTextColor="#333"
                        selectedItemTextColor="#333"
                        selectedItemIconColor="#333"
                        itemTextColor="#000"
                        displayKey="label"
                        submitButtonText="Done"
                    />

                    {/* --- Section: Event Location --- */}
                    <Text style={styles.sectionTitle}>📍 Event Location</Text>
                    <Divider style={styles.divider} />
                    <TextInput
                        label="Venue Name"
                        value={venueName}
                        onChangeText={setVenueName}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Venue Address"
                        value={venueAddress}
                        onChangeText={setVenueAddress}
                        mode="outlined"
                        style={styles.input}
                    />
                    <MapView
                        style={styles.map}
                        region={region}
                        onPress={async (e) => {
                            // Normal tap → drop marker and geocode
                            const coords = e.nativeEvent.coordinate;
                            setMarker(coords);
                            setRegion({ ...region, ...coords });

                            try {
                                const geocode = await Location.reverseGeocodeAsync(coords);
                                if (geocode.length > 0) {
                                    const place = geocode[0];
                                    const placeName = place.name || place.street || "Selected Location";
                                    const placeAddress = [
                                        place.street,
                                        place.district,
                                        place.city,
                                        place.region,
                                        place.postalCode,
                                        place.country,
                                    ]
                                        .filter(Boolean)
                                        .join(", ");

                                    setVenueName(placeName);
                                    setVenueAddress(placeAddress);
                                }
                            } catch (err) {
                                console.error("Reverse geocode failed:", err);
                            }
                        }}
                        onPoiClick={async (e) => {
                            const { coordinate, name, placeId } = e.nativeEvent;

                            // Drop marker at POI
                            setMarker(coordinate);
                            setRegion({ ...region, ...coordinate });

                            // Use POI name directly
                            setVenueName(name);

                            // Try reverse geocode for full address
                            try {
                                const geocode = await Location.reverseGeocodeAsync(coordinate);
                                if (geocode.length > 0) {
                                    const place = geocode[0];
                                    const placeAddress = [
                                        place.street,
                                        place.district,
                                        place.city,
                                        place.region,
                                        place.postalCode,
                                        place.country,
                                    ]
                                        .filter(Boolean)
                                        .join(", ");
                                    setVenueAddress(placeAddress);
                                }
                            } catch (err) {
                                console.error("Reverse geocode failed:", err);
                            }
                        }}
                    >
                        {marker && <Marker coordinate={marker} />}
                    </MapView>
                    <Button
                        mode="outlined"
                        onPress={handleUseCurrentLocation}
                        style={styles.input}
                    >
                        Use My Current Location
                    </Button>

                    {/* --- Section: Event Time --- */}
                    <Text style={styles.sectionTitle}>⏰ Event Time</Text>
                    <Divider style={styles.divider} />

                    <Button
                        mode="outlined"
                        onPress={() => setShowStartPicker(true)}
                        style={styles.input}
                    >
                        Pick Start Date & Time
                    </Button>
                    <Text>Start: {start.toLocaleString()}</Text>

                    <DatePickerModal
                        locale="en"
                        mode="single"
                        visible={showStartPicker}
                        onDismiss={() => setShowStartPicker(false)}
                        date={start}
                        onConfirm={handleStartDateConfirm}
                    />
                    <TimePickerModal
                        visible={showStartTimePicker}
                        onDismiss={() => setShowStartTimePicker(false)}
                        onConfirm={handleStartTimeConfirm}
                        hours={start.getHours()}
                        minutes={start.getMinutes()}
                        label="Pick Start Time"
                    />

                    <Button
                        mode="outlined"
                        onPress={() => setShowEndPicker(true)}
                        style={styles.input}
                    >
                        Pick End Date & Time
                    </Button>
                    <Text>End: {end.toLocaleString()}</Text>

                    <DatePickerModal
                        locale="en"
                        mode="single"
                        visible={showEndPicker}
                        onDismiss={() => setShowEndPicker(false)}
                        date={end}
                        onConfirm={handleEndDateConfirm}
                    />
                    <TimePickerModal
                        visible={showEndTimePicker}
                        onDismiss={() => setShowEndTimePicker(false)}
                        onConfirm={handleEndTimeConfirm}
                        hours={end.getHours()}
                        minutes={end.getMinutes()}
                        label="Pick End Time"
                    />

                    {success ? <Text style={styles.success}>{success}</Text> : null}

                    <Button
                        mode="contained"
                        onPress={handleCreateEvent}
                        loading={loading}
                        style={styles.button}
                    >
                        Create Event
                    </Button>
                </Card.Content>
            </Card>
        </KeyboardAwareScrollView>
    );
};

export default CreateEvent;

const styles = StyleSheet.create({
    container: {
        padding: 20,
        flexGrow: 1,
    },
    card: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 15,
        marginBottom: 5,
    },
    divider: {
        marginBottom: 10,
    },
    input: {
        marginBottom: 10,
    },
    button: {
        marginTop: 15,
    },
    success: {
        marginTop: 10,
        color: "green",
    },
    map: {
        height: 200,
        borderRadius: 10,
        marginBottom: 10,
    },
});
