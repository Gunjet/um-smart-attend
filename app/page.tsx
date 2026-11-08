"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

type Role = "teacher" | "student";
type AttendanceStatus = "Ирсэн" | "Хоцорсон" | "Тасалсан" | "Хүлээгдэж байна";
type Student = {
  name: string;
  id: string;
  time: string;
  status: AttendanceStatus;
  initials: string;
  color: string;
};

type AttendanceRecord = {
  date: string;
  courseCode: string;
  courseTitle: string;
  students: Student[];
};

function getLocalDateKey(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const initialStudents: Student[] = [
  {
    name: "Б. Энхжин",
    id: "22B1NUM0142",
    time: "09:02",
    status: "Ирсэн",
    initials: "ЭБ",
    color: "lavender",
  },
  {
    name: "М. Тэмүүлэн",
    id: "22B1NUM0087",
    time: "09:03",
    status: "Ирсэн",
    initials: "ТМ",
    color: "mint",
  },
  {
    name: "С. Номин",
    id: "22B1NUM0215",
    time: "09:04",
    status: "Ирсэн",
    initials: "НС",
    color: "peach",
  },
  {
    name: "Д. Анужин",
    id: "22B1NUM0119",
    time: "09:05",
    status: "Ирсэн",
    initials: "АД",
    color: "blue",
  },
  {
    name: "Г. Мөнх-Оргил",
    id: "22B1NUM0063",
    time: "09:07",
    status: "Хоцорсон",
    initials: "МГ",
    color: "yellow",
  },
  {
    name: "Н. Билгүүн",
    id: "22B1NUM0184",
    time: "—",
    status: "Тасалсан",
    initials: "БН",
    color: "blue",
  },
  {
    name: "Ц. Ариунзаяа",
    id: "22B1NUM0208",
    time: "—",
    status: "Тасалсан",
    initials: "АЦ",
    color: "peach",
  },
  {
    name: "Э. Марал",
    id: "22B1NUM0131",
    time: "—",
    status: "Ирсэн",
    initials: "МЭ",
    color: "lavender",
  },
  {
    name: "Т. Бат-Оргил",
    id: "22B1NUM0196",
    time: "—",
    status: "Ирсэн",
    initials: "БТ",
    color: "mint",
  },
  {
    name: "О. Саруул",
    id: "22B1NUM0224",
    time: "—",
    status: "Ирсэн",
    initials: "СО",
    color: "peach",
  },
  {
    name: "Х. Анхбаяр",
    id: "22B1NUM0108",
    time: "—",
    status: "Ирсэн",
    initials: "АХ",
    color: "blue",
  },
  {
    name: "П. Нандин",
    id: "22B1NUM0167",
    time: "—",
    status: "Ирсэн",
    initials: "НП",
    color: "yellow",
  },
  {
    name: "Ж. Төгөлдөр",
    id: "22B1NUM0230",
    time: "—",
    status: "Ирсэн",
    initials: "ТЖ",
    color: "lavender",
  },
  {
    name: "Л. Энэрэл",
    id: "22B1NUM0095",
    time: "—",
    status: "Ирсэн",
    initials: "ЭЛ",
    color: "mint",
  },
  {
    name: "Б. Амарсанаа",
    id: "22B1NUM0173",
    time: "—",
    status: "Ирсэн",
    initials: "АБ",
    color: "peach",
  },
  {
    name: "Д. Хулан",
    id: "22B1NUM0241",
    time: "—",
    status: "Ирсэн",
    initials: "ХД",
    color: "blue",
  },
  {
    name: "Р. Мөнхжин",
    id: "22B1NUM0126",
    time: "—",
    status: "Ирсэн",
    initials: "МР",
    color: "yellow",
  },
  {
    name: "Ш. Энх-Үжин",
    id: "22B1NUM0189",
    time: "—",
    status: "Ирсэн",
    initials: "ЭШ",
    color: "lavender",
  },
  {
    name: "А. Тэмүүлэн",
    id: "22B1NUM0203",
    time: "—",
    status: "Ирсэн",
    initials: "ТА",
    color: "mint",
  },
  {
    name: "М. Ариунболд",
    id: "22B1NUM0112",
    time: "—",
    status: "Ирсэн",
    initials: "АМ",
    color: "peach",
  },
  {
    name: "С. Уянга",
    id: "22B1NUM0256",
    time: "—",
    status: "Ирсэн",
    initials: "УС",
    color: "blue",
  },
  {
    name: "Н. Билгүүнтөгс",
    id: "22B1NUM0158",
    time: "—",
    status: "Ирсэн",
    initials: "БН",
    color: "yellow",
  },
  {
    name: "Ц. Мишээл",
    id: "22B1NUM0262",
    time: "—",
    status: "Ирсэн",
    initials: "МЦ",
    color: "lavender",
  },
  {
    name: "Г. Бат-Эрдэнэ",
    id: "22B1NUM0079",
    time: "—",
    status: "Ирсэн",
    initials: "БГ",
    color: "mint",
  },
  {
    name: "З. Солонго",
    id: "22B1NUM0271",
    time: "—",
    status: "Ирсэн",
    initials: "СЗ",
    color: "peach",
  },
  {
    name: "У. Ихбаяр",
    id: "22B1NUM0284",
    time: "—",
    status: "Ирсэн",
    initials: "ИУ",
    color: "blue",
  },
  {
    name: "Ч. Номин-Эрдэнэ",
    id: "22B1NUM0290",
    time: "—",
    status: "Ирсэн",
    initials: "НЧ",
    color: "yellow",
  },
  {
    name: "В. Мөнхсайхан",
    id: "22B1NUM0301",
    time: "—",
    status: "Ирсэн",
    initials: "МВ",
    color: "lavender",
  },
  {
    name: "Ё. Ану",
    id: "22B1NUM0312",
    time: "—",
    status: "Ирсэн",
    initials: "АЁ",
    color: "mint",
  },
  {
    name: "И. Хүслэн",
    id: "22B1NUM0323",
    time: "—",
    status: "Ирсэн",
    initials: "ХИ",
    color: "peach",
  },
  {
    name: "Д. Ганзориг",
    id: "22B1NUM0331",
    time: "—",
    status: "Ирсэн",
    initials: "ГД",
    color: "blue",
  },
  {
    name: "Б. Баянзул",
    id: "22B1NUM0340",
    time: "—",
    status: "Ирсэн",
    initials: "ББ",
    color: "yellow",
  },
];

const courses = [
  {
    title: "Хиймэл оюун ухааны үндэс",
    code: "CS304 · Лекц 02",
    room: "ШУТИС, Е-604",
    time: "09:00 — 10:30",
    students: 24,
  },
  {
    title: "Өгөгдлийн бүтэц",
    code: "CS202 · Лекц 01",
    room: "ШУТИС, Е-502",
    time: "11:00 — 12:30",
    students: 32,
  },
  {
    title: "Програм хангамжийн инженерчлэл",
    code: "CS305 · Семинар 03",
    room: "ШУТИС, Е-411",
    time: "14:00 — 15:30",
    students: 28,
  },
];

const studentCourseHistory = [
  { meetings: 14, late: 2, absent: 1 },
  { meetings: 12, late: 1, absent: 0 },
  { meetings: 9, late: 1, absent: 2 },
];

const mongolianMonths = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];
const mongolianWeekdays = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];

