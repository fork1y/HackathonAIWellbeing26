import { CALENDAR_START_HOUR, CALENDAR_TOTAL_HOURS, DAYS, HOURS } from "../../lib/constants";
import { addDays, formatHour, formatShortDate, hourToTopPercent, toDateInputValue } from "../../lib/dateTime";

export function TimelineCalendar({ blocks, weekStart, onCreateBlock }) {
  function handleColumnClick(day, event) {
    if (!onCreateBlock) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const rawHour = (relativeY / rect.height) * CALENDAR_TOTAL_HOURS + CALENDAR_START_HOUR;
    const start = Math.max(CALENDAR_START_HOUR, Math.min(roundToStep(rawHour, 0.5), 23));
    const end = Math.min(start + 1, CALENDAR_START_HOUR + CALENDAR_TOTAL_HOURS);
    const dayIndex = DAYS.indexOf(day);
    onCreateBlock({
      day,
      date: toDateInputValue(addDays(weekStart, dayIndex)),
      start,
      end,
    });
  }

  return (
    <div className="timeline-calendar">
      <div className="timeline-grid">
        <div className="timeline-corner" />
        {DAYS.map((day, index) => (
          <div className="timeline-day-header" key={day}>
            <strong>{day}</strong>
            <span>{formatShortDate(addDays(weekStart, index))}</span>
          </div>
        ))}
        <div className="timeline-time-column">
          {HOURS.map((hour) => (
            <div className="timeline-time-label" key={hour} style={{ top: `${hourToTopPercent(hour)}%` }}>
              {formatHour(hour)}
            </div>
          ))}
        </div>
        {DAYS.map((day) => (
          <div
            className="timeline-day-column"
            key={day}
            onClick={(event) => handleColumnClick(day, event)}
            style={onCreateBlock ? { cursor: "crosshair" } : undefined}
          >
            {HOURS.map((hour) => (
              <div key={`${day}-${hour}`} className="timeline-hour-line" style={{ top: `${hourToTopPercent(hour)}%` }} />
            ))}
            {(blocks[day] || []).map((block, index) => (
              <TimelineBlock key={`${day}-${block.label}-${index}`} block={block} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineBlock({ block }) {
  if (typeof block.start !== "number" || typeof block.end !== "number") {
    return (
      <div className={`timeline-task-pill timeline-${block.type}`}>
        <strong>{block.label}</strong>
        {block.time ? <span>{block.time}</span> : null}
      </div>
    );
  }

  const clippedStart = Math.max(block.start, CALENDAR_START_HOUR);
  const clippedEnd = Math.min(block.end, CALENDAR_START_HOUR + CALENDAR_TOTAL_HOURS);
  if (clippedEnd <= clippedStart) return null;

  return (
    <div
      className={`timeline-block timeline-${block.type}${block.overload ? " timeline-overload" : ""}`}
      onClick={(event) => event.stopPropagation()}
      style={{
        top: `${hourToTopPercent(clippedStart)}%`,
        height: `${Math.max(((clippedEnd - clippedStart) / CALENDAR_TOTAL_HOURS) * 100, 2.2)}%`,
        borderStyle: block.locked ? "dashed" : undefined,
      }}
    >
      <strong>{block.label}</strong>
      <span>{formatHour(block.start)}-{formatHour(block.end)}{block.locked ? " · Fixed" : ""}</span>
    </div>
  );
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}
