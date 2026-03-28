import { useEffect, useMemo, useState } from "react";

import { DateField, Field, NumberField, TimeField, TimePreferenceField } from "./components/form/FormFields";
import { ScoreRing, InsightCard, StatCard, StepCard } from "./components/ui/Cards";
import { RiskBreakdown, WorkloadChart } from "./components/visualization/Charts";
import { TimelineCalendar } from "./components/visualization/TimelineCalendar";
import {
  buildWeekOptions,
  capitalize,
  dateToDay,
  formatDate,
  formatDeadline,
  formatHour,
  formatWeekRange,
  getWeekStart,
  isSameWeek,
  timeToDecimal,
  toDateInputValue,
} from "./lib/dateTime";
import { analyzeScheduleRequest } from "./lib/api";
import { createSamplePayload } from "./lib/sampleData";
import { buildApiPayload, buildDisplayCommitments, buildPreviewCalendar, filterBlocks, toDailyBlocks, toDayLoads, validateScheduleInputs } from "./lib/schedule";

function createComposerState(weekStart, overrides = {}) {
  return {
    mode: "slot",
    type: "task",
    title: "",
    duration: 1,
    is_locked: true,
    commitment_date: toDateInputValue(weekStart),
    start_time: "09:00",
    end_time: "10:00",
    deadline_date: toDateInputValue(weekStart),
    deadline_time: "23:59",
    ...overrides,
  };
}

