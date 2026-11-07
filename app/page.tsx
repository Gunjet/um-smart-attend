"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

type Role = "teacher" | "student";
type Student = { name: string; id: string; time: string; status: "Ирсэн" | "Хоцорсон"; initials: string; color: string };

const initialStudents: Student[] = [
  { name: "Б. Энхжин", id: "22B1NUM0142", time: "09:02", status: "Ирсэн", initials: "ЭБ", color: "lavender" },
  { name: "М. Тэмүүлэн", id: "22B1NUM0087", time: "09:03", status: "Ирсэн", initials: "ТМ", color: "mint" },
  { name: "С. Номин", id: "22B1NUM0215", time: "09:04", status: "Ирсэн", initials: "НС", color: "peach" },
  { name: "Д. Анужин", id: "22B1NUM0119", time: "09:05", status: "Ирсэн", initials: "АД", color: "blue" },
  { name: "Г. Мөнх-Оргил", id: "22B1NUM0063", time: "09:07", status: "Хоцорсон", initials: "МГ", color: "yellow" },
];

const courses = [
  { title: "Хиймэл оюун ухааны үндэс", code: "CS304 · Лекц 02", room: "ШУТИС, Е-604", time: "09:00 — 10:30", students: 24, tone: "violet", icon: "✳" },
  { title: "Өгөгдлийн бүтэц", code: "CS202 · Лекц 01", room: "ШУТИС, Е-502", time: "11:00 — 12:30", students: 32, tone: "mint", icon: "⌘" },
  { title: "Програм хангамжийн инженерчлэл", code: "CS305 · Семинар 03", room: "ШУТИС, Е-411", time: "14:00 — 15:30", students: 28, tone: "peach", icon: "⌁" },
];

const mongolianMonths = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар", "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];
const mongolianWeekdays = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

function formatMongolianDate(timestamp: number, withYear = false) {
  const date = new Date(timestamp);
  const dateText = `${mongolianMonths[date.getMonth()]} ${date.getDate()}`;
  return withYear ? `${date.getFullYear()} оны ${dateText}, ${mongolianWeekdays[date.getDay()]} гараг` : `${dateText}, ${mongolianWeekdays[date.getDay()]}`;
}

