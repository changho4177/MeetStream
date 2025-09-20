// src/screens/EventDetail.tsx
import API_URL from "@/config";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import dayjs from "dayjs";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Linking, ScrollView, View } from "react-native";
import MapView, { Marker } from 'react-native-maps';
import { Appbar, Button, Card, Dialog, Divider, FAB, IconButton, Portal, Text, TextInput, } from "react-native-paper";
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import io from "socket.io-client";
import FileUploadModal from "../app/src/components/FileUploadModal";
import { useAuth } from "../app/src/utils/context/AuthContext";

const socket = io(API_URL);

export default function EventDetail() {
    const route = useRoute();
    const { id } = route.params as { id: string };
    const [tab, setTab] = useState<"chat" | "announcements" | "files" | "availability">("chat");
    const [msgs, setMsgs] = useState<any[]>([]);
    const [organizerIds, setOrganizerIds] = useState<string[]>([]);
    const { user } = useAuth();

    console.log("EventDetail params:", id);
    // Join/leave event room
    useEffect(() => {
        () => {
            if (!id) return;
            socket.emit("join_event", id);
            return () => socket.emit("leave_event", id);
        }
    }, [id]);

    // Load chat + subscribe
    useEffect(() => {
        () => {
            if (!id) return;

            (async () => {
                try {
                    const { data } = await axios.get(`${API_URL}/api/chat/${id}`);
                    setMsgs(data);
                } catch (err) {
                    console.error("Failed to load chat", err);
                }
            })();

            const onMsg = (m: any) => setMsgs((prev) => [...prev, m]);
            socket.on("message", onMsg);
            return () => socket.off("message", onMsg);
        }
    }, [id]);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/events/${id}`);
                // Assuming data.organizers is an array of { _id, name }
                setOrganizerIds(data.organizerIds.map((o: any) => o._id));
            } catch (err) {
                console.error("Failed to load event organizers", err);
            }
        })();
    }, [id]);

    return (
        <View style={{ flex: 1 }}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Event" />
                <Appbar.Action icon="chat" onPress={() => setTab("chat")} />
                <Appbar.Action icon="bullhorn" onPress={() => setTab("announcements")} />
                <Appbar.Action icon="paperclip" onPress={() => setTab("files")} />
                <Appbar.Action icon="calendar" onPress={() => setTab("availability")} />
            </Appbar.Header>

            {tab === "chat" && <Chat eventId={id!} user={user} />}
            {tab === "announcements" && <Announcements eventId={id!} user={user} />}
            {tab === "files" && <Files eventId={id!} userId={user.id} />}
            {tab === "availability" && <Availability organizerIds={organizerIds} />}
        </View>
    );
}

function Announcements({ eventId, user }: { eventId: string; user: any }) {
    const [list, setList] = useState<any[]>([]);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [text, setText] = useState("");

    // Fetch announcements
    const fetchAnnouncements = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/announcements/${eventId}`);
            setList(data);
        } catch (err) {
            console.error("Failed to fetch announcements", err);
        }
    };

    useEffect(() => {
        fetchAnnouncements();

        // ✅ Listen for announcement created
        const onAnnounce = (a: any) => {
            setList((prev) => [a, ...prev]);
        };

        // ✅ Listen for announcement deleted
        const onAnnounceDeleted = ({ id }: { id: string }) => {
            setList((prev) => prev.filter((a) => a._id !== id));
        };

        socket.on("announcement", onAnnounce);
        socket.on("announcement_deleted", onAnnounceDeleted);

        return () => {
            socket.off("announcement", onAnnounce);
            socket.off("announcement_deleted", onAnnounceDeleted);
        };
    }, [eventId]);

    const addAnnouncement = async () => {
        if (!text.trim()) return;
        try {
            await axios.post(`${API_URL}/api/announcements`, {
                eventId,
                text,
                createdBy: user._id,
            });
            setText("");
            setDialogVisible(false);
            // refresh to ensure sync
            fetchAnnouncements();
        } catch (err) {
            console.error("Failed to add announcement", err);
        }
    };

    const deleteAnnouncement = async (id: string) => {
        Alert.alert("Confirm", "Delete this announcement?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await axios.delete(`${API_URL}/api/announcements/${id}`, {
                            params: { userId: user.id }, // ✅ use query param style
                        });
                        // also remove locally in case socket delay
                        setList((prev) => prev.filter((a) => a._id !== id));
                    } catch (err) {
                        console.error("Failed to delete announcement", err);
                    }
                },
            },
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <Card style={{ marginBottom: 12 }}>
            <Card.Title
                title={item.text}
                subtitle={`${item.createdBy?.name || "Unknown"} • ${dayjs(
                    item.createdAt
                ).format("MMM D, HH:mm")}`}
                right={(props) =>
                    (user.role === "organizer" || item.createdBy?._id === user.id) && (
                        <IconButton
                            {...props}
                            icon="delete"
                            iconColor="red"
                            onPress={() => deleteAnnouncement(item._id)}
                        />
                    )
                }
            />
        </Card>
    );

    return (
        <View style={{ flex: 1, padding: 16 }}>
            {list.length === 0 ? (
                <Text>No announcements yet</Text>
            ) : (
                <FlatList
                    data={list}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    ItemSeparatorComponent={Divider}
                />
            )}

            {user.role === "organizer" && (
                <>
                    <FAB
                        icon="plus"
                        label="Add"
                        style={{ position: "absolute", bottom: 24, right: 24 }}
                        onPress={() => setDialogVisible(true)}
                    />
                    <Portal>
                        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
                            <Dialog.Title>New Announcement</Dialog.Title>
                            <Dialog.Content>
                                <TextInput
                                    label="Announcement"
                                    value={text}
                                    onChangeText={setText}
                                    multiline
                                />
                            </Dialog.Content>
                            <Dialog.Actions>
                                <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
                                <Button onPress={addAnnouncement}>Post</Button>
                            </Dialog.Actions>
                        </Dialog>
                    </Portal>
                </>
            )}
        </View>
    );
}

