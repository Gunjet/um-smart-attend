"use client";

import { useState } from "react";
import type { AdminUser } from "../../_lib/admin-types";
import type { AdminCourse } from "../../_lib/dto";
import { COURSE_YEARS, formatClassGroups, PROGRAMS } from "../../_lib/programs";
import {
  type CourseSlot,
  formatDateRange,
  formatSlot,
  mergeSlots,
  PERIODS,
  periodByNumber,
  slotPeriods,
  WEEKDAY_OPTIONS,
} from "../../_lib/schedule";
import type { Notify } from "../../_lib/types";
import {
  deleteCourse,
  saveCourse,
  setEnrollments,
} from "../../_server/admin/course-actions";
import { Dialog } from "../dialog";
import { PencilIcon, PlusIcon, TrashIcon, UsersIcon } from "../icons";
import { cx, primaryButtonClass } from "../ui";
import {
  Field,
  FormActions,
  FormError,
  inputClass,
  useAdminAction,
} from "./user-forms";

type DialogState =
  | { kind: "create" }
  | { kind: "edit" | "students" | "delete"; course: AdminCourse };

const DIALOG_TITLE: Record<DialogState["kind"], string> = {
  create: "Хичээл нэмэх",
  edit: "Хичээл засах",
  students: "Хичээлийн оюутнууд",
  delete: "Хичээл устгах",
};

