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
          <View style={styles.brandRow}>
            <View style={styles.zapBadge}>
              <Text style={styles.zapText}>⚡</Text>
            </View>
            <Text style={styles.eyebrow}>Focused productivity</Text>
          </View>
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
    backgroundColor: colors.appBackground
  },
  hero: {
    gap: spacing.sm
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  zapBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.zapYellowSoft,
    borderWidth: 1,
    borderColor: colors.zapYellow
  },
  zapText: {
    color: colors.primaryBlueDark,
    fontSize: 14,
    fontWeight: "800"
  },
  eyebrow: {
    fontSize: 13,
    color: colors.primaryBlue,
    fontWeight: "700"
  },
  title: {
    fontSize: 38,
    fontWeight: "700",
    color: colors.textPrimary
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24
  },
  form: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  error: {
    color: colors.danger,
    fontSize: 14
  }
});
