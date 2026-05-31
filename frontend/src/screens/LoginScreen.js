import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export default function LoginScreen({ navigation }) {
  const { login, isAuthLoading } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");

  async function handleLogin() {
    try {
      setError("");
      await login(form);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>TimeZap</Text>
          <Text style={styles.subtitle}>A clean task and habit management workspace.</Text>
        </View>

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
          <AppButton title="Login" onPress={handleLogin} loading={isAuthLoading} />
          <AppButton
            title="Create account"
            variant="secondary"
            onPress={() => navigation.navigate("Register")}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.xl,
    backgroundColor: colors.background
  },
  hero: {
    gap: spacing.sm
  },
  title: {
    fontSize: 38,
    fontWeight: "700",
    color: colors.text
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24
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