export function CoursesPanel({
  courses,
  users,
  notify,
}: {
  courses: AdminCourse[];
  users: AdminUser[];
  notify: Notify;
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");

  const teachers = users.filter((user) => user.role === "teacher");
  const students = users.filter((user) => user.role === "student");

  const open = (next: DialogState) => {
    setDialogKey((key) => key + 1);
    setDialog(next);
  };
  const close = () => setDialog(null);
  const done = (message: string) => {
    setDialog(null);
    if (message) notify(message);
  };

  const query = search.trim().toLowerCase();
  const visible = courses.filter(
    (course) =>
      !query ||
      [
        course.title,
        course.code,
        course.classGroups.join(" "),
        course.teacherName ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Хичээлүүд
          </h1>
          <p className="mt-1 text-[15px] text-slate-500">
            Хичээл үүсгэж, багш болон оюутнуудыг оноох
          </p>
        </div>
        <button
          className={cx(primaryButtonClass, "w-full sm:w-auto")}
          onClick={() => open({ kind: "create" })}
        >
          <PlusIcon className="size-4" />
          Хичээл нэмэх
        </button>
      </div>

      <label className="mb-4 flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 sm:w-80">
        <span className="text-slate-400" aria-hidden="true">
          ⌕
        </span>
        <input
          className="w-full bg-transparent py-2 text-[15px] outline-none placeholder:text-slate-400"
          aria-label="Хичээл хайх"
          placeholder="Нэр, код, анги, багш"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-surface p-10 text-center">
          <p className="text-[15px] text-slate-600">Одоогоор хичээл алга.</p>
          <p className="mt-1 text-sm text-slate-400">
            «Хичээл нэмэх» дарж эхний хичээлээ үүсгэнэ үү.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((course) => (
            <article
              key={course.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-slate-900">
                    {course.title}
                  </h2>
                  <p className="mt-0.5 font-mono text-sm text-slate-500">
                    {course.code}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton
                    label="Засах"
                    onClick={() => open({ kind: "edit", course })}
                  >
                    <PencilIcon className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Устгах"
                    danger
                    onClick={() => open({ kind: "delete", course })}
                  >
                    <TrashIcon className="size-4" />
                  </IconButton>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-slate-400">Хугацаа</dt>
                  <dd className="text-slate-700 tabular-nums">
                    {formatDateRange(course.startDate, course.endDate)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-slate-400">Цаг</dt>
                  <dd className="text-slate-700 tabular-nums">
                    {course.slots.length === 0 ? (
                      <span className="text-amber-700">Оруулаагүй</span>
                    ) : (
                      mergeSlots(course.slots).map((slot) => (
                        <span
                          key={`${slot.day}-${slot.start}`}
                          className="block"
                        >
                          {formatSlot(slot)}
                        </span>
                      ))
                    )}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-slate-400">Анги</dt>
                  <dd className="min-w-0 text-slate-700">
                    {formatClassGroups(course.classGroups) || (
                      <span className="text-amber-700">Сонгоогүй</span>
                    )}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-slate-400">Багш</dt>
                  <dd
                    className={
                      course.teacherName ? "text-slate-700" : "text-amber-700"
                    }
                  >
                    {course.teacherName ?? "Оноогоогүй"}
                  </dd>
                </div>
              </dl>
              <button
                className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-medium text-emerald-700 hover:bg-slate-50"
                onClick={() => open({ kind: "students", course })}
              >
                <UsersIcon className="size-4" />
                Оюутнууд · {course.studentIds.length}
              </button>
            </article>
          ))}
          {visible.length === 0 && (
            <p className="col-span-full py-8 text-center text-[15px] text-slate-500">
              Хичээл олдсонгүй.
            </p>
          )}
        </div>
      )}

      <Dialog
        open={dialog !== null}
        onClose={close}
        title={dialog ? DIALOG_TITLE[dialog.kind] : ""}
        description={
          dialog && dialog.kind !== "create" ? dialog.course.title : undefined
        }
      >
        {(dialog?.kind === "create" || dialog?.kind === "edit") && (
          <CourseForm
            key={dialogKey}
            course={dialog.kind === "edit" ? dialog.course : undefined}
            teachers={teachers}
            onCancel={close}
            onDone={done}
          />
        )}
        {dialog?.kind === "students" && (
          <EnrollmentForm
            key={dialogKey}
            course={dialog.course}
            students={students}
            onCancel={close}
            onDone={done}
          />
        )}
        {dialog?.kind === "delete" && (
          <DeleteCourseForm
            key={dialogKey}
            course={dialog.course}
            onCancel={close}
            onDone={done}
          />
        )}
      </Dialog>
    </div>
  );
}

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cx(
        "grid size-9 place-items-center rounded-lg text-slate-400 transition",
        danger
          ? "hover:bg-rose-50 hover:text-rose-700"
          : "hover:bg-slate-100 hover:text-slate-800",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------- Хичээл форм ------------------------------- */

function CourseForm({
  course,
  teachers,
  onCancel,
  onDone,
}: {
  course?: AdminCourse;
  teachers: AdminUser[];
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [state, onSubmit, pending] = useAdminAction(saveCourse, onDone);
  const errors = state?.courseErrors;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {course && <input type="hidden" name="id" value={course.id} />}
      <Field label="Хичээлийн нэр" htmlFor="course-title" error={errors?.title}>
        <input
          id="course-title"
          name="title"
          className={inputClass}
          defaultValue={course?.title}
          autoComplete="off"
          required
        />
      </Field>
      <Field label="Код" htmlFor="course-code" error={errors?.code}>
        <input
          id="course-code"
          name="code"
          className={cx(inputClass, "uppercase")}
          defaultValue={course?.code}
          placeholder="CS304"
          autoComplete="off"
          required
        />
      </Field>
      <ClassGroupPicker
        initial={course?.classGroups ?? []}
        error={errors?.classGroups}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Эхлэх огноо"
          htmlFor="course-start-date"
          error={errors?.startDate}
        >
          <input
            id="course-start-date"
            name="startDate"
            type="date"
            className={inputClass}
            defaultValue={course?.startDate}
            required
          />
        </Field>
        <Field
          label="Дуусах огноо"
          htmlFor="course-end-date"
          error={errors?.endDate}
        >
          <input
            id="course-end-date"
            name="endDate"
            type="date"
            className={inputClass}
            defaultValue={course?.endDate}
            required
          />
        </Field>
      </div>
      <SlotsEditor initial={course?.slots} error={errors?.slots} />
      <Field label="Багш" htmlFor="course-teacher" error={errors?.teacherId}>
        <select
          id="course-teacher"
          name="teacherId"
          className={inputClass}
          defaultValue={course?.teacherId ?? ""}
        >
          <option value="">— Сонгоогүй —</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
      </Field>
      <FormError message={state?.error} />
      <FormActions
        onCancel={onCancel}
        submitLabel={course ? "Хадгалах" : "Нэмэх"}
        pending={pending}
      />
    </form>
  );
}

type SlotRow = { key: number; day: number; period: number };

const slotInputClass =
  "w-full min-w-0 rounded-lg border border-slate-300 bg-surface px-2.5 py-2 text-[15px] text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

/** Хадгалсан цагуудыг (11:20–14:50 гэх мэт) пар бүрээр мөр болгоно. */
function toRows(slots: CourseSlot[] | undefined): SlotRow[] {
  const rows = (slots ?? []).flatMap((slot) =>
    slotPeriods(slot).map((period) => ({
      day: slot.day,
      period: period.number,
    })),
  );
  return (rows.length ? rows : [{ day: 1, period: 1 }]).map((row, key) => ({
    ...row,
    key,
  }));
}

/**
 * Хичээл орох цагууд: гариг + пар. Нэг хичээл олон гарагт, өөр өөр парт
 * орж болно (жишээ нь Даваа 1-р пар, Пүрэв 3-р пар). Хоёр пар дараалан орох
 * бол нэг гарагт хоёр мөр нэмнэ.
 */
function SlotsEditor({
  initial,
  error,
}: {
  initial?: CourseSlot[];
  error?: string;
}) {
  const [rows, setRows] = useState<SlotRow[]>(() => toRows(initial));

  const update = (key: number, patch: Partial<SlotRow>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  const add = () =>
    setRows((current) => {
      const last = current.at(-1) ?? { day: 1, period: 1 };
      const nextKey = Math.max(-1, ...current.map((row) => row.key)) + 1;
      return [
        ...current,
        { day: (last.day % 7) + 1, period: last.period, key: nextKey },
      ];
    });

  const remove = (key: number) =>
    setRows((current) => current.filter((row) => row.key !== key));

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-slate-700">
        Хичээл орох цаг
      </legend>
      <div className="space-y-2">
        {rows.map((row, index) => {
          const period = periodByNumber(row.period) ?? PERIODS[0];
          return (
            <div
              key={row.key}
              className="grid grid-cols-[5.75rem_minmax(0,1fr)_2rem] items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_2.25rem]"
            >
              <input type="hidden" name="slotDay" value={row.day} />
              <input type="hidden" name="slotStart" value={period.start} />
              <input type="hidden" name="slotEnd" value={period.end} />
              <select
                aria-label={`${index + 1}-р мөрийн гариг`}
                className={slotInputClass}
                value={row.day}
                onChange={(event) =>
                  update(row.key, { day: Number(event.target.value) })
                }
              >
                {WEEKDAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
              <select
                aria-label={`${index + 1}-р мөрийн пар`}
                className={cx(slotInputClass, "tabular-nums")}
                value={row.period}
                onChange={(event) =>
                  update(row.key, { period: Number(event.target.value) })
                }
              >
                {PERIODS.map((option) => (
                  <option key={option.number} value={option.number}>
                    {`${option.number}-р пар ${option.start}–${option.end}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title="Хасах"
                aria-label={`${index + 1}-р мөрийг хасах`}
                onClick={() => remove(row.key)}
                disabled={rows.length === 1}
                className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:invisible sm:size-9"
              >
                <TrashIcon className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={add}
        disabled={rows.length >= 21}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-emerald-700 hover:bg-slate-100 disabled:opacity-40"
      >
        <PlusIcon className="size-4" />
        Пар нэмэх
      </button>
      {error && <p className="mt-1 text-[13px] text-rose-700">{error}</p>}
    </fieldset>
  );
}

/**
 * Хичээл ордог ангиудыг сонгоно. Нэг хичээлд олон анги хамт сууж болно
 * (жишээ нь Монголын түүх — 1-р курсийн бүх хөтөлбөр).
 */
function ClassGroupPicker({
  initial,
  error,
}: {
  initial: string[];
  error?: string;
}) {
  const [selected, setSelected] = useState(() => new Set(initial));

  const toggle = (groups: string[]) =>
    setSelected((current) => {
      const next = new Set(current);
      const allOn = groups.every((group) => next.has(group));
      for (const group of groups) {
        if (allOn) next.delete(group);
        else next.add(group);
      }
      return next;
    });

  const yearGroups = (year: number) =>
    PROGRAMS.map((program) => `${program.code}-${year}`);

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-slate-700">
        Ангиуд
      </legend>
      {[...selected].map((group) => (
        <input key={group} type="hidden" name="classGroups" value={group} />
      ))}
      <div className="rounded-lg border border-slate-300 p-2">
        <div className="grid grid-cols-[3.25rem_repeat(4,minmax(0,1fr))] sm:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,3.25rem))] items-center gap-1.5">
          <span className="truncate px-1 text-[13px] text-slate-400">
            <span className="hidden sm:inline">Хөтөлбөр</span>
          </span>
          {COURSE_YEARS.map((year) => {
            const groups = yearGroups(year);
            const allOn = groups.every((group) => selected.has(group));
            return (
              <button
                key={year}
                type="button"
                title={`${year}-р курсийн бүх хөтөлбөр`}
                aria-pressed={allOn}
                onClick={() => toggle(groups)}
                className={cx(
                  "rounded-md py-1 text-[13px] font-medium transition",
                  allOn
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-500 hover:bg-slate-100",
                )}
              >
                {year}-р
              </button>
            );
          })}

          {PROGRAMS.map((program) => (
            <ProgramRow
              key={program.code}
              code={program.code}
              name={program.name}
              selected={selected}
              onToggle={(group) => toggle([group])}
            />
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-[13px] text-slate-400">
        {selected.size
          ? `Сонгосон: ${formatClassGroups([...selected])}`
          : "Курсийн дугаар дээр дарвал тухайн курсийн бүх хөтөлбөр сонгогдоно."}
      </p>
      {error && <p className="mt-1 text-[13px] text-rose-700">{error}</p>}
    </fieldset>
  );
}

function ProgramRow({
  code,
  name,
  selected,
  onToggle,
}: {
  code: string;
  name: string;
  selected: Set<string>;
  onToggle: (group: string) => void;
}) {
  return (
    <>
      <span className="min-w-0 px-1" title={name}>
        <strong className="block text-sm font-semibold text-slate-800">
          {code}
        </strong>
        <small className="hidden truncate text-xs text-slate-400 sm:block">
          {name}
        </small>
      </span>
      {COURSE_YEARS.map((year) => {
        const group = `${code}-${year}`;
        const on = selected.has(group);
        return (
          <button
            key={group}
            type="button"
            aria-pressed={on}
            aria-label={`${name}, ${year}-р курс`}
            onClick={() => onToggle(group)}
            className={cx(
              "h-9 rounded-md border text-sm font-medium transition",
              on
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-200 text-slate-500 hover:border-slate-400",
            )}
          >
            {year}
          </button>
        );
      })}
    </>
  );
}

/* ------------------------------ Оюутан бүртгэх ------------------------------ */

function EnrollmentForm({
  course,
  students,
  onCancel,
  onDone,
}: {
  course: AdminCourse;
  students: AdminUser[];
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [state, onSubmit, pending] = useAdminAction(setEnrollments, onDone);
  const [selected, setSelected] = useState(() => new Set(course.studentIds));
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const visible = students.filter(
    (student) =>
      !query ||
      `${student.name} ${student.studentCode ?? ""} ${student.classGroup ?? ""}`
        .toLowerCase()
        .includes(query),
  );
  const allVisibleSelected =
    visible.length > 0 && visible.every((student) => selected.has(student.id));

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Хичээлийн ангиудад харьяалагдах оюутнууд.
  const classStudents = students.filter(
    (student) =>
      student.classGroup && course.classGroups.includes(student.classGroup),
  );
  const classAllSelected =
    classStudents.length > 0 &&
    classStudents.every((student) => selected.has(student.id));
  const selectClassStudents = () =>
    setSelected((current) => {
      const next = new Set(current);
      for (const student of classStudents) next.add(student.id);
      return next;
    });

  const toggleVisible = () =>
    setSelected((current) => {
      const next = new Set(current);
      for (const student of visible) {
        if (allVisibleSelected) next.delete(student.id);
        else next.add(student.id);
      }
      return next;
    });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="courseId" value={course.id} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="studentIds" value={id} />
      ))}

      {course.classGroups.length > 0 && (
        <button
          type="button"
          onClick={selectClassStudents}
          disabled={classAllSelected || classStudents.length === 0}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-sm text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-surface disabled:text-slate-500"
        >
          <span className="min-w-0">
            <strong className="block font-semibold">
              {formatClassGroups(course.classGroups)}
            </strong>
            <span className="text-[13px]">
              {classStudents.length === 0
                ? "Эдгээр ангид оюутан оноогдоогүй байна"
                : classAllSelected
                  ? `${classStudents.length} оюутан бүгд сонгогдсон`
                  : `Ангийн ${classStudents.length} оюутныг сонгох`}
            </span>
          </span>
          {!classAllSelected && classStudents.length > 0 && (
            <PlusIcon className="size-4 shrink-0" />
          )}
        </button>
      )}

      <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3">
        <span className="text-slate-400" aria-hidden="true">
          ⌕
        </span>
        <input
          className="w-full bg-transparent py-2.5 text-[15px] outline-none placeholder:text-slate-400"
          aria-label="Оюутан хайх"
          placeholder="Нэр, код эсвэл анги"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{selected.size} оюутан сонгосон</span>
        <button
          type="button"
          className="font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-40"
          onClick={toggleVisible}
          disabled={visible.length === 0}
        >
          {allVisibleSelected
            ? "Харагдаж буйг цуцлах"
            : "Харагдаж буйг бүгдийг сонгох"}
        </button>
      </div>

      <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
        {visible.map((student) => (
          <li key={student.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
              <input
                type="checkbox"
                className="size-4 accent-emerald-700"
                checked={selected.has(student.id)}
                onChange={() => toggle(student.id)}
              />
              <span className="min-w-0 flex-1 truncate text-[15px] text-slate-800">
                {student.name}
              </span>
              <span className="shrink-0 text-right text-[13px] text-slate-400">
                <span className="font-mono">{student.studentCode}</span>
                {student.classGroup && (
                  <span className="ml-2 text-slate-600">
                    {student.classGroup}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-slate-500">
            {students.length ? "Оюутан олдсонгүй." : "Бүртгэлтэй оюутан алга."}
          </li>
        )}
      </ul>

      <FormError message={state?.error} />
      <FormActions
        onCancel={onCancel}
        submitLabel="Хадгалах"
        pending={pending}
      />
    </form>
  );
}

function DeleteCourseForm({
  course,
  onCancel,
  onDone,
}: {
  course: AdminCourse;
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [state, onSubmit, pending] = useAdminAction(deleteCourse, onDone);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="id" value={course.id} />
      <p className="text-[15px] text-slate-700">
        <strong>{course.title}</strong> хичээлийг устгах уу? Хичээлийн бүх
        ирцийн түүх хамт устана. Энэ үйлдлийг буцаах боломжгүй.
      </p>
      <FormError message={state?.error} />
      <FormActions
        onCancel={onCancel}
        submitLabel="Устгах"
        pending={pending}
        danger
      />
    </form>
  );
}
