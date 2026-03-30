import { getWeekStart, toDateInputValue } from "./dateTime";

export function createSamplePayload() {
  return {
    commitments: [],
    tasks: [],
    sleep_window: { start: 23, end: 7 },
    preferences: {
      max_daily_hours: 8,
      preferred_study_start: 7,
      preferred_study_end: 22,
      slot_step: 0.5,
      buffer_hours: 1,
      weekly_hours_threshold: 50,
      late_night_cutoff: 23,
      max_consecutive_blocks: 3,
      min_breaks_per_day: 1,
      deadline_cluster_days: 2,
    },
  };
}

export function createInitialCommitment(weekStart) {
  return {
    title: "",
    commitment_date: toDateInputValue(weekStart),
    start: "09:00",
    end: "10:30",
    category: "class",
  };
}

export function createInitialTask(weekStart) {
  return {
    title: "",
    duration: 1,
    deadline_day: "Mon",
    deadline_date: toDateInputValue(weekStart),
    deadline_time: "23:59",
    is_locked: false,
    scheduled_date: toDateInputValue(weekStart),
    scheduled_start_time: "09:00",
    scheduled_end_time: "10:00",
  };
}
