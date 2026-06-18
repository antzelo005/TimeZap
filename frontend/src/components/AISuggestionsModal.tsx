import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { generateAISuggestions } from "../api/ai.api";
import { createHabit } from "../api/habits.api";
import { createTask } from "../api/tasks.api";
import AppButton from "./AppButton";
import AppInput from "./AppInput";
import FormModal from "./FormModal";
import { IconBadge } from "./IconColorPicker";
import { normalizeTimeZapIconName } from "./icons";
import { useTranslation } from "../i18n";
import { notifyDashboardChanged } from "../services/appEvents";
import { useAppTheme } from "../theme/useAppTheme";
import { getErrorMessage } from "../types/api";
import type {
  AISuggestedHabit,
  AISuggestedTask,
  AISuggestionFocus,
  AISuggestionLanguage,
  AISuggestions
} from "../types/ai";
import type { CreateHabitPayload } from "../types/habit";
import type { CreateTaskPayload } from "../types/task";
import { createLocalDate, formatLocalDate } from "../utils/date";

interface AISuggestionsModalProps {
  visible: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

const FOCUS_OPTIONS: AISuggestionFocus[] = ["general", "study", "work", "health", "personal"];
const LANGUAGE_OPTIONS: AISuggestionLanguage[] = ["en", "el", "ro"];

function getToday(): string {
  return formatLocalDate(new Date());
}

function getTomorrow(): string {
  const now = new Date();
  return formatLocalDate(createLocalDate(now.getFullYear(), now.getMonth(), now.getDate() + 1));
}

function mapDateHint(dateHint: AISuggestedTask["date_hint"]): string | null {
  if (dateHint === "today" || dateHint === "this_week") {
    return getToday();
  }

  if (dateHint === "tomorrow") {
    return getTomorrow();
  }

  return null;
}

function buildTaskDescription(
  task: AISuggestedTask,
  t: (key: "ai.estimatedDuration" | "ai.priorityLabel", variables?: Record<string, string | number>) => string
): string {
  return [
    task.description,
    t("ai.estimatedDuration", { count: task.estimated_duration_minutes }),
    t("ai.priorityLabel", { value: task.priority })
  ]
    .filter(Boolean)
    .join("\n");
}

function mapTaskPayload(
  task: AISuggestedTask,
  t: (key: "ai.estimatedDuration" | "ai.priorityLabel", variables?: Record<string, string | number>) => string
): CreateTaskPayload {
  const dueDate = mapDateHint(task.date_hint);

  return {
    title: task.title,
    description: buildTaskDescription(task, t),
    due_date: dueDate,
    end_date: null,
    due_time: null,
    start_time: null,
    end_time: null,
    is_all_day: true,
    reminder_enabled: false,
    emoji: normalizeTimeZapIconName(task.icon, "task"),
    color: task.color
  };
}

function mapHabitPayload(habit: AISuggestedHabit): CreateHabitPayload {
  const recurrenceType = habit.recurrence_type;
  const isWeeklyTarget = recurrenceType === "x_times_per_week";
  const targetCount = isWeeklyTarget ? Math.max(1, Math.min(7, Math.round(habit.target_count))) : 1;
  const targetPeriod = isWeeklyTarget ? "week" : "day";

  return {
    title: habit.title,
    description: habit.description || null,
    start_date: getToday(),
    end_date: null,
    start_time: "09:00",
    end_time: "10:00",
    reminder_enabled: false,
    reminder_time: null,
    status: "active",
    emoji: normalizeTimeZapIconName(habit.icon, "habit"),
    color: habit.color,
    rule: {
      recurrence_type: recurrenceType,
      interval_value: 1,
      target_count: targetCount,
      target_period: targetPeriod,
      week_start: "monday",
      days:
        recurrenceType === "specific_weekdays"
          ? [1, 2, 3, 4, 5].map((day) => ({
              day_of_week: day,
              day_of_month: null
            }))
          : []
    }
  };
}

export default function AISuggestionsModal({ visible, onClose, onAdded }: AISuggestionsModalProps) {
  const { colors, spacing } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const defaultLanguage: AISuggestionLanguage = language === "el" || language === "ro" ? language : "en";
  const [prompt, setPrompt] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<AISuggestionLanguage>(defaultLanguage);
  const [focus, setFocus] = useState<AISuggestionFocus>("general");
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>("");

  function resetGeneratedState(): void {
    setSuggestions(null);
    setAddedKeys({});
    setError("");
  }

  function handleClose(): void {
    setPrompt("");
    setFocus("general");
    setSelectedLanguage(defaultLanguage);
    setSuggestions(null);
    setAddedKeys({});
    setError("");
    onClose();
  }

  function getFriendlyError(err: unknown): string {
    const message = getErrorMessage(err);

    if (message === "AI suggestions are not configured") {
      return t("ai.notConfigured");
    }

    if (message === "No suggestions returned") {
      return t("ai.noSuggestions");
    }

    return message || t("ai.generateError");
  }

  async function handleGenerate(): Promise<void> {
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt) {
      setError(t("ai.promptRequired"));
      return;
    }

    try {
      setLoading(true);
      setError("");
      setAddedKeys({});
      const response = await generateAISuggestions({
        prompt: cleanPrompt,
        language: selectedLanguage,
        focus
      });
      setSuggestions(response.suggestions);
      if ((response.suggestions.tasks.length ?? 0) === 0 && (response.suggestions.habits.length ?? 0) === 0) {
        setError(t("ai.noSuggestions"));
      }
    } catch (err: unknown) {
      setSuggestions(null);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function addTaskSuggestion(task: AISuggestedTask, index: number): Promise<void> {
    const key = `task-${index}`;

    try {
      setAddingKey(key);
      setError("");
      await createTask(mapTaskPayload(task, t));
      setAddedKeys((current) => ({ ...current, [key]: true }));
      notifyDashboardChanged();
      onAdded?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setAddingKey(null);
    }
  }

  async function addHabitSuggestion(habit: AISuggestedHabit, index: number): Promise<void> {
    const key = `habit-${index}`;

    try {
      setAddingKey(key);
      setError("");
      await createHabit(mapHabitPayload(habit));
      setAddedKeys((current) => ({ ...current, [key]: true }));
      notifyDashboardChanged();
      onAdded?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setAddingKey(null);
    }
  }

  function renderOption<T extends string>(value: T, label: string, active: boolean, onPress: () => void) {
    return (
      <Pressable
        key={value}
        onPress={onPress}
        style={({ pressed }) => [
          styles.optionChip,
          active ? styles.optionChipActive : null,
          pressed ? styles.optionChipPressed : null
        ]}
      >
        <Text style={[styles.optionChipText, active ? styles.optionChipTextActive : null]}>{label}</Text>
      </Pressable>
    );
  }

  function renderTask(task: AISuggestedTask, index: number) {
    const key = `task-${index}`;
    const added = Boolean(addedKeys[key]);

    return (
      <View key={key} style={styles.suggestionCard}>
        <View style={styles.suggestionHeader}>
          <IconBadge iconId={task.icon} color={task.color} fallbackIcon="task" />
          <View style={styles.suggestionCopy}>
            <Text style={styles.suggestionTitle}>{task.title}</Text>
            {task.description ? <Text style={styles.suggestionDescription}>{task.description}</Text> : null}
            <Text style={styles.suggestionMeta}>
              {task.date_hint} / {task.priority} / {task.estimated_duration_minutes} min
            </Text>
          </View>
        </View>
        <AppButton
          title={added ? t("ai.added") : t("ai.addTask")}
          onPress={() => void addTaskSuggestion(task, index)}
          loading={addingKey === key}
          disabled={added || Boolean(addingKey)}
          variant="secondary"
        />
      </View>
    );
  }

  function renderHabit(habit: AISuggestedHabit, index: number) {
    const key = `habit-${index}`;
    const added = Boolean(addedKeys[key]);

    return (
      <View key={key} style={styles.suggestionCard}>
        <View style={styles.suggestionHeader}>
          <IconBadge iconId={habit.icon} color={habit.color} fallbackIcon="habit" />
          <View style={styles.suggestionCopy}>
            <Text style={styles.suggestionTitle}>{habit.title}</Text>
            {habit.description ? <Text style={styles.suggestionDescription}>{habit.description}</Text> : null}
            <Text style={styles.suggestionMeta}>
              {habit.recurrence_type} / {habit.target_count}/{habit.target_period}
            </Text>
          </View>
        </View>
        <AppButton
          title={added ? t("ai.added") : t("ai.addHabit")}
          onPress={() => void addHabitSuggestion(habit, index)}
          loading={addingKey === key}
          disabled={added || Boolean(addingKey)}
          variant="accent"
        />
      </View>
    );
  }

  return (
    <FormModal
      visible={visible}
      title={t("ai.title")}
      subtitle={t("ai.disclaimer")}
      closeLabel={t("common.close")}
      onClose={handleClose}
    >
      <AppInput
        label={t("ai.promptLabel")}
        value={prompt}
        onChangeText={(value) => {
          setPrompt(value);
          resetGeneratedState();
        }}
        placeholder={t("ai.promptPlaceholder")}
        multiline
        numberOfLines={5}
        maxLength={1000}
        style={styles.promptInput}
      />

      <View style={styles.optionBlock}>
        <Text style={styles.optionLabel}>{t("ai.language")}</Text>
        <View style={styles.optionRow}>
          {LANGUAGE_OPTIONS.map((option) =>
            renderOption(option, t(`account.language.${option}`), selectedLanguage === option, () => {
              setSelectedLanguage(option);
              resetGeneratedState();
            })
          )}
        </View>
      </View>

      <View style={styles.optionBlock}>
        <Text style={styles.optionLabel}>{t("ai.focus")}</Text>
        <View style={styles.optionRow}>
          {FOCUS_OPTIONS.map((option) =>
            renderOption(option, t(`ai.focus.${option}`), focus === option, () => {
              setFocus(option);
              resetGeneratedState();
            })
          )}
        </View>
      </View>

      <AppButton
        title={t("ai.generate")}
        onPress={() => void handleGenerate()}
        loading={loading}
        disabled={addingKey !== null}
      />

      {error ? (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {suggestions?.notes ? <Text style={styles.notes}>{suggestions.notes}</Text> : null}

      {suggestions ? (
        <View style={styles.results}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("ai.suggestedTasks")}</Text>
            {suggestions.tasks.length === 0 ? (
              <Text style={styles.emptyText}>{t("ai.noSuggestions")}</Text>
            ) : (
              suggestions.tasks.map(renderTask)
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("ai.suggestedHabits")}</Text>
            {suggestions.habits.length === 0 ? (
              <Text style={styles.emptyText}>{t("ai.noSuggestions")}</Text>
            ) : (
              suggestions.habits.map(renderHabit)
            )}
          </View>
        </View>
      ) : null}
    </FormModal>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    promptInput: {
      minHeight: 120,
      textAlignVertical: "top"
    },
    optionBlock: {
      gap: spacing.xs
    },
    optionLabel: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "700"
    },
    optionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    optionChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: 9
    },
    optionChipActive: {
      borderColor: colors.primaryBlue,
      backgroundColor: colors.primaryBlueUltraSoft
    },
    optionChipPressed: {
      opacity: 0.78
    },
    optionChipText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700"
    },
    optionChipTextActive: {
      color: colors.primaryBlueDark
    },
    messageBox: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerSoft,
      padding: spacing.md
    },
    errorText: {
      color: colors.danger,
      fontSize: 14
    },
    notes: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20
    },
    results: {
      gap: spacing.lg
    },
    section: {
      gap: spacing.sm
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: "800"
    },
    suggestionCard: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.md,
      gap: spacing.md
    },
    suggestionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md
    },
    suggestionCopy: {
      flex: 1,
      gap: spacing.xs
    },
    suggestionTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "800"
    },
    suggestionDescription: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20
    },
    suggestionMeta: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700"
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 14
    }
  });
}
