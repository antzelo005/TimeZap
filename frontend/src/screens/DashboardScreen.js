import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import AppButton from "../components/AppButton";
import { getDashboardToday } from "../api/dashboard.api";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

function MetricCard({ label, value, helper }) {
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
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard(isRefresh = false) {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await getDashboardToday();
      setData(response);
    } catch (err) {
      setError(err.message);
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
        onPress={() => loadDashboard(true)}
        loading={refreshing}
      />

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>
          <AppButton title="Retry" onPress={() => loadDashboard()} variant="secondary" />
        </View>
      ) : null}

      {loading && !data ? <Text style={styles.muted}>Loading dashboard...</Text> : null}

      {data ? (
        <>
          <View style={styles.grid}>
            <MetricCard label="Tasks Today" value={data.tasks.total} helper={`${data.tasks.completed} completed`} />
            <MetricCard label="Habits Today" value={data.habits.total} helper={`${data.habits.completed} completed`} />
            <MetricCard label="Current Streak" value={data.current_streak} helper="Best active run" />
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
    marginBottom: spacing.sm
  },
  grid: {
    gap: spacing.md
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.lg,
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
    fontSize: 34,
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
  itemMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs
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
