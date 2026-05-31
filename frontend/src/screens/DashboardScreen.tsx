import React, { useEffect, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import AppButton from "../components/AppButton";
import { getDashboardToday } from "../api/dashboard.api";
import colors from "../theme/colors";
import spacing from "../theme/spacing";
import type { DashboardTodayResponse } from "../types/dashboard";
import { getErrorMessage } from "../types/api";

interface MetricCardProps {
  label: string;
  value: number;
  helper?: string;
}

function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        {label === "Current Streak" ? (
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
        <Text style={styles.title}>Today</Text>
      </View>
      <Text style={styles.subtitle}>A compact view of current workload and consistency.</Text>
      <AppButton
        title={refreshing ? "Refreshing..." : "Refresh"}
        variant="secondary"
        onPress={() => void loadDashboard(true)}
        loading={refreshing}
      />

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>
          <AppButton title="Retry" onPress={() => void loadDashboard()} variant="secondary" />
        </View>
      ) : null}

      {loading && !data ? <Text style={styles.muted}>Loading dashboard...</Text> : null}

      {data ? (
        <>
          <View style={styles.grid}>
            <View style={[styles.metricGrid, isWide && styles.metricGridWide]}>
              <View style={[styles.metricGridItem, isWide && styles.metricGridItemWide]}>
                <MetricCard
                  label="Tasks Today"
                  value={data.tasks.total}
                  helper={`${data.tasks.completed} completed`}
                />
              </View>
              <View style={[styles.metricGridItem, isWide && styles.metricGridItemWide]}>
                <MetricCard
                  label="Habits Today"
                  value={data.habits.total}
                  helper={`${data.habits.completed} completed`}
                />
              </View>
              <View style={[styles.metricGridItem, isWide && styles.metricGridItemWide]}>
                <MetricCard label="Current Streak" value={data.current_streak} helper="Best active run" />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            {data.tasks.items.length === 0 ? (
              <Text style={styles.muted}>No tasks due today.</Text>
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
                    {task.status}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Habits</Text>
            {data.habits.items.length === 0 ? (
              <Text style={styles.muted}>No habits scheduled today.</Text>
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
                    {habit.completed_today ? "Completed today" : "Pending"}
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

const styles = StyleSheet.create({
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
    shadowColor: "#0F172A",
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
