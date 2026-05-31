import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import AppButton from "../components/AppButton";
import { getDashboardToday } from "../api/dashboard.api";
import type { DashboardTodayResponse } from "../types/dashboard";
import { getErrorMessage } from "../types/api";
import { useAppTheme } from "../theme/useAppTheme";
import { useTranslation } from "../i18n";

interface MetricCardProps {
  label: string;
  value: number;
  helper?: string;
}

function MetricCard({ label, value, helper }: MetricCardProps) {
  const { colors, spacing } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        {label ? (
          <View style={styles.metricAccent}>
            <Text style={styles.metricAccentText}>⚡</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
    </View>
  );
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const [data, setData] = useState<DashboardTodayResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard(isRefresh = false): Promise<void> {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await getDashboardToday();
      setData(response);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View style={styles.zapBadge}>
          <Text style={styles.zapText}>⚡</Text>
        </View>
        <Text style={styles.title}>{t("dashboard.title")}</Text>
      </View>
      <Text style={styles.subtitle}>{t("dashboard.subtitle")}</Text>
      <AppButton
        title={refreshing ? t("common.loading") : t("common.refresh")}
        variant="secondary"
        onPress={() => void loadDashboard(true)}
        loading={refreshing}
      />

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>
          <AppButton title={t("common.retry")} onPress={() => void loadDashboard()} variant="secondary" />
        </View>
      ) : null}

      {loading && !data ? <Text style={styles.muted}>{t("common.loading")}</Text> : null}

      {data ? (
        <>
          <View style={styles.grid}>
            <View style={[styles.metricGrid, isWide && styles.metricGridWide]}>
              <View style={[styles.metricGridItem, isWide && styles.metricGridItemWide]}>
                <MetricCard
                  label={t("dashboard.tasksToday")}
                  value={data.tasks.total}
                  helper={t("dashboard.completedCount", { count: data.tasks.completed })}
                />
              </View>
              <View style={[styles.metricGridItem, isWide && styles.metricGridItemWide]}>
                <MetricCard
                  label={t("dashboard.habitsToday")}
                  value={data.habits.total}
                  helper={t("dashboard.completedCount", { count: data.habits.completed })}
                />
              </View>
              <View style={[styles.metricGridItem, isWide && styles.metricGridItemWide]}>
                <MetricCard
                  label={t("dashboard.currentStreak")}
                  value={data.current_streak}
                  helper={t("dashboard.bestActiveRun")}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("dashboard.tasksSection")}</Text>
            {data.tasks.items.length === 0 ? (
              <Text style={styles.muted}>{t("dashboard.noTasksToday")}</Text>
            ) : (
              data.tasks.items.map((task) => (
                <View key={task.task_id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{task.title}</Text>
                  <Text
                    style={[
                      styles.itemChip,
                      task.status === "completed" ? styles.blueChip : styles.neutralChip
                    ]}
                  >
                    {task.status === "completed" ? t("common.completed") : t("common.pending")}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("dashboard.habitsSection")}</Text>
            {data.habits.items.length === 0 ? (
              <Text style={styles.muted}>{t("dashboard.noHabitsToday")}</Text>
            ) : (
              data.habits.items.map((habit) => (
                <View key={habit.habit_id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{habit.title}</Text>
                  <Text
                    style={[
                      styles.itemChip,
                      habit.completed_today ? styles.yellowChip : styles.neutralChip
                    ]}
                  >
                    {habit.completed_today ? t("dashboard.completedToday") : t("common.pending")}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    title: {
      fontSize: 30,
      fontWeight: "700",
      color: colors.textPrimary
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    zapBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.zapYellowSoft,
      borderWidth: 1,
      borderColor: colors.zapYellow
    },
    zapText: {
      color: colors.primaryBlueDark,
      fontSize: 15,
      fontWeight: "800"
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: spacing.xs
    },
    grid: {
      gap: spacing.md
    },
    metricGrid: {
      gap: spacing.md
    },
    metricGridWide: {
      flexDirection: "row",
      alignItems: "stretch"
    },
    metricGridItem: {
      width: "100%"
    },
    metricGridItemWide: {
      flex: 1
    },
    metricCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.xs,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1
    },
    metricHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    metricAccent: {
      backgroundColor: colors.zapYellowSoft,
      borderWidth: 1,
      borderColor: colors.zapYellow,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4
    },
    metricAccentText: {
      color: colors.primaryBlueDark,
      fontWeight: "800"
    },
    metricValue: {
      fontSize: 30,
      fontWeight: "700",
      color: colors.primaryBlueDark
    },
    metricLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary
    },
    metricHelper: {
      fontSize: 13,
      color: colors.textSecondary
    },
    section: {
      gap: spacing.sm
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary
    },
    itemCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary
    },
    itemChip: {
      alignSelf: "flex-start",
      fontSize: 12,
      fontWeight: "700",
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      overflow: "hidden"
    },
    blueChip: {
      color: colors.primaryBlueDark,
      backgroundColor: colors.primaryBlueUltraSoft
    },
    yellowChip: {
      color: colors.primaryBlueDark,
      backgroundColor: colors.zapYellowSoft
    },
    neutralChip: {
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted
    },
    muted: {
      color: colors.textSecondary,
      fontSize: 14
    },
    messageCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md
    },
    errorText: {
      color: colors.danger,
      fontSize: 14
    }
  });
}
