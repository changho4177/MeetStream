// src/screens/Home.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Linking, ScrollView, StyleSheet } from "react-native";
import { Card, Text, Button, ActivityIndicator, IconButton } from "react-native-paper";
import axios from "axios";
import dayjs from "dayjs";
import API_URL from "@/config";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../app/src/utils/context/AuthContext";
import * as Calendar from 'expo-calendar';
import * as Permissions from 'expo-permissions';
import { useNavigation } from "expo-router";

export default function Home({ navigation }: any) {
    const { user } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingEvent, setLoadingEvent] = useState<string | null>(null);

    const addToCalendar = async (ev: any) => {
        try {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status !== "granted") {
                alert("Permission to access calendar was denied");
                return;
            }

            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            console.log("Available calendars:", calendars);

            let calendar = calendars.find(
                (c) =>
                    c.allowsModifications &&
                    (c.source?.name?.toLowerCase().includes("google") ||
                        c.source?.type === Calendar.SourceType.CALDAV)
            );

            if (!calendar) {
                // fallback: first writable calendar
                calendar = calendars.find((c) => c.allowsModifications);
            }

            if (!calendar) {
                alert("No writable calendar found");
                return;
            }

            const eventId = await Calendar.createEventAsync(calendar.id, {
                title: ev.title,
                startDate: new Date(ev.start),
                endDate: new Date(ev.end),
                location: ev.venue?.name || "",
                notes: ev.description || "",
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });

            alert("Event added to your Google Calendar ✅");
            console.log("Event created:", eventId);
        } catch (err) {
            console.error("Failed to add event", err);
        }
    };

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_URL}/api/events`);
            setEvents(data);
        } catch (err) {
            console.error("Failed to fetch events", err);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchEvents();
        }, [])
    );

    if (!user) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" />
                <Text>Loading user...</Text>
            </View>
        );
    }

    const handleParticipate = async (eventId: string, isParticipating: boolean) => {
        if (!user) return; // prevent null crashes

        try {
            setLoadingEvent(eventId);

            const action = isParticipating ? "leave" : "participate";
            const res = await axios.post(`${API_URL}/api/events/${eventId}/${action}`, {
                userId: user.id,
            });

            const updatedEvent = res.data;

            setEvents((prev) =>
                prev.map((ev) => (ev._id === eventId ? updatedEvent : ev))
            );
        } catch (err) {
            console.error("Participation failed", err);
        } finally {
            setLoadingEvent(null);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!user) return; // prevent null crashes

        try {
            setLoadingEvent(eventId); // show spinner
            await axios.delete(`${API_URL}/api/events/${eventId}`, {
                data: { userId: user.id }, // send userId in body
            });
            // remove the deleted event locally
            setEvents((prev) => prev.filter((ev) => ev._id !== eventId));
        } catch (err) {
            console.error("Failed to delete event", err);
        } finally {
            setLoadingEvent(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" />
                <Text>Loading events...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text variant="headlineMedium" style={styles.heading}>
                Upcoming Events
            </Text>

            {events.length === 0 ? (
                <Text style={styles.empty}>No events available</Text>
            ) : (
                events.map((ev) => (
                    <Card
                        key={String(ev._id)}
                        style={styles.card}
                    >
                        <Card.Title
                            title={
                                <View style={{ flexDirection: 'column' }}>
                                    <Text>{ev.title}</Text>
                                    <Text style={{ fontSize: 12 }}>
                                        {dayjs(ev.start).format("MMM D, YYYY • HH:mm")} (
                                        {dayjs(ev.end).diff(dayjs(ev.start), 'hour')}h{' '}
                                        {dayjs(ev.end).diff(dayjs(ev.start), 'minute') % 60}m)
                                    </Text>
                                </View>
                            }
                            left={(props) => <IconButton {...props} icon="calendar" />}
                        />
                        <Card.Content>
                            <Text style={styles.venue}>
                                📍 {ev.venue?.name || "Unknown Venue"}
                            </Text>
                        </Card.Content>
                        <Card.Actions
                            style={{
                                flexDirection: "column",
                                gap: 8,
                                paddingHorizontal: 0,
                                paddingVertical: 8,
                            }}
                        >
                            <Button
                                icon="map-marker"
                                mode="contained"
                                style={{ width: "90%" }}
                                onPress={() => {
                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${ev.venue?.lat},${ev.venue?.lng}`;
                                    Linking.openURL(url);
                                }}
                            >
                                Navigate
                            </Button>

                            <Button
                                mode="contained"
                                style={{ width: "90%" }}
                                onPress={() => 
                                    navigation.navigate("EventDetail", { id: ev._id })
                                }
                            >
                                View
                            </Button>

                            <Button
                                icon="calendar-plus"
                                mode="contained"
                                style={{ width: "90%" }}
                                onPress={() => addToCalendar(ev)}
                            >
                                Add to Calendar
                            </Button>

                            {user?.role === "participant" && (
                                <Button
                                    mode={
                                        ev.participantIds?.includes(user.id)
                                            ? "outlined"
                                            : "contained"
                                    }
                                    style={{ width: "90%" }}
                                    loading={loadingEvent === ev._id}
                                    disabled={loadingEvent === ev._id}
                                    onPress={() =>
                                        handleParticipate(
                                            ev._id,
                                            ev.participantIds?.includes(user.id)
                                        )
                                    }
                                >
                                    {ev.participantIds?.includes(user.id)
                                        ? "Cancel Participation"
                                        : "Participate"}
                                </Button>

                            )}

                            {/* Delete button for organizers only */}
                            {user?.role === "organizer" && ev.organizerIds?.includes(user.id) && (
                                <Button
                                    icon="delete"
                                    mode="contained"
                                    style={{ width: "90%", backgroundColor: "#e53935" }}
                                    loading={loadingEvent === ev._id}
                                    disabled={loadingEvent === ev._id}
                                    onPress={() => handleDeleteEvent(ev._id)}
                                >
                                    Delete Event
                                </Button>
                            )}
                        </Card.Actions>

                    </Card>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 16,
    },
    heading: {
        marginBottom: 12,
        fontWeight: "bold",
        color: "#333",
    },
    card: {
        borderRadius: 12,
        elevation: 3,
    },
    venue: {
        marginTop: 4,
        fontSize: 14,
    },
    empty: {
        marginTop: 20,
        textAlign: "center",
        color: "#888",
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
    },
});
