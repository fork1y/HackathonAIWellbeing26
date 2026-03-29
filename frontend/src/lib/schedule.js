import { DAYS } from "./constants";
import { dateToDay, formatDeadline, formatHour, timeToDecimal } from "./dateTime";

export function buildApiPayload({ commitments, tasks, sleepWindow, preferences }) {
  return {
    commitments: [
      ...commitments.map(({ title, day, start, end }) => ({ title, day, start, end })),
      ...buildLockedTaskCommitments(tasks).map(({ title, day, start, end }) => ({ title, day, start, end })),
    ],
    tasks: tasks.filter((task) => !task.is_locked).map(({ title, duration, deadline_day }) => ({ title, duration, deadline_day })),
    sleep_window: sleepWindow,
    preferences,
    max_daily_hours: preferences.max_daily_hours,
    workday_start: preferences.preferred_study_start,
    workday_end: preferences.preferred_study_end,
    slot_step: preferences.slot_step,
    buffer_hours: preferences.buffer_hours,
  };
}

export function buildLockedTaskCommitments(tasks) {
  return tasks
    .filter((task) => task.is_locked)
    .map((task) => ({
      title: task.title,
      day: dateToDay(task.scheduled_date) || task.deadline_day,
      start: timeToDecimal(task.scheduled_start_time),
      end: timeToDecimal(task.scheduled_end_time),
      category: "locked-task",
      task_locked: true,
    }))
    .filter((task) => typeof task.start === "number" && typeof task.end === "number" && task.end > task.start);
}

export function buildDisplayCommitments(commitments, tasks) {
  return [...commitments, ...buildLockedTaskCommitments(tasks)];
}

export function validateScheduleInputs({ commitments, tasks }) {
  if (!commitments.length && !tasks.length) {
    return "Add at least one class, work block, or task in the currently selected week before analyzing.";
  }
  if (tasks.some((task) => !task.title?.trim())) {
    return "Every task needs a title.";
  }
  if (tasks.some((task) => task.deadline_date && !dateToDay(task.deadline_date))) {
    return "Each task needs a valid deadline date.";
  }
  if (tasks.some((task) => !task.deadline_time)) {
    return "Each task needs a deadline time.";
  }
  if (
    tasks.some(
      (task) =>
        task.is_locked &&
        (!task.scheduled_date || !task.scheduled_start_time || !task.scheduled_end_time)
    )
  ) {
    return "Each fixed task needs a scheduled date and time range.";
  }
  if (
    tasks.some((task) => {
      if (!task.is_locked) return false;
      const start = timeToDecimal(task.scheduled_start_time);
      const end = timeToDecimal(task.scheduled_end_time);
      return start === null || end === null || end <= start;
    })
  ) {
    return "Each fixed task must end after it starts.";
  }
  if (tasks.some((task) => !DAYS.includes(task.deadline_day))) {
    return "Each task needs a valid deadline day.";
  }
  if (commitments.some((item) => item.end <= item.start)) {
    return "Every class or work block must end after it starts.";
  }
  return "";
}

export function toDailyBlocks(scheduledTasks, commitments) {
  const days = Object.fromEntries(DAYS.map((day) => [day, []]));

  commitments.forEach((item) => {
    const isLockedTask = item.category === "locked-task" || item.task_locked;
    days[item.day]?.push({
      label: item.title,
      type: isLockedTask ? "task" : item.category === "work" || item.title.toLowerCase().includes("work") ? "work" : "class",
      start: item.start,
      end: item.end,
      time: `${formatHour(item.start)}-${formatHour(item.end)}`,
      locked: isLockedTask,
    });
  });

  scheduledTasks.forEach((item) => {
    days[item.day]?.push({
      label: item.title,
      type: "task",
      overload: /deadline|due/i.test(item.title),
      start: item.start,
      end: item.end,
      time: `${formatHour(item.start)}-${formatHour(item.end)}`,
    });
  });

  Object.values(days).forEach((blocks) => {
    blocks.sort((left, right) => {
      const leftStart = typeof left.start === "number" ? left.start : 99;
      const rightStart = typeof right.start === "number" ? right.start : 99;
      return leftStart - rightStart;
    });
  });

  return days;
}

export function buildPreviewCalendar(commitments, tasks) {
  const days = Object.fromEntries(DAYS.map((day) => [day, []]));

  commitments.forEach((item) => {
    const isLockedTask = item.category === "locked-task" || item.task_locked;
    days[item.day]?.push({
      label: item.title,
      type: isLockedTask ? "task" : item.category === "work" ? "work" : "class",
      start: item.start,
      end: item.end,
      time: `${formatHour(item.start)}-${formatHour(item.end)}`,
      locked: isLockedTask,
      source: item,
      sourceType: isLockedTask ? "locked-task" : "commitment",
    });
  });

  tasks.filter((task) => !task.is_locked).forEach((task) => {
    days[task.deadline_day]?.push({
      label: `${task.title} due`,
      type: "task",
      time: `${formatDeadline(task)} · ${task.duration}h`,
      source: task,
      sourceType: "task",
    });
  });

  Object.values(days).forEach((blocks) => {
    blocks.sort((left, right) => {
      const leftStart = typeof left.start === "number" ? left.start : 99;
      const rightStart = typeof right.start === "number" ? right.start : 99;
      return leftStart - rightStart;
    });
  });

  return days;
}

export function filterBlocks(daily, filter) {
  if (filter === "all") return daily;
  return Object.fromEntries(Object.entries(daily).map(([day, blocks]) => [day, blocks.filter((block) => block.type === filter)]));
}

export function toDayLoads(dailyHours = {}) {
  return DAYS.map((day) => Number(dailyHours?.[day] || 0));
}
