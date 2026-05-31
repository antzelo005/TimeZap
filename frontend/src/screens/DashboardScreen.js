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
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
      <Text style={styles.title}>Today</Text>
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
                  <Text style={styles.itemMeta}>{task.status}</Text>
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
                  <Text style={styles.itemMeta}>
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
    color: colors.text
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.sm
  },
  grid: {
    gap: spacing.md
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs
  },
  metricValue: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text
  },
  metricHelper: {
    fontSize: 13,
    color: colors.textMuted
  },
  section: {
    gap: spacing.sm
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text
  },
  itemMeta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs
  },
  muted: {
    color: colors.textMuted,
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
