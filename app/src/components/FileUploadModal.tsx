// FileUploadModal.tsx
import React, { useState } from "react";
import { View } from "react-native";
import { Modal, Portal, Button, Text, ActivityIndicator } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import API_URL from "@/config";

export interface FileUploadModalProps {
    visible: boolean;
    onDismiss: () => void;   // 👈 add this
    eventId: string;
    userId: string;
    onUploaded: () => void;
}

export default function FileUploadModal({
    visible,
    onDismiss,
    eventId,
    userId,
    onUploaded,
}: FileUploadModalProps) {
    const [uploading, setUploading] = useState(false);

    const pickFile = async () => {
        const res = await DocumentPicker.getDocumentAsync({ type: "*/*" });
        if (res.canceled) return;

        const file = res.assets[0]; // fixed type
        const formData = new FormData();
        formData.append("file", {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || "application/octet-stream",
        } as any);
        formData.append("userId", userId);

        try {
            setUploading(true);
            await axios.post(`${API_URL}/api/files/upload/${eventId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            onUploaded();
            onDismiss(); // 👈 close after upload
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={{ backgroundColor: "white", padding: 20, margin: 20, borderRadius: 8 }}>
                {uploading ? (
                    <ActivityIndicator />
                ) : (
                    <View>
                        <Text style={{ marginBottom: 12 }}>Upload a file</Text>
                        <Button mode="contained" onPress={pickFile}>
                            Choose File
                        </Button>
                        <Button style={{ marginTop: 12 }} onPress={onDismiss}>
                            Cancel
                        </Button>
                    </View>
                )}
            </Modal>
        </Portal>
    );
}
