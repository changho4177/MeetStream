import API_URL from "@/config";
import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";  // 👈 install this if not yet
import { useAuth } from "./src/utils/context/AuthContext";

const Login = () => {
    const { login } = useAuth();
    const [mode, setMode] = useState<"login" | "register">("login");
    const [name, setName] = useState("");
    const [role, setRole] = useState<"participant" | "organizer">("participant");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_URL}/api/auth/${mode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body:
                    mode === "login"
                        ? JSON.stringify({ email, password })
                        : JSON.stringify({ name, role, email, password }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Something went wrong");

            console.log(`✅ ${mode} successful:`, data);

            // Save auth state
            await login(data.user, data.token);

            // Navigate to home
            router.replace("/Home");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Title title={mode === "login" ? "Login" : "Register"} />
                <Card.Content>
                    {mode === "register" && (
                        <>
                            <TextInput
                                label="Name"
                                value={name}
                                onChangeText={setName}
                                mode="outlined"
                                style={styles.input}
                            />
                            <Text style={styles.label}>Role</Text>
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={role}
                                    onValueChange={(val) => setRole(val)}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Participant" value="participant" />
                                    <Picker.Item label="Organizer" value="organizer" />
                                </Picker>
                            </View>
                        </>
                    )}
                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                    />
                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        mode="outlined"
                        style={styles.input}
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.button}
                    >
                        {mode === "login" ? "Login" : "Register"}
                    </Button>
                    <Button
                        mode="text"
                        onPress={() =>
                            setMode(mode === "login" ? "register" : "login")
                        }
                        style={styles.button}
                    >
                        {mode === "login"
                            ? "Don't have an account? Register"
                            : "Already have an account? Login"}
                    </Button>
                </Card.Content>
            </Card>
        </View>
    );
};

export default Login;

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", padding: 20 },
    card: { padding: 20 },
    input: { marginBottom: 10 },
    button: { marginTop: 10 },
    error: { color: "red", marginBottom: 10 },
    label: { marginBottom: 4, fontWeight: "bold" },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 4,
        marginBottom: 10,
    },
    picker: {
        height: 50,
        width: "100%",
    },
});