export default function Home() {
  const [role, setRole] = useState<Role>("teacher");
  const [selectedCourse, setSelectedCourse] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [qrData, setQrData] = useState("");
  const [students, setStudents] = useState(initialStudents);
  const [scanStage, setScanStage] = useState<"ready" | "scanning" | "verify" | "done">("ready");
  const [scanMessage, setScanMessage] = useState("");
  const [checks, setChecks] = useState({ location: false, device: false, face: false });
  const [locationLabel, setLocationLabel] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [selfie, setSelfie] = useState("");
  const [showSelfieCamera, setShowSelfieCamera] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(0);
  const qrCycle = Math.floor(now / 30_000);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

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
    }).then(setQrData).catch(() => setQrData(""));
  }, [qrCycle, sessionActive, sessionId]);

  useEffect(() => () => {
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    if (scannerRef.current) void scannerRef.current.stop().catch(() => undefined);
  }, []);

  const startSession = () => {
    setNow(Date.now());
    setSessionId(`CS304-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
    setSessionActive(true);
    setNotice("Ирцийн бүртгэл эхэллээ. QR код 30 секунд тутам шинэчлэгдэнэ.");
  };

  const closeSession = () => {
    setSessionActive(false);
    setQrData("");
    setNotice("Хичээлийн ирцийн бүртгэл хаагдлаа.");
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* camera may already be stopped */ }
      scannerRef.current.clear();
      scannerRef.current = null;
    }
  }, []);

  const acceptScan = useCallback((value: string) => {
    if (!sessionActive || !sessionId) {
      setScanMessage("Одоогоор идэвхтэй ирцийн QR алга байна. Багшийн бүртгэл эхэлсэн эсэхийг шалгана уу.");
      return;
    }
    const [prefix, codeSessionId, tickValue] = value.split(":");
    const tokenIsCurrent = Number.isInteger(Number(tickValue)) && Number(tickValue) === Math.floor(Date.now() / 30_000);
    if (prefix === "UM-SMART-ATTEND" && codeSessionId === sessionId && tokenIsCurrent) {
      setScanStage("verify");
      setScanMessage("");
      void stopScanner();
    } else {
      setScanMessage("QR код буруу эсвэл хугацаа нь дууссан байна. Дэлгэц дээрх шинэ кодыг уншуулна уу.");
    }
  }, [sessionActive, sessionId, stopScanner]);

  const startScanner = async () => {
    setScanMessage("");
    setScanStage("scanning");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("student-qr-reader", { verbose: false });
      scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 230, height: 230 } }, (text) => acceptScan(text), () => undefined);
    } catch {
      setScanMessage("Камер нээж чадсангүй. Зөвшөөрлөө шалгах эсвэл demo код ашиглана уу.");
    }
  };

  const useDemoQr = () => {
    if (!sessionActive || !sessionId) {
      setScanMessage("Эхлээд багшийн эрхээр ирцийн бүртгэл эхлүүлнэ үү.");
      return;
    }
    acceptScan(`UM-SMART-ATTEND:${sessionId}:${Math.floor(Date.now() / 30_000)}`);
  };

  const checkLocation = () => {
    setScanMessage("");
    if (!navigator.geolocation) {
      setScanMessage("Энэ төхөөрөмж байршлын үйлчилгээг дэмжихгүй байна. Demo шалгалтыг ашиглаж болно.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setChecks((current) => ({ ...current, location: true }));
        setLocationLabel(`Байршил авлаа · ±${Math.round(position.coords.accuracy)} м нарийвчлал`);
        setScanMessage("");
      },
      () => setScanMessage("Байршлын зөвшөөрөл олгогдсонгүй. Browser-ийн тохиргооноос зөвшөөрөх эсвэл demo-г сонгоно уу."),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  };

  const useDemoLocation = () => {
    setChecks((current) => ({ ...current, location: true }));
    setLocationLabel("Demo байршил · GPS радиус шалгаагүй");
    setScanMessage("");
  };

  const checkDevice = () => {
    try {
      const key = "um-smart-attend-demo-device";
      const saved = window.localStorage.getItem(key);
      if (!saved) window.localStorage.setItem(key, `device-${Math.random().toString(36).slice(2, 8)}`);
      setChecks((current) => ({ ...current, device: true }));
      setScanMessage("");
    } catch {
      setScanMessage("Төхөөрөмжийн demo шалгалт энэ browser дээр боломжгүй байна.");
    }
  };

  const startSelfie = async () => {
    setCameraError("");
    setShowSelfieCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      mediaRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError("Камерын зөвшөөрөл олгогдсонгүй. Demo selfie ашиглан алхмыг үргэлжлүүлж болно.");
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
    const name = "Оюутан Demo";
    if (!students.some((student) => student.id === "DEMO-001")) {
      setStudents((current) => [{ name, id: "DEMO-001", time: new Date().toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" }), status: "Ирсэн", initials: "OD", color: "mint" }, ...current]);
    }
    setScanStage("done");
    setNotice("Оюутны demo ирц багшийн жагсаалтад нэмэгдлээ.");
  };

  const resetStudent = () => {
    setScanStage("ready");
    setChecks({ location: false, device: false, face: false });
    setScanMessage("");
    setLocationLabel("");
    setSelfie("");
    setShowSelfieCamera(false);
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    mediaRef.current = null;
  };

  const course = courses[selectedCourse];
  const remaining = now ? 30 - Math.floor((now / 1000) % 30) : 30;
  const filteredStudents = students.filter((student) => `${student.name} ${student.id}`.toLowerCase().includes(search.toLowerCase()));
  const present = students.length;
  const progress = Math.min(100, Math.round((present / course.students) * 100));

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Ирц — нүүр хуудас"><span className="brand-mark">i</span><span className="brand-name">ирц<span>.</span></span></a>
        <div className="workspace-label">СУРГАЛТЫН СИСТЕМ</div>
        <nav className="side-nav" aria-label="Үндсэн цэс">
          <button className={`nav-item ${role === "teacher" ? "active" : ""}`} onClick={() => setRole("teacher")}><span className="nav-icon">▦</span>Хяналтын самбар</button>
          <button className={`nav-item ${role === "student" ? "active" : ""}`} onClick={() => setRole("student")}><span className="nav-icon">▣</span>Ирцээ бүртгүүлэх</button>
          <button className="nav-item muted-nav" onClick={() => setNotice("Тайлангийн хэсэг demo хувилбарт хараахан идэвхжээгүй.")}><span className="nav-icon">▤</span>Ирцийн тайлан</button>
          <button className="nav-item muted-nav" onClick={() => setNotice("Хичээлийн тохиргоо demo хувилбарт хараахан идэвхжээгүй.")}><span className="nav-icon">⚙</span>Тохиргоо</button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card"><span className="help-icon">✦</span><strong>Танд тусламж хэрэгтэй юу?</strong><p>Ирц бүртгэх заавартай танилцаарай.</p><button onClick={() => setNotice("Тусламж: хичээл сонгоод Start Attendance товчийг дарна уу.")}>Заавар үзэх <span>↗</span></button></div>
        <button className="profile" onClick={() => setRole(role === "teacher" ? "student" : "teacher")} aria-label="Эрх солих"><span className="avatar avatar-teacher">БЭ</span><span className="profile-copy"><strong>{role === "teacher" ? "Б. Энхтөр" : "Оюутан Demo"}</strong><small>{role === "teacher" ? "Багшийн эрх" : "Оюутны эрх"}</small></span><span className="profile-more">⌄</span></button>
      </aside>

      <section className="main-area">
        <header className="topbar"><div className="breadcrumb"><span>Нүүр</span><span className="crumb-slash">/</span><strong>{role === "teacher" ? "Хяналтын самбар" : "Ирц бүртгүүлэх"}</strong></div><div className="topbar-actions"><span className="today-label">{now ? formatMongolianDate(now) : "Өнөөдөр"}</span><button className="icon-button" aria-label="Мэдэгдэл" onClick={() => setNotice("Шинэ мэдэгдэл алга байна.")}>♧<i /></button><span className="top-avatar">БЭ</span></div></header>
        {notice && <div className="toast" role="status"><span>✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Мэдэгдэл хаах">×</button></div>}

        {role === "teacher" ? (
          <div className="page-content teacher-content" id="home">
            <div className="welcome-row"><div><div className="eyebrow">2024–2025 ОНЫ ХИЧЭЭЛИЙН ЖИЛ</div><h1>Өглөөний мэнд, Энхтөр <span>✦</span></h1><p className="page-subtitle">Өнөөдрийн хичээлүүдийн ирцийг нэг дороос хянаарай.</p></div><button className="outline-button" onClick={() => setNotice("Ирцийн тайлан бэлэн болмогц эндээс татаж авна.")}><span>↧</span> Тайлан татах</button></div>
            <div className="stat-grid"><article className="stat-card"><span className="stat-icon stat-violet">▦</span><span className="stat-label">Өнөөдрийн хичээл</span><strong>3 <small>хичээл</small></strong><span className="stat-foot">2 хичээл үлдсэн</span></article><article className="stat-card"><span className="stat-icon stat-green">✓</span><span className="stat-label">Дундаж ирц</span><strong>87<small>%</small></strong><span className="stat-foot positive">↗ Өмнөх долоо хоногоос 4%</span></article><article className="stat-card"><span className="stat-icon stat-orange">◷</span><span className="stat-label">Бүртгэгдсэн оюутан</span><strong>{present}<small> / {course.students}</small></strong><span className="stat-foot">{course.title}</span></article><article className="stat-card"><span className="stat-icon stat-blue">♧</span><span className="stat-label">Хоцорсон</span><strong>{students.filter((student) => student.status === "Хоцорсон").length}<small> оюутан</small></strong><span className="stat-foot">Өнөөдрийн байдлаар</span></article></div>
            <div className="section-heading"><div><h2>Өнөөдрийн хичээлүүд</h2><p>{now ? formatMongolianDate(now, true) : "Өнөөдрийн хуваарь"}</p></div><button className="text-button" onClick={() => setNotice("Бүх хичээлийг харуулах нь demo хувилбарт идэвхгүй.")}>Бүгдийг харах <span>→</span></button></div>
            <div className="course-list">{courses.map((item, index) => <button key={item.code} className={`course-card ${selectedCourse === index ? "course-selected" : ""}`} onClick={() => {
  if (sessionActive && selectedCourse !== index) {
    setNotice("Өөр хичээл сонгохын өмнө одоогийн ирцийн бүртгэлийг хаана уу.");
  } else {
    setSelectedCourse(index);
  }
}}><span className={`course-icon ${item.tone}`}>{item.icon}</span><span className="course-main"><strong>{item.title}</strong><small>{item.code}</small></span><span className="course-meta"><strong>◷ &nbsp;{item.time}</strong><small>⌖ &nbsp;{item.room}</small></span><span className="course-student"><strong>{index === selectedCourse ? present : "—"}<small> / {item.students}</small></strong><small>ирц бүртгүүлсэн</small></span><span className={`course-status ${sessionActive && index === selectedCourse ? "status-live" : ""}`}><i />{sessionActive && index === selectedCourse ? "Бүртгэл явагдаж байна" : index === 0 ? "Эхлэхэд бэлэн" : "Удахгүй"}</span><span className="course-arrow">›</span></button>)}</div>
            <div className="section-heading session-heading"><div><h2>Ирцийн бүртгэл</h2><p>Хичээлийн QR код болон бүртгэлийг удирдах</p></div>{sessionActive && <span className="live-pill"><i /> LIVE ОДОО</span>}</div>
            <div className="session-layout">
              <section className="session-card"><div className="session-top"><div><span className="session-kicker">{sessionActive ? "ИДЭВХТЭЙ ХИЧЭЭЛ" : "СОНГОСОН ХИЧЭЭЛ"}</span><h3>{course.title}</h3><div className="session-details"><span>{course.code}</span><span>·</span><span>{course.room}</span><span>·</span><span>{course.time}</span></div></div><span className={`session-icon ${course.tone}`}>{course.icon}</span></div><div className="session-divider" />
                {sessionActive ? <div className="qr-session"><div className="qr-frame">{qrData ? <Image unoptimized src={qrData} alt="Ирц бүртгүүлэх QR код" width={240} height={240} /> : <div className="qr-loading">QR бэлдэж байна…</div>}</div><div className="qr-info"><div className="qr-live"><i /> QR КОД ИДЭВХТЭЙ</div><h4>QR кодыг дэлгэцээр харуулна уу</h4><p>Оюутнууд утсаараа кодыг уншуулж ирцээ бүртгүүлнэ.</p><div className="qr-countdown"><span>Код шинэчлэгдэхэд</span><strong>00:{String(remaining).padStart(2, "0")}</strong></div><div className="qr-session-id">Session ID <strong>{sessionId}</strong></div><button className="danger-button" onClick={closeSession}>Ирцийн бүртгэл хаах</button></div></div> : <div className="session-empty"><div className="empty-qr-icon">▦</div><h4>Ирц бүртгэхэд бэлэн үү?</h4><p>Бүртгэлийг эхлүүлэхэд хичээлд зориулсан динамик QR код үүснэ. Код 30 секунд тутам шинэчлэгдэнэ.</p><button className="primary-button" onClick={startSession}><span>▶</span> Start Attendance</button><small>Сонгосон хичээл: {course.title}</small></div>}
              </section>
              <aside className="attendance-card"><div className="attendance-head"><div><h3>Ирцийн явц</h3><p>Өнөөдрийн бүртгэл</p></div><button className="more-button" aria-label="Дэлгэрэнгүй" onClick={() => setNotice("Ирцийн явц шинэчлэгдлээ.")}>···</button></div><div className="attendance-summary"><div className="donut" style={{ "--progress": `${progress}%` } as React.CSSProperties}><span><strong>{present}</strong><small>/{course.students}</small></span></div><div><strong>{progress}%</strong><small>ирц бүртгэгдсэн</small><span className="summary-caption">{course.students - present > 0 ? `${course.students - present} оюутан хүлээгдэж байна` : "Бүх оюутан бүртгүүлсэн"}</span></div></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="list-header"><strong>Бүртгүүлсэн оюутнууд</strong><span>{present} оюутан</span></div><label className="search-box"><span>⌕</span><input aria-label="Оюутан хайх" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Нэр эсвэл ID хайх" /></label><div className="student-list">{filteredStudents.slice(0, 5).map((student) => <div className="student-row" key={student.id}><span className={`avatar avatar-${student.color}`}>{student.initials}</span><span className="student-copy"><strong>{student.name}</strong><small>{student.id}</small></span><span className="student-time"><strong>{student.time}</strong><small className={student.status === "Хоцорсон" ? "late-text" : ""}>{student.status}</small></span></div>)}{filteredStudents.length === 0 && <div className="no-results">Оюутан олдсонгүй.</div>}</div><button className="all-students" onClick={() => setNotice(`Нийт ${present} оюутан бүртгүүлсэн байна.`)}>Бүх бүртгэлийг харах <span>→</span></button></aside>
            </div>
            <div className="demo-notice"><span>ⓘ</span><p><strong>Demo орчин.</strong> Ирц, GPS болон төхөөрөмжийн шалгалт энэ browser дотор туршилтаар ажиллана. Бодит нүүр танилт болон баталгаатай нэвтрэлт хийгдэхгүй.</p></div>
          </div>
        ) : (
          <div className="student-page">
            <div className="student-mobile-top"><a className="brand" href="#home"><span className="brand-mark">i</span><span className="brand-name">ирц<span>.</span></span></a><span className="mobile-course-chip">CS304 · Лекц 02</span></div>
            <div className="student-welcome"><span className="eyebrow">ШУТИС · Мэдээлэл холбооны технологийн сургууль</span><h1>Сайн байна уу, <span>оюутан!</span></h1><p>Хичээлдээ ирцээ бүртгүүлэхэд бэлэн үү?</p></div>
            <div className="student-course-card"><div className="student-course-top"><span className="course-icon violet">✳</span><span className={`student-open ${sessionActive ? "is-open" : ""}`}><i />{sessionActive ? "Ирц авч байна" : "Ирц эхлээгүй"}</span></div><h2>{course.title}</h2><p>{course.code} <span>·</span> {course.room}</p><div className="student-course-foot"><span>◷ &nbsp;{course.time}</span><span>Багш: Б. Энхтөр</span></div></div>
            <div className="student-step-title"><div><h2>Ирцээ бүртгүүлэх</h2><p>Дараах алхмуудыг дарааллаар гүйцэтгэнэ үү</p></div><span>0{scanStage === "ready" || scanStage === "scanning" ? "1" : scanStage === "verify" ? "2" : "3"} / 03</span></div>
            {scanStage === "ready" || scanStage === "scanning" ? <section className="scan-card"><div className="scan-card-title"><span className="scan-number">01</span><div><h3>QR код уншуулах</h3><p>Багшийн дэлгэц дээрх QR кодыг камертаа тааруулна уу.</p></div></div><div className={`scanner-box ${scanStage === "scanning" ? "scanner-active" : ""}`}><div id="student-qr-reader" className="scanner-target" />{scanStage !== "scanning" && <div className="scanner-placeholder"><span className="scan-frame"><i /><i /><i /><i /><b>▦</b></span><strong>Камераа QR код руу чиглүүлнэ үү</strong><small>QR кодыг хүрээн дотор байрлуулна уу</small></div>}</div>{scanMessage && <div className="inline-error">⚠ {scanMessage}</div>}<button className="primary-button scan-button" onClick={scanStage === "scanning" ? () => { void stopScanner(); setScanStage("ready"); } : startScanner}>{scanStage === "scanning" ? "Камер зогсоох" : <><span>▣</span> Камер нээх</>}</button><button className="demo-link" onClick={useDemoQr}>Demo QR код ашиглах</button><div className="privacy-note"><span>♧</span><p>Таны камерын дүрс төхөөрөмжөөс гарахгүй. Байршил зөвхөн шалгалтын үед ашиглагдана.</p></div></section> : scanStage === "verify" ? <section className="verify-card"><div className="verify-success"><span>✓</span><div><strong>QR код амжилттай уншигдлаа</strong><small>{course.title} · {course.room}</small></div></div><div className="scan-card-title verify-title"><span className="scan-number">02</span><div><h3>Баталгаажуулалт</h3><p>Ирц бүртгэхийн өмнө дараах шалгалтыг хийнэ.</p></div></div><div className="check-list"><div className={`check-row ${checks.location ? "check-complete" : ""}`}><span className="check-symbol">⌖</span><span><strong>Байршлын шалгалт</strong><small>{locationLabel || "Байршлын зөвшөөрлөөр шалгана"}</small></span>{checks.location ? <b>✓</b> : <><button onClick={checkLocation}>Зөвшөөрөх</button><button onClick={useDemoLocation}>Demo</button></>}</div><div className={`check-row ${checks.device ? "check-complete" : ""}`}><span className="check-symbol">▣</span><span><strong>Төхөөрөмжийн шалгалт</strong><small>Энэ browser дээрх demo бүртгэл</small></span>{checks.device ? <b>✓</b> : <button onClick={checkDevice}>Шалгах</button>}</div><div className={`check-row ${checks.face ? "check-complete" : ""}`}><span className="check-symbol">◉</span><span><strong>Нүүрний зураг</strong><small>{selfie ? "Selfie авлаа · бодит танилт биш" : "Камераар selfie авах"}</small></span>{checks.face ? <b>✓</b> : <button onClick={startSelfie}>Зураг авах</button>}</div></div>{scanMessage && <div className="inline-error">⚠ {scanMessage}</div>}{showSelfieCamera && <div className="selfie-panel">{selfie ? <Image unoptimized src={selfie} alt="Түр selfie preview" width={320} height={220} /> : <video ref={videoRef} autoPlay playsInline muted />}{cameraError && <p>{cameraError}</p>}<div><button className="secondary-button" onClick={finishDemoSelfie}>Demo үргэлжлүүлэх</button>{!cameraError && <button className="primary-button" onClick={captureSelfie}>Selfie авах</button>}</div></div>}<div className="verification-warning"><span>ⓘ</span> Байршил, төхөөрөмжийн алхамууд нь demo шалгалт. Нүүрний биометр танилт хийгдэхгүй.</div><button className="primary-button submit-button" disabled={!checks.location || !checks.device || !checks.face} onClick={submitAttendance}>Ирц бүртгүүлэх <span>→</span></button><button className="back-link" onClick={resetStudent}>← Буцах</button></section> : <section className="complete-card"><span className="complete-check">✓</span><span className="eyebrow">АМЖИЛТТАЙ БҮРТГЭГДЛЭЭ</span><h2>Ирц бүртгэгдлээ!</h2><p>{course.title} хичээлийн ирцийн жагсаалтад таны бүртгэл нэмэгдлээ.</p><div className="complete-details"><span>Бүртгүүлсэн цаг</span><strong>{new Date(now).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}</strong><span>Төлөв</span><strong className="success-text">Ирсэн · Амжилттай</strong></div><button className="secondary-button" onClick={resetStudent}>Нүүр хуудас руу буцах</button><p className="small-demo-copy">Энэ бол туршилтын бүртгэл. Мэдээлэл серверт хадгалагдахгүй.</p></section>}
            <div className="student-demo-note"><span>ⓘ</span><p><strong>Туршилтын систем.</strong> Бодит ирцийн бүртгэл, нүүрний танилт болон нэвтрэлт баталгаажуулахын тулд серверийн холболт шаардлагатай.</p></div>
          </div>
        )}
      </section>
    </main>
  );
}
