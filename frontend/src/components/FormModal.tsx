import React from "react";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "./AppButton";
import { useAppTheme } from "../theme/useAppTheme";

interface FormModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

export default function FormModal({
  visible,
  title,
  subtitle,
  closeLabel,
  onClose,
  children
}: FormModalProps) {
  const { colors, spacing } = useAppTheme();
  const styles = createStyles(colors, spacing);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboard}
        >
          <View style={styles.panel}>
            <View style={styles.header}>
              <View style={styles.titleWrap}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              <AppButton title={closeLabel} variant="secondary" onPress={onClose} />
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.appBackground
    },
    keyboard: {
      flex: 1,
      width: "100%"
    },
    panel: {
      flex: 1,
      width: "100%",
      maxWidth: Platform.OS === "web" ? 720 : undefined,
      alignSelf: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.md,
      paddingBottom: spacing.md
    },
    titleWrap: {
      flex: 1,
      gap: spacing.xs
    },
    title: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "800"
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18
    },
    body: {
      flex: 1
    },
    bodyContent: {
      gap: spacing.md,
      paddingBottom: spacing.xl + 32
    }
  });
}
