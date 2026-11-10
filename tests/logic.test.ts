import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCourseReport, columnLabel } from "../app/_lib/attendance";
import { distanceMeters, formatDistance } from "../app/_lib/geo";
import { detectInAppBrowser } from "../app/_lib/in-app-browser";
import { formatClassGroups } from "../app/_lib/programs";
import {
  matchesShortCode,
  newQrSecret,
  parseQrPayload,
  QR_ROTATION_MS,
  qrPayload,
  shortCode,
  tickAt,
  verifyQrPayload,
} from "../app/_server/attendance/qr";

describe("QR ба 6 оронтой код", () => {
  const secret = newQrSecret();
  const sessionId = "0f8b6f8e-1111-4c4c-9d9d-123456789abc";
  const now = Date.now();
  const tick = tickAt(now);

  it("гарын үсэгтэй QR-г баталгаажуулна, хуурамчийг татгалзана", () => {
    const parsed = parseQrPayload(qrPayload(secret, sessionId, tick));
    assert.ok(parsed);
    assert.equal(verifyQrPayload(secret, parsed, now), true);
    assert.equal(verifyQrPayload(newQrSecret(), parsed, now), false);
  });

  it("хуучин код ≈60–90 секунд хүчинтэй, түүнээс хойш үгүй", () => {
    const code = shortCode(secret, tick);
    assert.equal(
      matchesShortCode(secret, code, now + 2 * QR_ROTATION_MS),
      true,
    );
    assert.equal(
      matchesShortCode(secret, code, now + 3 * QR_ROTATION_MS),
      false,
    );
  });

  it("ирцийн биш QR-г танихгүй", () => {
    assert.equal(parseQrPayload("https://example.com"), null);
  });
});

describe("зай", () => {
  it("0.001° өргөрөг ≈ 111 м", () => {
    const d = distanceMeters(
      { latitude: 43.57, longitude: 104.42 },
      { latitude: 43.571, longitude: 104.42 },
    );
    assert.ok(Math.abs(d - 111) < 1);
    assert.equal(formatDistance(85), "85 м");
    assert.equal(formatDistance(3300), "3.3 км");
  });
});

describe("анги", () => {
  it("нэг курсийн бүх хөтөлбөрийг товчилно", () => {
    assert.equal(
      formatClassGroups(["МТ-1", "ЦИ-1", "УУАТ-1", "ГТИ-1", "ГТИ-4"]),
      "1-р курс бүгд, ГТИ-4",
    );
  });
});

describe("апп доторх хөтөч", () => {
  it("Messenger-ийг таньж, Safari-г танихгүй", () => {
    assert.equal(
      detectInAppBrowser(
        "Mozilla/5.0 (iPhone) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/458.0]",
      ),
      "Messenger",
    );
    assert.equal(
      detectInAppBrowser(
        "Mozilla/5.0 (iPhone) Version/17.5 Mobile/15E148 Safari/604.1",
      ),
      null,
    );
  });
});

describe("тайлан", () => {
  it("пар бүрийг тусдаа багана болгоно", () => {
    const student = (status: "Ирсэн" | "Тасалсан") => ({
      id: "B1",
      name: "А. Бат",
      initials: "АБ",
      time: "—",
      status,
    });
    const record = (period: number, status: "Ирсэн" | "Тасалсан") => ({
      date: "2026-11-10",
      period,
      sessionIds: [`s${period}`],
      courseCode: "C1",
      courseTitle: "Курс",
      students: [student(status)],
    });
    const report = buildCourseReport(
      { title: "Курс", code: "C1", classGroups: [], time: "", enrolled: 1 },
      [record(2, "Тасалсан"), record(1, "Ирсэн")],
    );
    assert.deepEqual(report.columns.map(columnLabel), [
      "2026-11-10 1-р пар",
      "2026-11-10 2-р пар",
    ]);
    const row = report.rows[0];
    assert.equal(row.statusByDate[report.columns[0].key], "Ирсэн");
    assert.equal(row.statusByDate[report.columns[1].key], "Тасалсан");
  });
});