function Files({ eventId, userId }: { eventId: string; userId: string }) {
    const { user } = useAuth();
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchFiles = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/files/${eventId}`);
            setFiles(data);
        } catch (err) {
            console.error("Failed to fetch files", err);
        }
    };

    useEffect(() => {
        fetchFiles();

        // Listen for new file uploads
        const onFileUploaded = (file: any) => {
            setFiles((prev) => [file, ...prev]);
        };

        // Listen for file deletions
        const onFileDeleted = ({ id }: { id: string }) => {
            setFiles((prev) => prev.filter((f) => f._id !== id));
        };

        socket.on("file_uploaded", onFileUploaded);
        socket.on("file_deleted", onFileDeleted);

        return () => {
            socket.off("file_uploaded", onFileUploaded);
            socket.off("file_deleted", onFileDeleted);
        };
    }, [eventId]);

    const removeFile = async (fileId: string) => {
        try {
            setLoading(true);
            await axios.delete(`${API_URL}/api/files/${eventId}/${fileId}`);
            setFiles((prev) => prev.filter((f) => f._id !== fileId)); // optimistic update
        } catch (err) {
            console.error("Failed to remove file", err);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <Card style={{ marginBottom: 12 }}>
            <Card.Title
                title={item.name}
                subtitle={`Uploaded by ${item.uploadedBy?.name || "Unknown"}`}
            />
            <Card.Actions style={{ justifyContent: "space-between" }}>
                <Button
                    icon="download"
                    mode="outlined"
                    onPress={() => Linking.openURL(`${API_URL}${item.url}`)}
                >
                    Open
                </Button>

                {(item.uploadedBy?._id === user.id || user.role === "organizer") && (
                    <IconButton
                        icon="delete"
                        iconColor="red"
                        disabled={loading}
                        onPress={() => removeFile(item._id)}
                    />
                )}
            </Card.Actions>
        </Card>
    );

    return (
        <View style={{ flex: 1, padding: 16 }}>
            {files.length === 0 ? (
                <Text>No files uploaded yet</Text>
            ) : (
                <FlatList
                    data={files}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    ItemSeparatorComponent={Divider}
                />
            )}

            <FileUploadModal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                eventId={eventId}
                userId={user._id}
                onUploaded={fetchFiles} // fallback refresh
            />

            <FAB
                icon="plus"
                label="Upload"
                style={{ position: "absolute", bottom: 24, right: 24 }}
                onPress={() => setModalVisible(true)}
            />
        </View>
    );
}

function Chat({ eventId, user }: { eventId: string; user: any }) {
    const [msgs, setMsgs] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const flatListRef = React.useRef<FlatList>(null);

    const MESSAGES_PER_PAGE = 50;

    const fetchMessages = async (p = 1) => {
        if (!eventId || (!hasMore && p !== 1)) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`${API_URL}/api/chat/${eventId}`, {
                params: { page: p, limit: MESSAGES_PER_PAGE },
            });

            if (p === 1) setMsgs(data);
            else setMsgs((prev) => [...data, ...prev]); // prepend older messages

            if (data.length < MESSAGES_PER_PAGE) setHasMore(false);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages(1);

        const onMsg = (m: any) => {
            setMsgs((prev) => [...prev, m]); // append new messages at the bottom
            flatListRef.current?.scrollToEnd({ animated: true });
        };

        socket.on("message", onMsg);

        return () => {
            socket.off("message", onMsg);
        };
    }, [eventId]);

    const loadOlderMessages = () => {
        if (loading || !hasMore) return;
        const nextPage = page + 1;
        fetchMessages(nextPage);
        setPage(nextPage);
    };

    const send = async () => {
        if (!text.trim() || !eventId) return;

        const tempId = `${Date.now()}`;

        // Optimistic update
        const optimisticMsg = {
            _id: tempId,
            eventId,
            text,
            createdAt: new Date(),
            userId: { _id: user._id, name: user.name }, // keep same shape as populated backend
        };
        setMsgs((prev) => [...prev, optimisticMsg]);
        setText("");
        flatListRef.current?.scrollToEnd({ animated: true });

        try {
            const { data } = await axios.post(`${API_URL}/api/chat`, {
                eventId,
                text,
                userId: user._id, // backend requires this
            });

            // Replace optimistic with real message
            setMsgs((prev) =>
                prev.map((m) => (m._id === tempId ? data : m))
            );
        } catch (err) {
            console.error("Failed to send message", err);
            setMsgs((prev) => prev.filter((m) => m._id !== tempId));
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        // Handle both populated and plain userId
        const sender =
            typeof item.userId === "object"
                ? item.userId.name
                : item.userId === user._id
                    ? user.name
                    : "Unknown";

        const isMe =
            (typeof item.userId === "object" ? item.userId._id : item.userId) === user._id;

        return (
            <View style={{ marginVertical: 4 }}>
                <Text style={{ fontWeight: isMe ? "bold" : "normal", color: "#333" }}>
                    {sender}: {item.text}
                </Text>
                <Text style={{ fontSize: 10, color: "#888" }}>
                    {dayjs(item.createdAt).format("HH:mm")}
                </Text>
                <Divider />
            </View>
        );
    };


    return (
        <View style={{ flex: 1, padding: 12 }}>
            <FlatList
                ref={flatListRef}
                data={msgs}
                keyExtractor={(i) => i._id}
                renderItem={renderItem}
                onEndReached={loadOlderMessages}
                onEndReachedThreshold={0.1}
                ListFooterComponent={loading ? <Text>Loading...</Text> : null}
            />
            <View
                style={{
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 8,
                    marginBottom: 8,
                }}
            >
                <TextInput
                    style={{ flex: 1 }}
                    value={text}
                    onChangeText={setText}
                    placeholder="Message…"
                />
                <Button
                    mode="contained"
                    style={{
                        alignContent: "center",
                        justifyContent: "center",
                    }}
                    onPress={send}
                >
                    Send
                </Button>
            </View>
        </View>
    );
}


interface Props {
    organizerIds: string[];
}

function Availability({ organizerIds }: Props) {
    const [start, setStart] = useState<Date>(dayjs().hour(9).minute(0).toDate());
    const [end, setEnd] = useState<Date>(dayjs().add(7, 'day').hour(18).minute(0).toDate());

    const [openStartDate, setOpenStartDate] = useState(false);
    const [openStartTime, setOpenStartTime] = useState(false);
    const [openEndDate, setOpenEndDate] = useState(false);
    const [openEndTime, setOpenEndTime] = useState(false);
    const [suggestedVenue, setSuggestedVenue] = useState<any>(null);

    const [slots, setSlots] = useState<any[]>([]);

    const compute = async () => {
        const { data } = await axios.post(`${API_URL}/api/availability/common`, {
            organizerIds,
            window: { start: start.toISOString(), end: end.toISOString() },
            slotMinutes: 30
        });
        setSlots(data.common);
    };

    const findCommonVenue = async () => {
        try {
            const { data } = await axios.post(`${API_URL}/api/events/suggest-venue`, {
                organizerIds,
            });
            setSuggestedVenue(data.suggested);
        } catch (err) {
            console.error("Failed to find common venue", err);
        }
    };

    return (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
            {/* Start Date */}
            <Button mode="outlined" onPress={() => setOpenStartDate(true)}>
                Start Date: {dayjs(start).format('YYYY-MM-DD')}
            </Button>
            <DatePickerModal
                locale="en"
                mode="single"
                visible={openStartDate}
                date={start}
                onDismiss={() => setOpenStartDate(false)}
                onConfirm={(params) => {
                    setOpenStartDate(false);
                    if (params.date) setStart(dayjs(params.date).hour(start.getHours()).minute(start.getMinutes()).toDate());
                    setOpenStartTime(true);
                }}
            />
            <TimePickerModal
                visible={openStartTime}
                onDismiss={() => setOpenStartTime(false)}
                onConfirm={({ hours, minutes }) => {
                    setOpenStartTime(false);
                    setStart(dayjs(start).hour(hours).minute(minutes).toDate());
                }}
                hours={start.getHours()}
                minutes={start.getMinutes()}
            />

            {/* End Date */}
            <Button mode="outlined" onPress={() => setOpenEndDate(true)}>
                End Date: {dayjs(end).format('YYYY-MM-DD')}
            </Button>
            <DatePickerModal
                locale="en"
                mode="single"
                visible={openEndDate}
                date={end}
                onDismiss={() => setOpenEndDate(false)}
                onConfirm={(params) => {
                    setOpenEndDate(false);
                    if (params.date) setEnd(dayjs(params.date).hour(end.getHours()).minute(end.getMinutes()).toDate());
                    setOpenEndTime(true);
                }}
            />
            <TimePickerModal
                visible={openEndTime}
                onDismiss={() => setOpenEndTime(false)}
                onConfirm={({ hours, minutes }) => {
                    setOpenEndTime(false);
                    setEnd(dayjs(end).hour(hours).minute(minutes).toDate());
                }}
                hours={end.getHours()}
                minutes={end.getMinutes()}
            />

            <Button mode="contained" onPress={compute}>Compute Common Free Time</Button>
            <Button mode="contained" onPress={findCommonVenue}>Find Common Venue</Button>

            <ScrollView style={{ flex: 1, marginTop: 8 }}>
                {slots.length === 0 ? (
                    <Text style={{ color: "#333" }}>No available slots yet</Text>
                ) : (
                    slots.map((s, i) => (
                        <Card key={i} style={{ marginVertical: 4 }}>
                            <Card.Title
                                title={`${dayjs(s.start).format('YYYY-MM-DD HH:mm')} - ${dayjs(s.end).format('YYYY-MM-DD HH:mm')}`}
                            />
                        </Card>
                    ))
                )}
                {suggestedVenue && (
                    <View style={{ height: 300, marginTop: 12 }}>
                        <Text style={{ marginBottom: 8, fontWeight: 'bold', color: '#333' }}>
                            Suggested Venue: {suggestedVenue.name}
                        </Text>
                        <MapView
                            style={{ flex: 1 }}
                            initialRegion={{
                                latitude: suggestedVenue.lat,
                                longitude: suggestedVenue.lng,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: suggestedVenue.lat,
                                    longitude: suggestedVenue.lng,
                                }}
                                title={suggestedVenue.name}
                                description={suggestedVenue.address}
                            />
                        </MapView>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}