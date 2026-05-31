import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export default function RegisterScreen() {
  const { register, isAuthLoading } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");

  async function handleRegister() {
    try {
      setError("");
      await register(form);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Register with the existing TimeZap backend.</Text>
        <View style={styles.form}>
          <AppInput
            label="Email"
            value={form.email}
            onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="test@timezap.com"
          />
          <AppInput
            label="Password"
            value={form.password}
            onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
            placeholder="123456"
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton title="Register" onPress={handleRegister} loading={isAuthLoading} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.text
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted
  },
  form: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border
  },
  error: {
    color: colors.danger,
    fontSize: 14
  }
});