function formatMongolianDate(timestamp: number, withYear = false) {
  const date = new Date(timestamp);
  const dateText = `${mongolianMonths[date.getMonth()]} ${date.getDate()}`;
  return withYear
    ? `${date.getFullYear()} оны ${dateText}, ${mongolianWeekdays[date.getDay()]} гараг`
    : `${dateText}, ${mongolianWeekdays[date.getDay()]}`;
}

export default function Home() {
  const [role, setRole] = useState<Role>("teacher");
  const [loginRole, setLoginRole] = useState<Role>("teacher");
  const [authenticated, setAuthenticated] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [deviceStatus, setDeviceStatus] = useState(
    "Төхөөрөмж эхний нэвтрэлтээр нэг удаа бүртгэгдэнэ.",
  );
  const [attendanceFilter, setAttendanceFilter] = useState<
    "all" | "late" | "absent"
  >("all");
  const [selectedCourse, setSelectedCourse] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionCourseIndex, setSessionCourseIndex] = useState<number | null>(
    null,
  );
  const [sessionId, setSessionId] = useState("");
  const [qrData, setQrData] = useState("");
  const [students, setStudents] = useState(initialStudents);
  const [scanStage, setScanStage] = useState<
    "ready" | "scanning" | "verify" | "done"
  >("ready");
  const [scanMessage, setScanMessage] = useState("");
  const [checks, setChecks] = useState({ location: false, face: false });
  const [locationLabel, setLocationLabel] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [selfie, setSelfie] = useState("");
  const [showSelfieCamera, setShowSelfieCamera] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);
  const [now, setNow] = useState(0);
  const qrCycle = Math.floor(now / 30_000);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
  } | null>(null);

const [showTeacherReport, setShowTeacherReport] = useState(false);
const [attendanceRecords, setAttendanceRecords] =
  useState<AttendanceRecord[]>([]);

