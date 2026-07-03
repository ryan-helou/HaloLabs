import type { Person, RoutineSlot } from "./types";

/**
 * Build an iCalendar (.ics) feed from a person's plan so they can drop the
 * routine straight onto their real calendar — recurring AM/PM/weekly reminders
 * plus one-off re-photo checkpoints. Adherence is where results actually happen,
 * so this is the plan's most actionable export. Returns null when there's
 * nothing schedulable.
 */

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Floating (local, no TZ) date-time stamp: YYYYMMDDTHHMMSS. */
function localStamp(d: Date, hour: number): string {
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `T${pad2(hour)}0000`
  );
}

/** Local date only: YYYYMMDD (for all-day events). */
function localDate(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

/** UTC timestamp with Z: YYYYMMDDTHHMMSSZ (for DTSTAMP). */
function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

/** Escape a TEXT value per RFC 5545 (backslash, semicolon, comma, newline). */
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold long content lines to ≤74 chars with CRLF + space, per RFC 5545. */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 73) {
    parts.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  parts.push(" " + rest);
  return parts.join("\r\n");
}

const SLOT_META: Record<
  RoutineSlot,
  { hour: number; summary: string; rrule: string }
> = {
  am: { hour: 8, summary: "HaloLabs — Morning routine", rrule: "FREQ=DAILY" },
  pm: { hour: 21, summary: "HaloLabs — Evening routine", rrule: "FREQ=DAILY" },
  weekly: {
    hour: 10,
    summary: "HaloLabs — Weekly routine",
    rrule: "FREQ=WEEKLY;BYDAY=SA",
  },
};

export function buildRoutineIcs(person: Person, now: Date = new Date()): string | null {
  const plan = person.plan;
  if (!plan) return null;
  const routine = plan.routine ?? [];
  const checkpoints = plan.checkpoints ?? [];
  if (routine.length === 0 && checkpoints.length === 0) return null;

  const dtstamp = utcStamp(now);
  const uidSafe = person.id.replace(/[^a-zA-Z0-9-]/g, "");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HaloLabs//Routine//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`${person.displayName}'s HaloLabs routine`)}`,
  ];

  for (const slot of ["am", "pm", "weekly"] as RoutineSlot[]) {
    const steps = routine.filter((r) => r.slot === slot);
    if (steps.length === 0) continue;
    const meta = SLOT_META[slot];
    const body =
      steps.map((s, i) => `${i + 1}. ${s.step}`).join("\n") +
      "\n\nExamples are examples, not endorsements. Introduce one new product at a time.";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${slot}-${uidSafe}@halolabs`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${localStamp(now, meta.hour)}`,
      `DTEND:${localStamp(now, meta.hour).slice(0, -4)}3000`,
      `RRULE:${meta.rrule}`,
      `SUMMARY:${esc(meta.summary)}`,
      `DESCRIPTION:${esc(body)}`,
      "END:VEVENT"
    );
  }

  for (const cp of checkpoints) {
    const day = new Date(now.getTime() + cp.week * 7 * 86_400_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:checkpoint-w${cp.week}-${uidSafe}@halolabs`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${localDate(day)}`,
      `SUMMARY:${esc(`HaloLabs re-photo — week ${cp.week}`)}`,
      `DESCRIPTION:${esc(
        `${cp.lookFor}\n\nRe-photo in the same spot and light as your originals — consistency is what makes progress visible.`
      )}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
