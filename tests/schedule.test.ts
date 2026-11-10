import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSlots,
  isWithinPeriodWindow,
  mergeSlots,
  periodAvailability,
  periodsForDay,
  slotPeriods,
} from "../app/_lib/schedule";

const min = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

describe("парууд", () => {
  it("цагийн хүрээнд багтах паруудыг олно", () => {
    assert.deepEqual(
      slotPeriods({ start: "11:20", end: "14:50" }).map((p) => p.number),
      [3, 4],
    );
  });

  it("нэг гарагийн дараалсан паруудыг нэгтгэнэ", () => {
    const merged = mergeSlots([
      { day: 2, start: "08:00", end: "09:30" },
      { day: 2, start: "09:40", end: "11:10" },
      { day: 4, start: "15:00", end: "16:30" },
    ]);
    assert.deepEqual(
      merged.map((slot) => [slot.day, slot.from, slot.to]),
      [
        [2, 1, 2],
        [4, 5, 5],
      ],
    );
    assert.equal(
      formatSlots([
        { day: 2, start: "08:00", end: "09:30" },
        { day: 2, start: "09:40", end: "11:10" },
      ]),
      "Мя 1–2-р пар",
    );
  });

  it("тухайн гарагийн парын дугааруудыг буцаана", () => {
    const slots = [
      { day: 1, start: "09:40", end: "11:10" },
      { day: 1, start: "08:00", end: "09:30" },
      { day: 3, start: "15:00", end: "16:30" },
    ];
    assert.deepEqual(periodsForDay(slots, 1), [1, 2]);
    assert.deepEqual(periodsForDay(slots, 2), []);
  });
});

describe("ирц авах цонх (±10 минут)", () => {
  it("1-р пар 07:50–09:40 хооронд нээгдэнэ", () => {
    assert.equal(isWithinPeriodWindow(1, min("07:49")), false);
    assert.equal(isWithinPeriodWindow(1, min("07:50")), true);
    assert.equal(isWithinPeriodWindow(1, min("09:40")), true);
    assert.equal(isWithinPeriodWindow(1, min("09:41")), false);
  });

  it("ирц аваагүй, одоо нээж болох парыг сонгоно", () => {
    assert.deepEqual(periodAvailability([1, 2], [], min("07:30")), {
      openable: null,
      upcoming: 1,
      untaken: [1, 2],
    });
    assert.equal(periodAvailability([1, 2], [], min("08:10")).openable, 1);
    // 1-р парыг аваад дараа нь 2-р пар
    assert.equal(periodAvailability([1, 2], [1], min("09:35")).openable, 2);
    // Бүх парын хугацаа өнгөрсөн
    const late = periodAvailability([1, 2], [], min("12:00"));
    assert.equal(late.openable, null);
    assert.equal(late.upcoming, null);
  });
});