function App() {
  const samplePayload = useMemo(() => createSamplePayload(), []);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => getWeekStart(new Date()));
  const [theme, setTheme] = useState(() => localStorage.getItem("balanceai-theme") || "dark");
  const [tab, setTab] = useState("dashboard");
  const [commitments, setCommitments] = useState(samplePayload.commitments);
  const [tasks, setTasks] = useState(samplePayload.tasks);
  const [preferences, setPreferences] = useState(samplePayload.preferences);
  const [sleepWindow, setSleepWindow] = useState(samplePayload.sleep_window);
  const [composer, setComposer] = useState(() => createComposerState(getWeekStart(new Date())));
  const [composerOpen, setComposerOpen] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("balanceai-theme", theme);
  }, [theme]);

  const activeWeekCommitments = useMemo(
    () => commitments.filter((item) => isSameWeek(item.commitment_date, selectedWeekStart)),
    [commitments, selectedWeekStart]
  );

  const activeWeekTasks = useMemo(
    () => tasks.filter((item) => isSameWeek(item.deadline_date, selectedWeekStart)),
    [tasks, selectedWeekStart]
  );

  const payload = useMemo(
    () =>
      buildApiPayload({
        commitments: activeWeekCommitments,
        tasks: activeWeekTasks,
        sleepWindow,
        preferences,
      }),
    [activeWeekCommitments, activeWeekTasks, sleepWindow, preferences]
  );
  const displayCommitments = useMemo(
    () => buildDisplayCommitments(activeWeekCommitments, activeWeekTasks),
    [activeWeekCommitments, activeWeekTasks]
  );

  async function analyzeSchedule(nextTab = "insights") {
    const validationError = validateScheduleInputs({
      commitments: activeWeekCommitments,
      tasks: activeWeekTasks,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const parsedBody = await analyzeScheduleRequest(payload);
      setAnalysis(parsedBody);
      setTab(nextTab);
    } catch (fetchError) {
      if (fetchError instanceof TypeError) {
        setError("Could not reach the backend. Start the API on http://127.0.0.1:8000 and try again.");
      } else {
        setError(fetchError.message || "Unable to analyze schedule.");
      }
    } finally {
      setLoading(false);
    }
  }

  function saveComposer() {
    if (!composer.title.trim()) {
      setError("Add a title before saving.");
      return;
    }

    if (composer.mode === "slot" && (composer.type === "class" || composer.type === "work")) {
      const start = timeToDecimal(composer.start_time);
      const end = timeToDecimal(composer.end_time);
      const commitmentDay = dateToDay(composer.commitment_date);
      if (start === null || end === null || !commitmentDay) {
        setError("Enter a valid date and time range.");
        return;
      }
      if (end <= start) {
        setError("End time must be later than start time.");
        return;
      }
      setCommitments((current) => [
        ...current,
        {
          title: composer.title.trim(),
          day: commitmentDay,
          commitment_date: composer.commitment_date,
          start,
          end,
          category: composer.type,
        },
      ]);
      closeComposer();
      return;
    }

    if (composer.duration <= 0) {
      setError("Task duration must be greater than zero.");
      return;
    }
    if (!composer.deadline_date || !composer.deadline_time) {
      setError("Each task needs a deadline date and time.");
      return;
    }
    const deadlineDay = dateToDay(composer.deadline_date);
    if (!deadlineDay) {
      setError("Choose a valid deadline date.");
      return;
    }

    const nextTask = {
      title: composer.title.trim(),
      duration: composer.duration,
      deadline_day: deadlineDay,
      deadline_date: composer.deadline_date,
      deadline_time: composer.deadline_time,
      is_locked: composer.mode === "slot" || composer.is_locked,
      scheduled_date: composer.commitment_date,
      scheduled_start_time: composer.start_time,
      scheduled_end_time: composer.end_time,
    };

    if (nextTask.is_locked) {
      const scheduledStart = timeToDecimal(nextTask.scheduled_start_time);
      const scheduledEnd = timeToDecimal(nextTask.scheduled_end_time);
      if (scheduledStart === null || scheduledEnd === null || scheduledEnd <= scheduledStart) {
        setError("Fixed task end time must be later than start time.");
        return;
      }
    }

    setTasks((current) => [...current, nextTask]);
    closeComposer();
  }

  function resetSample() {
    setCommitments(samplePayload.commitments);
    setTasks(samplePayload.tasks);
    setPreferences(samplePayload.preferences);
    setSleepWindow(samplePayload.sleep_window);
    setSelectedWeekStart(getWeekStart(new Date()));
    setComposer(createComposerState(getWeekStart(new Date())));
    setComposerOpen(false);
    setAnalysis(null);
    setError("");
  }

  const beforeAssessment = analysis?.before_assessment;
  const afterAssessment = analysis?.after_assessment;
  const beforePlan = analysis?.before_plan;
  const afterPlan = analysis?.after_plan;

  const riskScore = beforeAssessment?.score ?? 0;
  const optimizedScore = afterAssessment?.score ?? 0;
  const savedPoints = analysis ? Math.max(riskScore - optimizedScore, 0) : 0;

  const beforeDaily = toDailyBlocks(beforePlan?.scheduled_tasks || [], displayCommitments);
  const afterDaily = toDailyBlocks(afterPlan?.scheduled_tasks || [], displayCommitments);
  const beforeLoads = toDayLoads(beforeAssessment?.metrics?.daily_hours);
  const afterLoads = toDayLoads(afterAssessment?.metrics?.daily_hours);
  const schedulePreview = buildPreviewCalendar(displayCommitments, activeWeekTasks);

  const filteredBefore = filterBlocks(beforeDaily, activeFilter);
  const filteredAfter = filterBlocks(afterDaily, activeFilter);

  function handleCalendarQuickAdd(selection) {
    setComposer(
      createComposerState(selectedWeekStart, {
        mode: "slot",
        type: "task",
        title: "",
        commitment_date: selection.date,
        start_time: decimalToTimeString(selection.start),
        end_time: decimalToTimeString(selection.end),
        deadline_date: selection.date,
        is_locked: true,
      })
    );
    setComposerOpen(true);
    setError("");
  }

  function openDeadlineTaskComposer() {
    setComposer(
      createComposerState(selectedWeekStart, {
        mode: "deadline",
        type: "task",
        is_locked: false,
      })
    );
    setComposerOpen(true);
    setError("");
  }

  function closeComposer() {
    setComposerOpen(false);
    setComposer(createComposerState(selectedWeekStart));
    setError("");
  }

  return (
    <>
      <nav className="nav">
        <div className="logo">
          <div className="logo-mark">
            <div className="logo-dot" />
          </div>
          <div>
            <div className="logo-title">BalanceAI</div>
            <div className="logo-subtitle">Burnout-aware scheduler</div>
          </div>
        </div>
        <div className="nav-tabs">
          {["dashboard", "schedule", "insights", "compare"].map((name) => (
            <button
              key={name}
              className={`nav-tab${tab === name ? " active" : ""}`}
              onClick={() => setTab(name)}
              type="button"
            >
              {capitalize(name)}
            </button>
          ))}
        </div>
        <button
          className="theme-switch"
          type="button"
          onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </nav>

      <main className="main">
        {tab === "dashboard" && (
          <div className="page-stack">
            <section className="hero">
              <div className="hero-badge">
                <div className="badge-dot" />
                AI-Powered Schedule Health
              </div>
              <h1>
                Your week,
                <br />
                <span>balanced.</span>
              </h1>
              <p>
                Add class time, work shifts, and deadlines. BalanceAI finds burnout risk, gives alerts,
                and reshapes the week around your personal limits.
              </p>
              <button className="hero-cta" type="button" onClick={() => setTab("schedule")}>
                Build My Schedule
              </button>
            </section>

            <section className="stats-row">
              <StatCard title="Current Burnout Score" value={analysis ? riskScore : "--"} tone={getTone(riskScore)} toneClass={toneClass} />
              <StatCard title="After Optimization" value={analysis ? optimizedScore : "--"} tone={getTone(optimizedScore)} toneClass={toneClass} />
              <StatCard title="Risk Points Saved" value={analysis ? `-${savedPoints}` : "--"} tone="neutral" toneClass={toneClass} />
            </section>

            <section className="grid-2">
              <article className="card">
                <div className="section-title">How it works</div>
                <div className="step-list">
                  <StepCard number="1" title="Add classes and work" text="Enter fixed blocks with real times like 10:30 or 14:45." />
                  <StepCard number="2" title="Add assignment tasks" text="Enter due day and estimated hours. We place them around your week." />
                  <StepCard number="3" title="Analyze and compare" text="You get burnout alerts, workload insight, and a healthier before versus after calendar." />
                </div>
              </article>

              <article className="card">
                <div className="section-title">What you get</div>
                <div className="ring-row">
                  <ScoreRing score={analysis ? riskScore : 72} label="Risk score" tone={analysis ? getTone(riskScore) : "danger"} toneClass={toneClass} />
                  <ScoreRing score={analysis ? optimizedScore : 34} label="Optimized" tone={analysis ? getTone(optimizedScore) : "safe"} toneClass={toneClass} />
                </div>
                <hr className="divider" />
                <button className="btn btn-primary btn-full" type="button" onClick={() => setTab("schedule")}>
                  Go to Schedule Setup
                </button>
              </article>
            </section>
          </div>
        )}

        {tab === "schedule" && (
          <div className="page-stack">
            <section className="page-header">
              <h2>Build Your Schedule</h2>
              <p>
                Add your fixed week first, then your deadlines, then your personal burnout settings.
                The timeline updates live so you can see the week take shape.
              </p>
            </section>

            <section className="card week-toolbar">
              <div>
                <div className="section-title">Calendar Week</div>
                <div className="week-range">{formatWeekRange(selectedWeekStart)}</div>
                <p className="helper-copy">Move between weeks to plan ahead. BalanceAI analyzes the week currently in view.</p>
              </div>
              <div className="week-actions">
                <Field label="Choose week">
                  <select
                    className="week-select"
                    value={toDateInputValue(selectedWeekStart)}
                    onChange={(event) => setSelectedWeekStart(getWeekStart(new Date(`${event.target.value}T00:00:00`)))}
                  >
                    {buildWeekOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setSelectedWeekStart(getWeekStart(new Date()))}
                >
                  This Week
                </button>
                <button className="btn btn-primary" type="button" onClick={openDeadlineTaskComposer}>
                  Add Deadline Task
                </button>
              </div>
            </section>

            <article className="card card-stretch">
              <div className="section-title">Weekly Planner</div>
              <p className="helper-copy">Click directly on the calendar to create a class, work block, or fixed task. Use `Add Deadline Task` for flexible assignments.</p>
              <TimelineCalendar blocks={schedulePreview} weekStart={selectedWeekStart} onCreateBlock={handleCalendarQuickAdd} />
            </article>

            <section className="grid-2">
              <article className="card">
                <div className="section-title">Scheduled Blocks</div>
                <div className="tag-row">
                  {displayCommitments.map((item, index) => (
                    <div className={`tag ${item.category === "work" ? "tag-work" : item.category === "locked-task" ? "tag-task" : "tag-class"}`} key={`${item.title}-${index}`}>
                      <span>{item.title} · {formatHour(item.start)}-{formatHour(item.end)}</span>
                      <button
                        className="tag-remove"
                        type="button"
                        onClick={() => {
                          if (item.category === "locked-task") {
                            setTasks((current) =>
                              current.filter(
                                (entry) =>
                                  !(
                                    entry.is_locked &&
                                    entry.title === item.title &&
                                    timeToDecimal(entry.scheduled_start_time) === item.start &&
                                    timeToDecimal(entry.scheduled_end_time) === item.end
                                  )
                              )
                            );
                            return;
                          }
                          setCommitments((current) => current.filter((entry) => entry !== item));
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </article>
              <article className="card">
                <div className="section-title">Deadline Tasks</div>
                <div className="tag-row">
                  {activeWeekTasks.map((item, index) => (
                    <div className="tag tag-task" key={`${item.title}-${index}`}>
                      <span>{item.title} · due {formatDeadline(item)} · {item.duration}h{item.is_locked ? " · fixed" : ""}</span>
                      <button className="tag-remove" type="button" onClick={() => setTasks((current) => current.filter((entry) => entry !== item))}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <article className="card">
              <div className="section-title">3. Personal Burnout Preferences</div>
              <div className="form-grid settings-grid">
                <NumberField label="Max daily hours" value={preferences.max_daily_hours} onChange={(value) => setPreferences((current) => ({ ...current, max_daily_hours: value }))} />
                <NumberField label="Weekly comfort limit" value={preferences.weekly_hours_threshold} onChange={(value) => setPreferences((current) => ({ ...current, weekly_hours_threshold: value }))} />
                <TimePreferenceField label="Late-night cutoff" value={preferences.late_night_cutoff} onChange={(value) => setPreferences((current) => ({ ...current, late_night_cutoff: value }))} />
                <NumberField label="Max consecutive blocks" step="1" value={preferences.max_consecutive_blocks} onChange={(value) => setPreferences((current) => ({ ...current, max_consecutive_blocks: value }))} />
                <NumberField label="Min breaks per day" step="1" value={preferences.min_breaks_per_day} onChange={(value) => setPreferences((current) => ({ ...current, min_breaks_per_day: value }))} />
                <NumberField label="Deadline cluster days" step="1" value={preferences.deadline_cluster_days} onChange={(value) => setPreferences((current) => ({ ...current, deadline_cluster_days: value }))} />
                <TimePreferenceField label="Preferred start" value={preferences.preferred_study_start} onChange={(value) => setPreferences((current) => ({ ...current, preferred_study_start: value }))} />
                <TimePreferenceField label="Preferred end" value={preferences.preferred_study_end} onChange={(value) => setPreferences((current) => ({ ...current, preferred_study_end: value }))} />
                <TimePreferenceField label="Sleep start" value={sleepWindow.start} onChange={(value) => setSleepWindow((current) => ({ ...current, start: value }))} />
                <TimePreferenceField label="Sleep end" value={sleepWindow.end} onChange={(value) => setSleepWindow((current) => ({ ...current, end: value }))} />
              </div>
            </article>

            <div className="schedule-actions">
              <button className="btn btn-primary btn-large" type="button" onClick={() => analyzeSchedule("insights")} disabled={loading}>
                {loading ? "Analyzing..." : "Analyze and Optimize"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={resetSample}>
                Reset Sample
              </button>
            </div>

            {error ? <p className="error-banner">{error}</p> : null}
          </div>
        )}

        {tab === "insights" && (
          <div className="page-stack">
            <section className="page-header">
              <h2>Burnout Analysis</h2>
              <p>See the risk drivers in your current schedule and how much the optimized plan reduces them.</p>
            </section>

            {!analysis ? (
              <div className="empty-state">
                <p>Analyze your schedule from the Schedule tab to unlock insights.</p>
              </div>
            ) : (
              <>
                <section className="grid-2">
                  <article className="card">
                    <div className="section-title">Risk Breakdown</div>
                    <RiskBreakdown assessment={beforeAssessment} getTone={getTone} toneClass={toneClass} />
                  </article>

                  <article className="card">
                    <div className="section-title">Overall Burnout Score</div>
                    <div className="overall-risk">
                      <div className={`risk-label ${toneClass(getTone(riskScore))}`}>{riskScore}</div>
                      <div className={`risk-state ${toneClass(getTone(riskScore))}`}>{beforeAssessment.level} Risk</div>
                      <div className="risk-note">
                        After optimization, your score drops to <strong>{optimizedScore}</strong> ({afterAssessment.level}).
                      </div>
                    </div>
                    <hr className="divider" />
                    <button className="btn btn-primary btn-full" type="button" onClick={() => setTab("compare")}>
                      See Optimized Schedule
                    </button>
                  </article>
                </section>

                <article className="card">
                  <div className="section-title">AI Insights</div>
                  {beforeAssessment.reasons.map((reason, index) => (
                    <InsightCard key={reason} tone={index === 0 ? "danger" : index === beforeAssessment.reasons.length - 1 ? "good" : "warn"} text={reason} />
                  ))}
                </article>
              </>
            )}
          </div>
        )}

        {tab === "compare" && (
          <div className="page-stack">
            <section className="page-header">
              <h2>Before vs After</h2>
              <p>Compare the baseline week with the optimized plan in a real hour-by-hour view.</p>
            </section>

            {!analysis ? (
              <div className="empty-state">
                <p>Analyze a schedule first to compare the two plans.</p>
              </div>
            ) : (
              <>
                <div className="chip-row chips-filter">
                  {[
                    { id: "all", label: "All" },
                    { id: "class", label: "Classes" },
                    { id: "work", label: "Work" },
                    { id: "task", label: "Tasks" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      className={`chip chip-filter${activeFilter === filter.id ? " active" : ""}`}
                      type="button"
                      onClick={() => setActiveFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <section className="comparison comparison-top">
                  <article className="card">
                    <div className={`compare-label ${getTone(riskScore) === "safe" ? "compare-good" : ""}`}>Before · Risk Score {riskScore}</div>
                    <TimelineCalendar blocks={filteredBefore} weekStart={selectedWeekStart} />
                  </article>
                  <article className="card">
                    <div className="compare-label compare-good">After · Risk Score {optimizedScore}</div>
                    <TimelineCalendar blocks={filteredAfter} weekStart={selectedWeekStart} />
                  </article>
                </section>

                <section className="comparison">
                  <article className="card">
                    <div className="compare-label">Daily Workload Before</div>
                    <WorkloadChart data={beforeLoads} getTone={getTone} toneClass={toneClass} />
                  </article>
                  <article className="card">
                    <div className="compare-label compare-good">Daily Workload After</div>
                    <WorkloadChart data={afterLoads} getTone={getTone} toneClass={toneClass} />
                  </article>
                </section>
              </>
            )}
          </div>
        )}
      </main>
      {composerOpen ? (
        <div className="modal-overlay" onClick={closeComposer}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="section-title">{composer.mode === "slot" ? "Create Schedule Block" : "Create Deadline Task"}</div>
            <div className="form-grid two-up">
              {composer.mode === "slot" ? (
                <Field label="Block type">
                  <select value={composer.type} onChange={(event) => setComposer((current) => ({ ...current, type: event.target.value }))}>
                    <option value="class">Class</option>
                    <option value="work">Work</option>
                    <option value="task">Fixed Task</option>
                  </select>
                </Field>
              ) : null}
              <Field label="Title">
                <input value={composer.title} placeholder="Add a title" onChange={(event) => setComposer((current) => ({ ...current, title: event.target.value }))} />
              </Field>
              {composer.mode === "slot" ? (
                <>
                  <DateField label="Date" value={composer.commitment_date} onChange={(value) => setComposer((current) => ({ ...current, commitment_date: value, deadline_date: current.type === "task" ? value : current.deadline_date }))} />
                  <TimeField label="Start" value={composer.start_time} onChange={(value) => setComposer((current) => ({ ...current, start_time: value }))} />
                  <TimeField label="End" value={composer.end_time} onChange={(value) => setComposer((current) => ({ ...current, end_time: value, duration: syncDuration(current.start_time, value, current.duration) }))} />
                </>
              ) : null}
              <NumberField label="Duration (hours)" min="0.25" step="0.25" value={composer.duration} onChange={(value) => setComposer((current) => ({ ...current, duration: value }))} />
              <DateField label="Deadline date" value={composer.deadline_date} onChange={(value) => setComposer((current) => ({ ...current, deadline_date: value }))} />
              <TimeField label="Deadline time" value={composer.deadline_time} onChange={(value) => setComposer((current) => ({ ...current, deadline_time: value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" onClick={closeComposer}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={saveComposer}>Save Block</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function getTone(score) {
  if (score >= 60) return "danger";
  if (score >= 30) return "warn";
  if (score === 0) return "neutral";
  return "safe";
}

function toneClass(tone) {
  if (tone === "warn") return "tone-warn";
  if (tone === "danger") return "tone-danger";
  if (tone === "safe") return "tone-safe";
  return "tone-neutral";
}

function decimalToTimeString(value) {
  const hour = Math.floor(value);
  const minute = Math.round((value - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function syncDuration(startTime, endTime, fallback) {
  const start = timeToDecimal(startTime);
  const end = timeToDecimal(endTime);
  if (start === null || end === null || end <= start) {
    return fallback;
  }
  return Number((end - start).toFixed(2));
}

export default App;
