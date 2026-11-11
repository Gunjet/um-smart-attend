import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchTeacher,
  normalizeCode,
  parseClassGroups,
  parseTimetable,
  TimetableFormatError,
} from "../app/_lib/timetable-import";

describe("Ангийн текст задлах", () => {
  const groups = (text: string) => parseClassGroups(text).groups;

  it("энгийн жагсаалт", () => {
    assert.deepEqual(groups("МТ-1, УУАТ-1, ЦИ-1, ГТИ-1"), [
      "МТ-1",
      "ЦИ-1",
      "УУАТ-1",
      "ГТИ-1",
    ]);
  });
  it("нэг хөтөлбөрийн олон курс", () => {
    assert.deepEqual(groups("ЦИ-1, ГТИ-1,2"), ["ЦИ-1", "ГТИ-1", "ГТИ-2"]);
    assert.deepEqual(groups("МТ-3,МТ-4"), ["МТ-3", "МТ-4"]);
    assert.deepEqual(groups("МТ-3,4"), ["МТ-3", "МТ-4"]);
  });
  it("курс урд нь бичигдсэн", () => {
    assert.deepEqual(groups("коосон 4-ЦИ"), ["ЦИ-4"]);
    assert.deepEqual(groups("Ко-2-МТ"), ["МТ-2"]);
  });
  it("латин үсгээр бичсэн", () => {
    assert.deepEqual(groups("MT-1"), ["МТ-1"]);
  });
  it("танигдаагүй хэсгийг мэдээлнэ", () => {
    const result = parseClassGroups("МТ-1, Зэргийн бус");
    assert.deepEqual(result.groups, ["МТ-1"]);
    assert.deepEqual(result.unknown, ["ЗЭРГИЙН БУС"]);
  });
});

describe("Хичээлийн код", () => {
  it("кирилл lookalike-ийг латин болгоно", () => {
    assert.equal(normalizeCode("МТ101"), "MT101");
    assert.equal(normalizeCode(" s.it 101 "), "S.IT 101");
  });
  it("код биш мөрийг алгасна", () => {
    assert.equal(normalizeCode("5-8-р долоо хоног"), null);
    assert.equal(normalizeCode("12"), null);
    assert.equal(normalizeCode("1-р курс"), null);
    assert.equal(normalizeCode("2-Р КУРС"), "2-P KYPC");
    assert.equal(normalizeCode(""), null);
  });
});

/** Нэгтгэсэн нүдийг дэлгэсэн хүснэгт: 2 гариг × 3 пар. */
function sheet() {
  const days = (name: string) => [name, name, name];
  return [
    ["Хичээлийн хуваарь", "", "", "", ...Array(6).fill("")],
    [
      "№",
      "Код",
      "Нэр",
      "Багшийн нэр",
      "Мэр, анги",
      ...days("ДАВАА"),
      ...days("ЛХАГВА"),
    ],
    [
      "№",
      "Код",
      "Нэр",
      "Багшийн нэр",
      "Мэр, анги",
      "I",
      "II",
      "III",
      "I",
      "II",
      "III",
    ],
    [
      "1",
      "MT101",
      "Програмчлал",
      "Б.Батболд",
      "МТ-1",
      "лк",
      "лк",
      "",
      "",
      "лаб",
      "",
    ],
    ["", "", "5-8-р долоо хоног", "", "", "", "", "", "", "", ""],
    // Хоёр багштай: код, нэр нэгтгэсэн → хоёр мөрөнд давтагдана.
    ["2", "GE102", "Түүх", "Д.Сараа", "МТ-1, ЦИ-1", "", "", "сем", "", "", ""],
    ["2", "GE102", "Түүх", "Г.Отгон", "МТ-1, ЦИ-1", "", "", "", "", "", "лк"],
    ["3", "XX999", "Хоосон", "", "МТ-1", "", "", "", "", "", ""],
  ];
}

describe("Хуваарь задлах", () => {
  it("гариг, пар, ангиудыг уншина", () => {
    const { courses, warnings } = parseTimetable([sheet()]);
    assert.equal(courses.length, 2);
    const [ge, mt] = courses;
    assert.equal(mt.code, "MT101");
    assert.equal(mt.title, "Програмчлал");
    assert.equal(mt.teacherName, "Б.Батболд");
    assert.deepEqual(mt.classGroups, ["МТ-1"]);
    assert.deepEqual(mt.slots, [
      { day: 1, start: "08:00", end: "09:30" },
      { day: 1, start: "09:40", end: "11:10" },
      { day: 3, start: "09:40", end: "11:10" },
    ]);
    // Хоёр мөрийн цаг нийлнэ, эхний багш авна.
    assert.equal(ge.teacherName, "Д.Сараа");
    assert.deepEqual(ge.slots, [
      { day: 1, start: "11:20", end: "12:50" },
      { day: 3, start: "11:20", end: "12:50" },
    ]);
    assert.ok(warnings.some((w) => w.startsWith("XX999")));
  });

  it("нэгтгэсэн нүдгүй гаригийн толгойг ч ойлгоно", () => {
    const rows = sheet();
    rows[1] = rows[1].map((cell, c) => ([6, 7, 9, 10].includes(c) ? "" : cell));
    assert.equal(parseTimetable([rows]).courses.length, 2);
  });

  it("толгойгүй файлд ойлгомжтой алдаа өгнө", () => {
    assert.throws(
      () =>
        parseTimetable([
          [
            ["a", "b"],
            ["1", "2"],
          ],
        ]),
      TimetableFormatError,
    );
  });
});

describe("Багш таних", () => {
  const teachers = [
    { id: "a", fullName: "Батболд Б." },
    { id: "b", fullName: "Сараа Дорж" },
    { id: "c", fullName: "Отгон Ганболд" },
    { id: "d", fullName: "Отгон Гэрэл" },
  ];
  it("овгийн үсэг, нэрээр тулгана", () => {
    assert.equal(matchTeacher("Б.Батболд", teachers), "a");
    assert.equal(matchTeacher("Д.Сараа", teachers), "b");
    assert.equal(matchTeacher("Сараа", teachers), "b");
  });
  it("давхардвал эсвэл олдохгүй бол null", () => {
    assert.equal(matchTeacher("Отгон", teachers), null);
    assert.equal(matchTeacher("Н.Мөнх", teachers), null);
    assert.equal(matchTeacher("", teachers), null);
  });
});
