"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatShortDate } from "../../_lib/date";
import { PROGRAMS } from "../../_lib/programs";
import {
  type CourseBreakdown,
  groupTotals,
  programOf,
  type StatRow,
  type Totals,
  totalsOf,
  weekStart,
} from "../../_lib/stats";
import { getCourseBreakdown } from "../../_server/admin/stats-actions";
import { Dialog } from "../dialog";
import { ChevronRightIcon } from "../icons";
import { cx } from "../ui";

const RANGES = [
  { days: 7, label: "7 хоног" },
  { days: 30, label: "30 хоног" },
  { days: 90, label: "90 хоног" },
] as const;

const PROGRAM_NAME = new Map<string, string>(
  PROGRAMS.map((program) => [program.code, program.name]),
);

const pct = (rate: number | null) => (rate === null ? "—" : `${rate}%`);

/** "2026-11-10"-аас n хоногийн өмнөх огноо. */
function daysBefore(today: string, n: number) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (n - 1));
  return date.toISOString().slice(0, 10);
}

/**
 * Сургуулийн ирцийн тойм: хугацаа, хөтөлбөр, ангиар шүүж, хичээл дээр дарж
 * оюутан бүр ба хичээллэлт бүрийн ирцийг задлан харна.
 */
export function OverviewPanel({
  stats,
  today,
}: {
  stats: StatRow[];
  today: string;
}) {
  const [range, setRange] = useState<number>(30);
  const [program, setProgram] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [course, setCourse] = useState<{ id: string; title: string } | null>(
    null,
  );
  const from = daysBefore(today, range);

  const inRange = useMemo(
    () => stats.filter((row) => row.day >= from && row.day <= today),
    [stats, from, today],
  );
  // Шүүлтүүрт харагдах ангиуд (сонгосон хөтөлбөрийнх).
  const classOptions = [
    ...new Set(
      inRange
        .filter((row) => !program || programOf(row.classGroup) === program)
        .map((row) => row.classGroup),
    ),
  ].sort();
  const rows = inRange.filter(
    (row) =>
      (!program || programOf(row.classGroup) === program) &&
      (!classGroup || row.classGroup === classGroup),
  );
  const group = classGroup || program;

  const totals = totalsOf(rows);
  const weekly = groupTotals(rows, (row) => weekStart(row.day)).sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  // Хөтөлбөр сонгосон бол ангиар, үгүй бол хөтөлбөрөөр.
  const bars = groupTotals(rows, (row) =>
    program ? row.classGroup : programOf(row.classGroup),
  ).sort((a, b) => a.key.localeCompare(b.key, "mn"));
  const byCourse = groupTotals(
    rows,
    (row) => `${row.courseId}|${row.courseCode}|${row.courseTitle}`,
  ).sort((a, b) => (a.totals.rate ?? 0) - (b.totals.rate ?? 0));

  const selectClass =
    "rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-emerald-600";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Ирцийн тойм
        </h1>
        <p className="mt-1 text-[15px] text-slate-500">
          Хичээл дээр дарж оюутан бүрийн ирцийг харна
        </p>
      </div>

      {/* Шүүлтүүрүүд: графикуудын дээр нэг мөрөнд. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div
          className="flex gap-1 rounded-xl bg-slate-100 p-1"
          role="radiogroup"
          aria-label="Хугацаа"
        >
          {RANGES.map((item) => (
            <button
              key={item.days}
              type="button"
              role="radio"
              aria-checked={range === item.days}
              onClick={() => setRange(item.days)}
              className={cx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                range === item.days
                  ? "bg-surface text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Хөтөлбөр"
          className={selectClass}
          value={program}
          onChange={(event) => {
            setProgram(event.target.value);
            setClassGroup("");
          }}
        >
          <option value="">Бүх хөтөлбөр</option>
          {PROGRAMS.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code} · {item.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Анги"
          className={selectClass}
          value={classGroup}
          onChange={(event) => setClassGroup(event.target.value)}
        >
          <option value="">Бүх анги</option>
          {classOptions.map((item) => (
            <option key={item} value={item}>
              {item === "—" ? "Анги тодорхойгүй" : item}
            </option>
          ))}
        </select>
        {(program || classGroup) && (
          <button
            type="button"
            onClick={() => {
              setProgram("");
              setClassGroup("");
            }}
            className="rounded-lg px-2 py-1.5 text-sm font-medium text-emerald-700 hover:bg-slate-100"
          >
            Цэвэрлэх
          </button>
        )}
      </div>

      {totals.total === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-surface p-10 text-center text-[15px] text-slate-500">
          Энэ шүүлтүүрт хаагдсан ирц алга.
        </p>
      ) : (
        <>
          <StatTiles totals={totals} />
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card title="Долоо хоногийн ирц">
              <TrendChart weekly={weekly} />
            </Card>
            <Card title={program ? `${program} — ангиар` : "Хөтөлбөрөөр"}>
              <GroupBars
                groups={bars}
                active={program ? classGroup : program}
                onPick={(key) => {
                  if (program) setClassGroup(classGroup === key ? "" : key);
                  else setProgram(key);
                }}
              />
            </Card>
          </div>
          <Card title="Хичээлээр (ирц багаас нь)" className="mt-4">
            <CourseTable
              groups={byCourse}
              onPick={(id, title) => setCourse({ id, title })}
            />
          </Card>
        </>
      )}

      <Dialog
        open={course !== null}
        onClose={() => setCourse(null)}
        title={course?.title ?? ""}
        description={[
          RANGES.find((item) => item.days === range)?.label,
          group ? (group === "—" ? "Анги тодорхойгүй" : group) : "Бүх анги",
        ].join(" · ")}
        wide
      >
        {course && (
          <CourseDetail
            key={`${course.id}|${from}|${group}`}
            courseId={course.id}
            from={from}
            to={today}
            group={group}
          />
        )}
      </Dialog>
    </div>
  );
}

function Card({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cx(
        "rounded-xl border border-slate-200 bg-surface p-4 sm:p-5",
        className,
      )}
    >
      <h2 className="mb-3 text-[15px] font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function StatTiles({ totals }: { totals: Totals }) {
  const tiles = [
    { label: "Ирц", value: pct(totals.rate), hero: true },
    { label: "Ирсэн", value: totals.present.toLocaleString("mn-MN") },
    { label: "Тасалсан", value: totals.absent.toLocaleString("mn-MN") },
    { label: "Чөлөөтэй", value: totals.excused.toLocaleString("mn-MN") },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-slate-200 bg-surface p-4"
        >
          <p className="text-sm text-slate-500">{tile.label}</p>
          <p
            className={cx(
              "mt-1 font-semibold tabular-nums text-slate-900",
              tile.hero ? "text-3xl" : "text-2xl",
            )}
          >
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Чиг хандлага ------------------------------ */

const H = 200;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

/** Элементийн бодит өргөн (график 1:1 пикселээр зурагдаж, бичиг жижигрэхгүй). */
function useWidth(fallback: number) {
  const [width, setWidth] = useState(fallback);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.round(entry.contentRect.width))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function TrendChart({ weekly }: { weekly: { key: string; totals: Totals }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth(560);
  const points = weekly.filter((week) => week.totals.rate !== null);
  if (points.length === 0) return null;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (index: number) =>
    PAD.left +
    (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const y = (rate: number) => PAD.top + innerH - (rate / 100) * innerH;
  const path = points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${x(index)},${y(point.totals.rate!)}`,
    )
    .join(" ");
  const active = hover !== null ? points[hover] : null;
  const label = (key: string) => formatShortDate(key).day;

  return (
    <div className="relative" ref={ref}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full"
        role="img"
        aria-label="Долоо хоног бүрийн ирцийн хувь"
        onMouseLeave={() => setHover(null)}
      >
        {/* Нэг тэнхлэг: 0–100%, бүдэг тор */}
        {[0, 50, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-slate-200"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-slate-400 text-[11px]"
            >
              {tick}%
            </text>
          </g>
        ))}
        {points.map((point, index) => (
          <text
            key={point.key}
            x={x(index)}
            y={H - 8}
            textAnchor="middle"
            className="fill-slate-400 text-[11px]"
          >
            {label(point.key)}
          </text>
        ))}
        {active && (
          <line
            x1={x(hover!)}
            x2={x(hover!)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            className="stroke-slate-300"
            strokeDasharray="3 3"
          />
        )}
        <path
          d={path}
          fill="none"
          stroke="var(--color-chart)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <circle
            key={point.key}
            cx={x(index)}
            cy={y(point.totals.rate!)}
            r={hover === index ? 5 : 4}
            fill="var(--color-chart)"
            className="stroke-surface"
            strokeWidth={2}
          />
        ))}
        {/* Цэгээс том hover бүс */}
        {points.map((point, index) => (
          <rect
            key={point.key}
            x={x(index) - innerW / Math.max(points.length, 2) / 2}
            y={PAD.top}
            width={innerW / Math.max(points.length, 2)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
            onTouchStart={() => setHover(index)}
          />
        ))}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-[13px] shadow-md"
          style={{
            left: `${(x(hover!) / W) * 100}%`,
            transform: `translateX(${hover! > points.length / 2 ? "-105%" : "5%"})`,
          }}
        >
          <p className="font-semibold text-slate-800">
            {label(active.key)}-ны долоо хоног
          </p>
          <p className="tabular-nums text-slate-600">
            Ирц {pct(active.totals.rate)} · {active.totals.present}/
            {active.totals.total}
          </p>
        </div>
      )}
      <details className="mt-2 text-[13px] text-slate-500">
        <summary className="cursor-pointer">Тоон утгаар</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr className="text-slate-400">
              <th className="py-1 font-medium">Долоо хоног</th>
              <th className="py-1 font-medium">Ирц</th>
              <th className="py-1 font-medium">Ирсэн / Нийт</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.key} className="text-slate-700">
                <td className="py-0.5">{point.key}</td>
                <td className="py-0.5">{pct(point.totals.rate)}</td>
                <td className="py-0.5">
                  {point.totals.present} / {point.totals.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/* ------------------------------ Хөтөлбөр / анги ----------------------------- */

function GroupBars({
  groups,
  active,
  onPick,
}: {
  groups: { key: string; totals: Totals }[];
  active: string;
  onPick: (key: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {groups.map(({ key, totals }) => (
        <li key={key}>
          <button
            type="button"
            onClick={() => onPick(key)}
            aria-pressed={active === key}
            title={`Ирсэн ${totals.present} · Тасалсан ${totals.absent} · Чөлөөтэй ${totals.excused}`}
            className={cx(
              "w-full rounded-lg px-2 py-2 text-left transition hover:bg-slate-50",
              active === key && "bg-slate-50 ring-1 ring-slate-200",
            )}
          >
            <span className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-slate-700">
                <strong className="font-semibold">
                  {key === "—" ? "Анги тодорхойгүй" : key}
                </strong>{" "}
                {PROGRAM_NAME.get(key) && (
                  <span className="text-slate-400">
                    {PROGRAM_NAME.get(key)}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-medium tabular-nums text-slate-800">
                {pct(totals.rate)}
              </span>
            </span>
            <span className="block h-2.5 w-full rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${totals.rate ?? 0}%`,
                  background: "var(--color-chart)",
                }}
              />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------- Хичээл --------------------------------- */

function CourseTable({
  groups,
  onPick,
}: {
  groups: { key: string; totals: Totals }[];
  onPick: (courseId: string, title: string) => void;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {groups.map(({ key, totals }) => {
        const [id, code, title] = key.split("|");
        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onPick(id, title)}
              className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50 sm:px-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-800">
                  {title}
                </span>
                <span className="text-[13px] tabular-nums text-slate-400">
                  {code} · Ирсэн {totals.present} · Тасалсан {totals.absent}
                  {totals.excused ? ` · Чөлөөтэй ${totals.excused}` : ""}
                </span>
              </span>
              <span className="hidden w-28 sm:block">
                <span className="block h-2 rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${totals.rate ?? 0}%`,
                      background: "var(--color-chart)",
                    }}
                  />
                </span>
              </span>
              <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-slate-800">
                {pct(totals.rate)}
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-slate-400" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------- Хичээлийн задаргаа --------------------------- */

const rateOf = (row: { present: number; absent: number; excused: number }) => {
  const total = row.present + row.absent + row.excused;
  return total ? Math.round((row.present / total) * 1000) / 10 : null;
};

function CourseDetail({
  courseId,
  from,
  to,
  group,
}: {
  courseId: string;
  from: string;
  to: string;
  group: string;
}) {
  const [data, setData] = useState<CourseBreakdown | null | undefined>(
    undefined,
  );
  const [tab, setTab] = useState<"students" | "sessions">("students");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCourseBreakdown(courseId, from, to, group).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, from, to, group]);

  if (data === undefined) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">Ачаалж байна…</p>
    );
  }
  if (data === null) {
    return (
      <p className="py-8 text-center text-sm text-rose-700">
        Мэдээлэл авч чадсангүй.
      </p>
    );
  }

  const query = search.trim().toLowerCase();
  const students = data.students.filter(
    (student) =>
      !query || `${student.name} ${student.code}`.toLowerCase().includes(query),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
          {(
            [
              ["students", `Оюутнаар · ${data.students.length}`],
              ["sessions", `Хичээллэлтээр · ${data.sessions.length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cx(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                tab === id
                  ? "bg-surface text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "students" && (
          <input
            aria-label="Оюутан хайх"
            placeholder="Нэр эсвэл код"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-emerald-600 sm:w-48"
          />
        )}
      </div>

      {tab === "students" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-2 font-medium">Оюутан</th>
                <th className="pb-2 font-medium">Анги</th>
                <th className="pb-2 text-right font-medium">Ирсэн</th>
                <th className="pb-2 text-right font-medium">Тасалсан</th>
                <th className="pb-2 text-right font-medium">Чөлөө</th>
                <th className="pb-2 text-right font-medium">Ирц</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.studentId}>
                  <td className="py-2">
                    <span className="block font-medium text-slate-800">
                      {student.name}
                    </span>
                    <span className="font-mono text-[12px] text-slate-400">
                      {student.code}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600">{student.classGroup}</td>
                  <td className="py-2 text-right tabular-nums text-slate-600">
                    {student.present}
                  </td>
                  <td
                    className={cx(
                      "py-2 text-right tabular-nums",
                      student.absent
                        ? "font-semibold text-rose-700"
                        : "text-slate-400",
                    )}
                  >
                    {student.absent}
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-600">
                    {student.excused}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums text-slate-800">
                    {pct(rateOf(student))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              Оюутан олдсонгүй.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.sessions.map((session) => {
            const { day, weekday } = formatShortDate(session.date);
            const total = session.present + session.absent + session.excused;
            const rate = rateOf(session);
            return (
              <li
                key={`${session.date}|${session.period}`}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <span className="w-32 shrink-0 tabular-nums text-slate-700">
                  {day} · {weekday}
                  {session.period ? (
                    <span className="block text-[12px] text-slate-400">
                      {session.period}-р пар
                    </span>
                  ) : null}
                </span>
                <span className="block h-2 flex-1 rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${rate ?? 0}%`,
                      background: "var(--color-chart)",
                    }}
                  />
                </span>
                <span className="w-24 shrink-0 text-right tabular-nums text-slate-600">
                  {session.present}/{total}
                  <span className="ml-1 font-semibold text-slate-800">
                    {pct(rate)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