const [reportMonth, setReportMonth] = useState("");
const [reportCourse, setReportCourse] = useState("all");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sessionActive || !sessionId) return;
    QRCode.toDataURL(`UM-SMART-ATTEND:${sessionId}:${qrCycle}`, {
      width: 240,
      margin: 1,
      color: { dark: "#15221f", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then(setQrData)
      .catch(() => setQrData(""));
  }, [qrCycle, sessionActive, sessionId]);

  useEffect(
    () => () => {
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      if (scannerRef.current)
        void scannerRef.current.stop().catch(() => undefined);
    },
    [],
  );

  const startSession = () => {
    setNow(Date.now());
    setStudents(
      initialStudents
        .slice(0, courses[selectedCourse].students)
        .map((student) => ({
          ...student,
          time: "—",
          status: "Хүлээгдэж байна",
        })),
    );
    setSessionCourseIndex(selectedCourse);
    setSessionId(
      `CS304-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    );
    setSessionActive(true);
    setNotice("Ирцийн бүртгэл эхэллээ. QR код 30 секунд тутам шинэчлэгдэнэ.");
  };

const closeSession = () => {
  const finalStudents = students.map((student) =>
    student.status === "Хүлээгдэж байна"
      ? { ...student, status: "Тасалсан" as AttendanceStatus }
      : student
  );

  setStudents(finalStudents);

  if (sessionCourseIndex !== null) {
    const selected = courses[sessionCourseIndex];

    setAttendanceRecords((previous) => [
      ...previous,
      {
        date: getLocalDateKey(Date.now()),
        courseCode: selected.code,
        courseTitle: selected.title,
        students: finalStudents,
      },
    ]);
  }

  setSessionActive(false);
  setQrData("");
  setNotice("Хичээлийн ирцийн бүртгэл хаагдлаа.");
};

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* camera may already be stopped */
      }
      scannerRef.current.clear();
      scannerRef.current = null;
    }
  }, []);

  const acceptScan = useCallback(
    (value: string) => {
      if (!sessionActive || !sessionId) {
        setScanMessage(
          "Одоогоор идэвхтэй ирцийн QR алга байна. Багшийн бүртгэл эхэлсэн эсэхийг шалгана уу.",
        );
        return;
      }
      const [prefix, codeSessionId, tickValue] = value.split(":");
      const tokenIsCurrent =
        Number.isInteger(Number(tickValue)) &&
        Number(tickValue) === Math.floor(Date.now() / 30_000);
      if (
        prefix === "UM-SMART-ATTEND" &&
        codeSessionId === sessionId &&
        tokenIsCurrent
      ) {
        setScanStage("verify");
        setScanMessage("");
        void stopScanner();
      } else {
        setScanMessage(
          "QR код буруу эсвэл хугацаа нь дууссан байна. Дэлгэц дээрх шинэ кодыг уншуулна уу.",
        );
      }
    },
    [sessionActive, sessionId, stopScanner],
  );

  const startScanner = async () => {
    setScanMessage("");
    setScanStage("scanning");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("student-qr-reader", { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (text) => acceptScan(text),
        () => undefined,
      );
    } catch {
      setScanMessage(
        "Камер нээж чадсангүй. Зөвшөөрлөө шалгах эсвэл demo код ашиглана уу.",
      );
    }
  };

  const useDemoQr = () => {
    if (!sessionActive || !sessionId) {
      setScanMessage("Эхлээд багшийн эрхээр ирцийн бүртгэл эхлүүлнэ үү.");
      return;
    }
    acceptScan(
      `UM-SMART-ATTEND:${sessionId}:${Math.floor(Date.now() / 30_000)}`,
    );
  };

  const checkLocation = () => {
    setScanMessage("");
    if (!navigator.geolocation) {
      setScanMessage(
        "Энэ төхөөрөмж байршлын үйлчилгээг дэмжихгүй байна. Demo шалгалтыг ашиглаж болно.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setChecks((current) => ({ ...current, location: true }));
        setLocationLabel(
          `Байршил авлаа · ±${Math.round(position.coords.accuracy)} м нарийвчлал`,
        );
        setScanMessage("");
      },
      () =>
        setScanMessage(
          "Байршлын зөвшөөрөл олгогдсонгүй. Browser-ийн тохиргооноос зөвшөөрөх эсвэл demo-г сонгоно уу.",
        ),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  };

  const useDemoLocation = () => {
    setChecks((current) => ({ ...current, location: true }));
    setLocationLabel("Demo байршил · GPS радиус шалгаагүй");
    setScanMessage("");
  };

  const startSelfie = async () => {
    setCameraError("");
    setShowSelfieCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      mediaRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError(
        "Камерын зөвшөөрөл олгогдсонгүй. Demo selfie ашиглан алхмыг үргэлжлүүлж болно.",
      );
    }
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setCameraError("Камерын дүрс хараахан бэлэн болоогүй байна.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setSelfie(canvas.toDataURL("image/jpeg", 0.72));
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    mediaRef.current = null;
    setShowSelfieCamera(false);
    setChecks((current) => ({ ...current, face: true }));
  };

  const finishDemoSelfie = () => {
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    mediaRef.current = null;
    setSelfie("");
    setCameraError("");
    setShowSelfieCamera(false);
    setChecks((current) => ({ ...current, face: true }));
  };

  const submitAttendance = () => {
    const id = studentCode || "DEMO-001";
    const currentRecord = students.find((student) => student.id === id);
    const name = currentRecord?.name ?? `Оюутан ${id}`;
    const time = new Date().toLocaleTimeString("mn-MN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setStudents((current) =>
      current.some((student) => student.id === id)
        ? current.map((student) =>
            student.id === id
              ? { ...student, name, time, status: "Ирсэн" }
              : student,
          )
        : [
            { name, id, time, status: "Ирсэн", initials: "OD", color: "mint" },
            ...current,
          ],
    );
    setScanStage("done");
    setNotice(`${id} кодтой оюутны ирц бүртгэгдлээ.`);
  };

  const resetStudent = () => {
    setScanStage("ready");
    setChecks({ location: false, face: false });
    setScanMessage("");
    setLocationLabel("");
    setSelfie("");
    setShowSelfieCamera(false);
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    mediaRef.current = null;
  };
const currentReportMonth =
  reportMonth ||
  (now
    ? `${new Date(now).getFullYear()}-${String(
        new Date(now).getMonth() + 1
      ).padStart(2, "0")}`
    : "");

const filteredRecords = attendanceRecords
  .filter((record) => record.date.startsWith(currentReportMonth))
  .filter(
    (record) =>
      reportCourse === "all" ||
      record.courseCode === reportCourse
  )
  .sort((a, b) => a.date.localeCompare(b.date));

const reportDates = [
  ...new Set(filteredRecords.map((record) => record.date)),
].sort();

const reportStudents = Array.from(
  new Map(
    filteredRecords.flatMap((record) =>
      record.students.map((student) => [student.id, student])
    )
  ).values()
);
  const course = courses[selectedCourse];
  const remaining = now ? 30 - Math.floor((now / 1000) % 30) : 30;
  const onTimeCount = students.filter(
    (student) => student.status === "Ирсэн",
  ).length;
  const attendedCount =
    onTimeCount +
    students.filter((student) => student.status === "Хоцорсон").length;
  const lateCount = students.filter(
    (student) => student.status === "Хоцорсон",
  ).length;
  const absentCount = students.filter(
    (student) => student.status === "Тасалсан",
  ).length;
  const filteredStudents = students.filter((student) => {
    const matchesSearch = `${student.name} ${student.id}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      attendanceFilter === "all" ||
      (attendanceFilter === "late" && student.status === "Хоцорсон") ||
      (attendanceFilter === "absent" && student.status === "Тасалсан");
    return matchesSearch && matchesStatus;
  });
  const present = attendedCount;
  const progress = Math.min(100, Math.round((present / course.students) * 100));
  const hasCourseSession = sessionCourseIndex === selectedCourse;
  const studentLateTotal = studentCourseHistory.reduce(
    (total, item) => total + item.late,
    0,
  );
  const studentAbsentTotal = studentCourseHistory.reduce(
    (total, item) => total + item.absent,
    0,
  );

  const signIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (loginRole === "student") {
      setStudentCode(String(formData.get("studentCode") ?? "").trim());
    }
    try {
      const key = `um-smart-attend-device:${loginRole}`;
      if (window.localStorage.getItem(key)) {
        setDeviceStatus("Энэ төхөөрөмж өмнө бүртгэгдсэн байна.");
      } else {
        const deviceId =
          window.crypto?.randomUUID?.() ??
          `device-${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem(key, deviceId);
        setDeviceStatus("Энэ төхөөрөмж эхний нэвтрэлтээр бүртгэгдлээ.");
      }
    } catch {
      setDeviceStatus(
        "Төхөөрөмжийн бүртгэл хадгалагдсангүй. Demo нэвтрэлт үргэлжилнэ.",
      );
    }
    setRole(loginRole);
    setAuthenticated(true);
  };

  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
  const primaryButtonClass =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300";
  const roleButtonClass =
    "flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition";

  if (!authenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8 text-slate-800">
        <section
          id="login"
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9"
        >
          <a className="mb-8 inline-flex" href="#login" aria-label="ШУТИС">
            <Image
              unoptimized
              src="umtds-logo.png"
              alt="Шинжлэх ухаан, технологийн их сургууль"
              width={2255}
              height={396}
              priority
              className="h-10 w-auto object-contain"
            />
          </a>
          <div className="mb-6">
            <p className="mb-2 text-xs font-bold tracking-[0.16em] text-blue-900">
              ШУТИС · ИРЦ БҮРТГЭЛ
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Системд нэвтрэх
            </h2>
            {/* <p className="mt-2 text-sm text-slate-500">Өөрийн эрхээр нэвтэрч үргэлжлүүлнэ үү.</p> */}
          </div>
          <div
            className="mb-6 grid grid-cols-2 gap-3"
            role="group"
            aria-label="Нэвтрэх эрх сонгох"
          >
            <button
              type="button"
              className={`${roleButtonClass} ${loginRole === "teacher" ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300"}`}
              onClick={() => setLoginRole("teacher")}
              aria-pressed={loginRole === "teacher"}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-950">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
                  <circle cx="12" cy="9" r="2.4" />
                  <path
                    d="M7.8 17.5c.6-2.1 2.1-3.2 4.2-3.2s3.6 1.1 4.2 3.2M8 5.8h2M14 5.8h2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>
                <strong className="block text-sm">Багш</strong>
                <small className="mt-1 block text-xs text-slate-500">
                  Хичээл, ирц удирдах
                </small>
              </span>
            </button>
            <button
              type="button"
              className={`${roleButtonClass} ${loginRole === "student" ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300"}`}
              onClick={() => setLoginRole("student")}
              aria-pressed={loginRole === "student"}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path
                    d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.5 11v5.1c3.4 2.8 7.6 2.8 11 0V11M21.5 9v6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>
                <strong className="block text-sm">Оюутан</strong>
                <small className="mt-1 block text-xs text-slate-500">
                  Ирцээ бүртгүүлэх
                </small>
              </span>
            </button>
          </div>
          <form className="space-y-4" onSubmit={signIn}>
            <input
              className={fieldClass}
              id="login-identifier"
              name={loginRole === "teacher" ? "teacherEmail" : "studentCode"}
              type="text"
              autoComplete="username"
              placeholder={
                loginRole === "teacher" ? "name@school.edu.mn" : "Оюутны код"
              }
              required
            />

            <input
              className={fieldClass}
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Нууц үгээ оруулна уу"
              required
            />

            <div className="flex justify-end">
              <button
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                type="button"
                onClick={() =>
                  setNotice("Нууц үг сэргээх demo холбоос идэвхгүй байна.")
                }
              >
                Нууц үг мартсан уу?
              </button>
            </div>

            <button
              className={`${primaryButtonClass} w-full justify-between`}
              type="submit"
            >
              {loginRole === "teacher"
                ? "Багшаар нэвтрэх"
                : "Оюутнаар нэвтрэх"}
              <span>→</span>
            </button>
          </form>
          {notice && (
            <div
              className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
              role="status"
            >
              {notice}
              <button onClick={() => setNotice("")} aria-label="Мэдэгдэл хаах">
                ×
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        <a
          className="mb-10 inline-flex items-center gap-3 px-2"
          href="#home"
          aria-label="ШУТИС"
        >
          <Image
            unoptimized
            src="umtds-logo.png"
            alt="Шинжлэх ухаан, технологийн их сургууль"
            width={2255}
            height={396}
            priority
            className="h-9 w-auto max-w-full object-contain"
          />
        </a>
        <p className="mb-3 px-2 text-[10px] font-bold tracking-widest text-slate-400">
          СУРГАЛТЫН СИСТЕМ
        </p>
        <nav className="space-y-1" aria-label="Үндсэн цэс">
          {role === "teacher" ? (
            <>
              <button className="flex w-full items-center gap-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-left text-sm font-medium text-emerald-800">
                ▦ Хяналтын самбар
              </button>
<button
  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"
  onClick={() => setShowTeacherReport(true)}
>
  ▤ Ирцийн тайлан
</button>
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"
                onClick={() =>
                  setNotice(
                    "Хичээлийн тохиргоо demo хувилбарт хараахан идэвхжээгүй.",
                  )
                }
              >
                ⚙ Тохиргоо
              </button>
            </>
          ) : (
            <button className="w-full rounded-lg bg-emerald-50 px-3 py-2.5 text-left text-sm font-medium text-emerald-800">
              ▣ Миний ирц
            </button>
          )}
        </nav>
        <div className="mt-auto border-t border-slate-200 pt-4">
          <button
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"
            onClick={() => {
              setLoginRole(role);
              setAuthenticated(false);
            }}
            aria-label="Системээс гарах"
          >
            <span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
              {role === "teacher" ? "БЭ" : "ОД"}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm">
                {role === "teacher" ? "Б. Энхтөр" : "Оюутан Demo"}
              </strong>
              <small className="text-xs text-slate-500">
                {role === "teacher" ? "Багшийн эрх" : "Оюутны эрх"}
              </small>
            </span>
            <span>↪</span>
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:ml-60 md:px-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Нүүр</span>
          <span>/</span>
          <strong className="text-slate-800">
            {role === "teacher" ? "Хяналтын самбар" : "Миний ирц"}
          </strong>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-500 sm:block">
            {now ? formatMongolianDate(now) : "Өнөөдөр"}
          </span>
          <button
            className="relative grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600"
            aria-label="Мэдэгдэл"
            onClick={() => setNotice("Шинэ мэдэгдэл алга байна.")}
          >
            ♧
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-400" />
          </button>
          <span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
            {role === "teacher" ? "БЭ" : studentCode.slice(-2) || "О"}
          </span>
        </div>
      </header>
      {notice && (
        <div
          className="fixed right-4 top-20 z-30 flex max-w-sm items-center gap-3 rounded-lg border border-emerald-200 bg-white p-3 text-sm shadow-lg"
          role="status"
        >
          <span className="text-emerald-700">✓</span>
          {notice}
          <button
            className="ml-auto text-lg text-slate-500"
            onClick={() => setNotice("")}
            aria-label="Мэдэгдэл хаах"
          >
            ×
          </button>
        </div>
      )}

      {role === "teacher" ? (
        <div
          className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8"
          id="home"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold tracking-widest text-slate-500">
                2025–2026 ОНЫ ХИЧЭЭЛИЙН ЖИЛ
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Өглөөний мэнд, Энхтөр <span className="text-amber-500">✦</span>
              </h1>
            </div>
            <button
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300"
              onClick={() =>
                setNotice("Ирцийн тайлан бэлэн болмогц эндээс татаж авна.")
              }
            >
              ↧ Тайлан татах
            </button>
          </div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 text-lg">
                Өнөөдрийн хичээлүүд
              </h2>
              <p className="mt-1 text-[14px] text-slate-500">
                {now ? formatMongolianDate(now, true) : "Өнөөдрийн хуваарь"}
              </p>
            </div>
            <button
              className="text-[14px] font-medium text-emerald-700 hover:text-emerald-900"
              onClick={() =>
                setNotice("Бүх хичээлийг харуулах нь demo хувилбарт идэвхгүй.")
              }
            >
              Бүгдийг харах →
            </button>
          </div>
          <div className="mb-8 space-y-2">
            {courses.map((item, index) => (
              <button
                key={item.code}
                className={`grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-white p-3 text-left transition sm:grid-cols-[36px_minmax(0,1.5fr)_minmax(120px,1fr)_90px_auto_16px] sm:gap-4 sm:px-4 ${selectedCourse === index ? "border-emerald-300 shadow-sm" : "border-slate-200 hover:border-emerald-200"}`}
                onClick={() => {
                  if (sessionActive && selectedCourse !== index)
                    setNotice(
                      "Өөр хичээл сонгохын өмнө одоогийн ирцийн бүртгэлийг хаана уу.",
                    );
                  else setSelectedCourse(index);
                }}
              >
                <span
                  className="grid size-9 place-items-center rounded-lg"
                >
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-[14px] font-semibold text-slate-800">
                    {item.title}
                  </strong>
                  <small className="mt-1 block text-[12px] text-slate-500">
                    {item.code}
                  </small>
                </span>
                <span className="hidden text-[12px] text-slate-500 sm:block">
                  ◷ {item.time}
                  {/* <br />⌖ {item.room} */}
                </span>
                <span className="hidden text-xs text-slate-600 sm:block">
                  {hasCourseSession && index === selectedCourse ? present : ""}
                  <span className="text-slate-400">
                    {hasCourseSession && index === selectedCourse
                      ? ` / ${item.students}`
                      : ""}
                  </span>
                </span>
                <span
                  className={`text-right text-[12px] ${sessionActive && selectedCourse === index ? "text-emerald-700" : hasCourseSession && selectedCourse === index ? "text-slate-500" : "text-amber-700"}`}
                >
                  ●{" "}
                  <span className="hidden lg:inline">
                    {sessionActive && selectedCourse === index
                      ? "Бүртгэл явагдаж байна"
                      : hasCourseSession && selectedCourse === index
                        ? "Бүртгэл хаагдсан"
                        : index === 0
                          ? "Эхлэхэд бэлэн"
                          : "Удахгүй"}
                  </span>
                </span>
                <span className="text-right text-slate-400">›</span>
              </button>
            ))}
          </div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-semibold text-lg text-slate-900">Ирцийн бүртгэл</h2>
            </div>
            {sessionActive && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-800">
                ● LIVE ОДОО
              </span>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-bold tracking-widest text-slate-400">
                    {sessionActive ? "ИДЭВХТЭЙ ХИЧЭЭЛ" : "СОНГОСОН ХИЧЭЭЛ"}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-800">
                    {course.title}
                  </h3>
                  <p className="mt-1 text-[14px] text-slate-500">
                    {course.code} · {course.time}
                  </p>
                </div>
              </div>
              <div className="my-4 border-t border-slate-100" />
              {sessionActive ? (
                <div className="flex flex-col items-center gap-5 py-2 sm:flex-row sm:justify-center">
                  <div className="grid size-48 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white p-2">
                    {qrData ? (
                      <Image
                        unoptimized
                        src={qrData}
                        alt="Ирц бүртгүүлэх QR код"
                        width={220}
                        height={220}
                        className="size-full"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">
                        QR бэлдэж байна…
                      </span>
                    )}
                  </div>
                  <div className="w-full max-w-xs">
                    <p className="text-[10px] font-bold tracking-widest text-emerald-700">
                      ● QR КОД ИДЭВХТЭЙ
                    </p>
                    <h4 className="mt-2 text-sm font-semibold">
                      QR кодыг дэлгэцээр харуулна уу
                    </h4>
                    <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                      <span className="text-slate-500">Код шинэчлэгдэхэд</span>
                      <strong className="tabular-nums text-emerald-700">
                        00:{String(remaining).padStart(2, "0")}
                      </strong>
                    </div>
                    <p className="my-3 flex justify-between text-[10px] text-slate-500">
                      Session ID{" "}
                      <strong className="text-slate-700">{sessionId}</strong>
                    </p>
                    <button
                      className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      onClick={closeSession}
                    >
                      Ирцийн бүртгэл хаах
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 text-center">
                  <button
                    className={`${primaryButtonClass} mt-4`}
                    onClick={startSession}
                  >
                    ▶ Ирц нээх
                  </button>
                </div>
              )}
            </section>
            <aside
              className={`rounded-xl border border-slate-200 bg-white p-4 sm:p-5 ${hasCourseSession ? "block" : "hidden"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Ирцийн явц</h3>
                  <p className="mt-1 text-[14px] text-slate-500">
                    Өнөөдрийн бүртгэл
                  </p>
                </div>
                <button
                  className="rounded border border-slate-200 px-2 text-slate-500"
                  aria-label="Дэлгэрэнгүй"
                  onClick={() => setNotice("Ирцийн явц шинэчлэгдлээ.")}
                >
                  ···
                </button>
              </div>
              <div className="my-4">
                <p className="text-2xl font-semibold text-emerald-700">
                  {progress}%{" "}
                  <span className="text-[14px] font-normal text-slate-500">
                    ({present}/{course.students}) бүртгэгдсэн
                  </span>
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-600" />
                </div>
                <p className="mt-1 text-[14px] text-slate-500">
                  {course.students - present} оюутан хүлээгдэж байна
                </p>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 py-2">
                <strong className="text-[14px]">Ангийн оюутнууд</strong>
                <span className="text-[14px] text-slate-500">
                  {students.length} / {course.students}
                </span>
              </div>
              <label className="my-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3">
                <span className="text-slate-400">⌕</span>
                <input
                  className="w-full py-2 text-[12px] outline-none placeholder:text-slate-400"
                  aria-label="Оюутан хайх"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Нэр эсвэл ID хайх"
                />
              </label>
              <div className="mb-2 flex flex-wrap gap-2">
                <button
                  className={`rounded-full border px-3 py-1 text-[12px] ${attendanceFilter === "all" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}
                  onClick={() => setAttendanceFilter("all")}
                >
                  Бүгд {students.length}
                </button>
                <button
                  className={`rounded-full border px-3 py-1 text-[12px] ${attendanceFilter === "late" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600"}`}
                  onClick={() => setAttendanceFilter("late")}
                >
                  Хоцорсон {lateCount}
                </button>
                <button
                  className={`rounded-full border px-3 py-1 text-[12px] ${attendanceFilter === "absent" ? "border-rose-300 bg-rose-50 text-rose-800" : "border-slate-200 text-slate-600"}`}
                  onClick={() => setAttendanceFilter("absent")}
                >
                  Тасалсан {absentCount}
                </button>
              </div>
              <div className="max-h-64 divide-y divide-slate-100 overflow-auto">
                {filteredStudents.map((student) => (
                  <div
                    className="flex min-h-12 items-center gap-2 py-2"
                    key={student.id}
                  >
                    <span className="grid size-8 text-[14px] shrink-0 place-items-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-700">
                      {student.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-[14px] truncate text-[10px]">
                        {student.name}
                      </strong>
                      <small className="text-[12px] text-slate-400">
                        {student.id}
                      </small>
                    </span>
                    <span className="text-right">
                      <strong className="block text-[12px] text-slate-600">
                        {student.time}
                      </strong>
                      <small
                        className={`text-[12px] ${student.status === "Ирсэн" ? "text-emerald-700" : student.status === "Хоцорсон" ? "text-amber-700" : student.status === "Тасалсан" ? "text-rose-700" : "text-slate-500"}`}
                      >
                        {student.status}
                      </small>
                    </span>
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="py-5 text-center text-xs text-slate-500">
                    Оюутан олдсонгүй.
                  </p>
                )}
              </div>
              <button
                className="mt-3 w-full text-center text-xs font-medium text-emerald-700"
                onClick={() =>
                  setNotice(
                    `Нийт ${students.length} оюутны бүртгэлийн жагсаалт.`,
                  )
                }
              >
                Бүх бүртгэлийг харах →
              </button>
            </aside>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-5 sm:px-6 md:ml-60 md:pt-8">
          <div className="mb-6 flex items-center justify-between md:hidden">
            <a
              className="inline-flex items-center gap-2 font-bold"
              href="#home"
              aria-label="ШУТИС"
            >
              <Image
                unoptimized
                src="umtds-logo.png"
                alt="Шинжлэх ухаан, технологийн их сургууль"
                width={2255}
                height={396}
                className="h-8 w-auto max-w-48 object-contain"
              />
            </a>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500">
              CS304 · Лекц 02
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Сайн байна уу, <span className="text-emerald-700">оюутан!</span>
          </h1>
          <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span
                className={`rounded-full px-3 py-1 text-[12px] font-medium ${sessionActive ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
              >
                ● {sessionActive ? "Ирц авч байна" : "Ирц эхлээгүй"}
              </span>
            </div>
            <h2 className="mt-3 text-[14px] font-semibold">{course.title}</h2>
            <p className="mt-1 text-[12px] text-slate-500">
              {course.code} · {course.room}
            </p>
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-[12px] text-slate-500">
              <span>◷ {course.time}</span>
              <span>Багш: Б. Энхтөр</span>
            </div>
          </section>
          <div className="mb-3 mt-7">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Миний ирцийн тойм
            </h2>
            <p className="mt-1 text-[14px] text-slate-500">
              Энэ улирлын нийт үзүүлэлт
            </p>
          </div>
          <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
                ✓
              </span>
              <p className="mt-3 text-[12px] text-slate-500 sm:text-[12px]">
                Ирсэн
              </p>
              <strong className="mt-1 block text-2xl font-bold text-slate-900 sm:text-3xl">
                {studentCourseHistory.reduce(
                  (total, item) =>
                    total + item.meetings - item.late - item.absent,
                  0,
                )}
              </strong>
              <small className="text-[12px] text-slate-400 sm:text-[12px]">
                хичээл
              </small>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-lg text-amber-700">
                ◷
              </span>
              <p className="mt-3 text-[12px] text-slate-500 sm:text-[12px]">
                Хоцорсон
              </p>
              <strong className="mt-1 block text-2xl font-bold text-slate-900 sm:text-3xl">
                {studentLateTotal}
              </strong>
              <small className="text-[12px] text-slate-400 sm:text-[12px]">
                удаа
              </small>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
              <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-lg text-rose-600">
                ×
              </span>
              <p className="mt-3 text-[12px] text-slate-500 sm:text-[12px]">
                Тасалсан
              </p>
              <strong className="mt-1 block text-2xl font-bold text-slate-900 sm:text-3xl">
                {studentAbsentTotal}
              </strong>
              <small className="text-[12px] text-slate-400 sm:text-[12px]">
                хичээл
              </small>
            </article>
          </div>
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Хичээл тус бүрийн ирц
                </h2>
                <p className="mt-1 text-[14px] text-slate-500">
                  Таны энэ улирлын үзүүлэлт
                </p>
              </div>
              <button
                className="shrink-0 text-[14px] font-semibold text-emerald-700 hover:text-emerald-900"
                onClick={() => setShowAttendanceDetails((value) => !value)}
              >
                {showAttendanceDetails ? "Хураах ↑" : "Дэлгэрэнгүй ›"}
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {courses.map((item, index) => {
                const history = studentCourseHistory[index];
                const attended =
                  history.meetings - history.late - history.absent;
                const percentage = Math.round(
                  (attended / history.meetings) * 100,
                );
                const teacherNames = [
                  "Багш Б. Бат-Эрдэнэ",
                  "Багш Д. Саруул",
                  "Багш О. Тэмүүлэн",
                ];
                return (
                  <div className="py-5 first:pt-1 last:pb-1" key={item.code}>
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-bold"
                      >
                        {item.title.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-[14px] font-semibold text-slate-900">
                          {item.title}
                        </strong>
                        <small className="mt-1 block text-[12px] text-slate-500">
                          {teacherNames[index]}
                        </small>
                      </div>
                      <div className="shrink-0 text-right">
                        <strong
                          className={`text-xl font-bold ${percentage < 80 ? "text-amber-600" : "text-emerald-700"}`}
                        >
                          {percentage}%
                        </strong>
                        <small className="mt-1 block text-[12px] text-slate-400">
                          {attended}/{history.meetings} хичээл
                        </small>
                      </div>
                    </div>
                    <div className="ml-0 mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 sm:ml-15">
                      <div
                        className={`h-full rounded-full ${percentage < 80 ? "bg-amber-500" : "bg-emerald-600"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {showAttendanceDetails && (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pl-0 text-[10px] sm:pl-15">
                        <span className="text-emerald-700">
                          {attended} ирсэн
                        </span>
                        <span className="text-amber-700">
                          {history.late} хоцорсон
                        </span>
                        <span className="text-rose-600">
                          {history.absent} тасалсан
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">Ирцээ бүртгүүлэх</h2>
            </div>
            <span className="text-[14px] font-semibold text-slate-500">
              0
              {scanStage === "ready" || scanStage === "scanning"
                ? "1"
                : scanStage === "verify"
                  ? "2"
                  : "3"}{" "}
              / 03
            </span>
          </div>
          {scanStage === "ready" || scanStage === "scanning" ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">
                  01
                </span>
                <div>
                  <h3 className="text-[14px] font-semibold">QR код уншуулах</h3>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Багшийн дэлгэц дээрх QR кодыг камертаа тааруулна уу.
                  </p>
                </div>
              </div>
              <div className="relative mx-auto my-4 grid aspect-square w-full max-w-xs place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <div
                  id="student-qr-reader"
                  className="absolute inset-0 z-10 h-full w-full"
                />
                {scanStage !== "scanning" && (
                  <div className="pointer-events-none flex flex-col items-center gap-3 text-center text-slate-500">
                    <span className="relative grid size-28 place-items-center text-5xl text-emerald-600">
                      <i className="absolute left-0 top-0 size-5 border-l-2 border-t-2 border-emerald-600" />
                      <i className="absolute right-0 top-0 size-5 border-r-2 border-t-2 border-emerald-600" />
                      <i className="absolute bottom-0 right-0 size-5 border-b-2 border-r-2 border-emerald-600" />
                      <i className="absolute bottom-0 left-0 size-5 border-b-2 border-l-2 border-emerald-600" />
                      ▦
                    </span>
                    <strong className="text-xs font-medium">
                      Камераа QR код руу чиглүүлнэ үү
                    </strong>
                    <small className="text-[10px] text-slate-400">
                      QR кодыг хүрээн дотор байрлуулна уу
                    </small>
                  </div>
                )}
              </div>
              {scanMessage && (
                <p
                  className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
                  role="alert"
                >
                  ⚠ {scanMessage}
                </p>
              )}
              <button
                className={`${primaryButtonClass} w-full`}
                onClick={
                  scanStage === "scanning"
                    ? () => {
                        void stopScanner();
                        setScanStage("ready");
                      }
                    : startScanner
                }
              >
                {scanStage === "scanning" ? "Камер зогсоох" : "▣ Камер нээх"}
              </button>
              <button
                className="mx-auto mt-3 block px-3 py-1 text-xs font-medium text-emerald-700"
                onClick={useDemoQr}
              >
                Demo QR код ашиглах
              </button>
            </section>
          ) : scanStage === "verify" ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-3 rounded-lg bg-emerald-50 p-3">
                <span className="grid size-7 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800">
                  ✓
                </span>
                <span>
                  <strong className="block text-xs text-emerald-900">
                    QR код амжилттай уншигдлаа
                  </strong>
                  <small className="text-[10px] text-emerald-800">
                    {course.title} · {course.room}
                  </small>
                </span>
              </div>
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">
                  02
                </span>
                <div>
                  <h3 className="text-xs font-semibold">Баталгаажуулалт</h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Дараах шалгалтыг хийнэ үү.
                  </p>
                </div>
              </div>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                <div className="flex min-h-14 items-center gap-3 p-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-600">
                    ⌖
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[10px]">
                      Байршлын шалгалт
                    </strong>
                    <small className="text-[9px] text-slate-500">
                      {locationLabel || "Байршлын зөвшөөрлөөр шалгана"}
                    </small>
                  </span>
                  {checks.location ? (
                    <span className="font-bold text-emerald-700">✓</span>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border border-slate-200 px-2 py-1 text-[9px] font-medium text-slate-700"
                        onClick={checkLocation}
                      >
                        Зөвшөөрөх
                      </button>
                      <button
                        className="rounded-md border border-slate-200 px-2 py-1 text-[9px] font-medium text-slate-700"
                        onClick={useDemoLocation}
                      >
                        Demo
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex min-h-14 items-center gap-3 p-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-600">
                    ◉
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[10px]">Нүүрний зураг</strong>
                    <small className="text-[9px] text-slate-500">
                      {selfie
                        ? "Selfie авлаа · бодит танилт биш"
                        : "Камераар selfie авах"}
                    </small>
                  </span>
                  {checks.face ? (
                    <span className="font-bold text-emerald-700">✓</span>
                  ) : (
                    <button
                      className="rounded-md border border-slate-200 px-2 py-1 text-[9px] font-medium text-slate-700"
                      onClick={startSelfie}
                    >
                      Зураг авах
                    </button>
                  )}
                </div>
              </div>
              {scanMessage && (
                <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  ⚠ {scanMessage}
                </p>
              )}
              {showSelfieCamera && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {selfie ? (
                    <Image
                      unoptimized
                      src={selfie}
                      alt="Түр selfie preview"
                      width={320}
                      height={220}
                      className="mx-auto max-h-56 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="mx-auto max-h-56 w-full rounded-lg bg-slate-900 object-cover"
                    />
                  )}
                  {cameraError && (
                    <p className="my-2 text-xs text-rose-700">{cameraError}</p>
                  )}
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      onClick={finishDemoSelfie}
                    >
                      Demo үргэлжлүүлэх
                    </button>
                    {!cameraError && (
                      <button
                        className={primaryButtonClass}
                        onClick={captureSelfie}
                      >
                        Selfie авах
                      </button>
                    )}
                  </div>
                </div>
              )}
              <p className="my-3 text-[10px] leading-relaxed text-slate-500">
                Байршил, төхөөрөмжийн алхмууд нь demo шалгалт. Нүүрний биометр
                танилт хийгдэхгүй.
              </p>
              <button
                className={`${primaryButtonClass} w-full justify-between`}
                disabled={!checks.location || !checks.face}
                onClick={submitAttendance}
              >
                Ирц бүртгүүлэх <span>→</span>
              </button>
              <button
                className="mx-auto mt-2 block px-3 py-1 text-xs text-slate-500"
                onClick={resetStudent}
              >
                ← Буцах
              </button>
            </section>
          ) : (
            <section className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-700">
                ✓
              </span>
              <p className="mt-4 text-[10px] font-bold tracking-widest text-emerald-700">
                АМЖИЛТТАЙ БҮРТГЭГДЛЭЭ
              </p>
              <h2 className="mt-2 text-xl font-semibold">Ирц бүртгэгдлээ!</h2>
              <p className="mt-2 text-xs text-slate-500">
                {course.title} хичээлийн ирцийн жагсаалтад нэмэгдлээ.
              </p>
              <div className="my-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-slate-200 p-4 text-left text-[10px]">
                <span className="text-slate-500">Бүртгэгдсэн цаг</span>
                <strong className="text-right">
                  {new Date(now).toLocaleTimeString("mn-MN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
                <span className="text-slate-500">Төлөв</span>
                <strong className="text-right text-emerald-700">
                  Ирсэн · Амжилттай
                </strong>
              </div>
              <button
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
                onClick={resetStudent}
              >
                Нүүр хуудас руу буцах
              </button>
              <p className="mt-3 text-[9px] text-slate-400">
                Энэ бол туршилтын бүртгэл. Мэдээлэл серверт хадгалагдахгүй.
              </p>
            </section>
          )}
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 border-t border-slate-200 bg-white p-2 md:hidden">
        {role === "teacher" ? (
          <>
            <button className="rounded-lg bg-emerald-50 py-2 text-xs font-medium text-emerald-800">
              ▦ Самбар
            </button>
            <button
              className="rounded-lg py-2 text-xs text-slate-600"
              onClick={() => {
                setLoginRole(role);
                setAuthenticated(false);
              }}
            >
              Гарах ↪
            </button>
          </>
        ) : (
          <>
            <button className="rounded-lg bg-emerald-50 py-2 text-xs font-medium text-emerald-800">
              ▣ Миний ирц
            </button>
            <button
              className="rounded-lg py-2 text-xs text-slate-600"
              onClick={() => {
                setLoginRole(role);
                setAuthenticated(false);
              }}
            >
              Гарах ↪
            </button>
          </>
        )}
      </nav>
    </main>
  );
}
