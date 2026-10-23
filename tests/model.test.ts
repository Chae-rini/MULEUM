import test from "node:test";
import assert from "node:assert/strict";
import { isGoals, isJournals, isLessons, isNotes, isQuestions, lessonProgress, lessonSteps, readStored, sampleQuestions, validateText, visibleReports, weekStart, writeStored, type StorageAdapter } from "../lib/model.ts";

function memoryStorage(): StorageAdapter {
  const entries = new Map<string, string>();
  return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); } };
}

test("required text rejects whitespace and over-limit input", () => {
  assert.ok(validateText("  \n ", 300));
  assert.ok(validateText("가".repeat(301), 300));
  assert.equal(validateText("  왜 그럴까?  ", 300), null);
});

test("weeks start on Monday across Sunday and year boundaries", () => {
  assert.equal(weekStart("2026-10-25"), "2026-10-19");
  assert.equal(weekStart("2026-10-26"), "2026-10-26");
  assert.equal(weekStart("2027-01-01"), "2026-12-28");
});

test("lesson duration totals 120; progress ignores duplicate and invalid steps", () => {
  assert.equal(lessonSteps.reduce((sum, step) => sum + step.minutes, 0), 120);
  assert.deepEqual(lessonProgress([0, 0, 3, 99, -1, 1.5]), { count: 2, minutes: 60, percent: 50 });
  assert.deepEqual(lessonProgress([0, 1, 2, 3, 4, 5, 6]), { count: 7, minutes: 120, percent: 100 });
});

test("a parent report requires both teacher approval and student consent", () => {
  const combinations = [true, false].flatMap((approved) => [true, false].map((consented) => ({ id: `${approved}-${consented}`, student: "sample", approved, consented, growth: "growth", next: "next" })));
  assert.deepEqual(visibleReports(combinations).map((r) => r.id), ["true-true"]);
});

test("stored records survive round trips without sharing keys", () => {
  const storage = memoryStorage();
  writeStored(storage, "questions", sampleQuestions);
  writeStored(storage, "journal", [{ id: "journal", date: "2026-10-23", answers: ["private", "", ""] }]);
  assert.deepEqual(readStored(storage, "questions", [], isQuestions), sampleQuestions);
  assert.equal(readStored(storage, "journal", [], isJournals)[0].answers[0], "private");
  assert.deepEqual(readStored(storage, "notes", [], isNotes), []);
});

test("corrupt and incompatible stored data is rejected and preserved", () => {
  const storage = memoryStorage();
  for (const invalid of ["{", '{"version":2,"data":[]}', '{"version":1,"data":[{"id":"broken"}]}', '{"version":1,"data":null}']) {
    storage.setItem("questions", invalid);
    assert.throws(() => readStored(storage, "questions", sampleQuestions, isQuestions));
    assert.equal(storage.getItem("questions"), invalid);
  }
});

test("storage denial and quota errors propagate to the UI", () => {
  const storage: StorageAdapter = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); } };
  assert.throws(() => readStored(storage, "q", [], isQuestions), /blocked/);
  assert.throws(() => writeStored(storage, "q", []), /quota/);
});

test("validators reject invalid content, foreign student IDs, and wrong types", () => {
  assert.equal(isQuestions([{ ...sampleQuestions[0], text: "  " }]), false);
  assert.equal(isQuestions([{ ...sampleQuestions[0], reason: 123 }]), false);
  assert.equal(isGoals([{ id: "1", text: "goal", week: "2026-10-19", done: "true" }]), false);
  assert.equal(isJournals([{ id: "1", date: "2026-10-23", answers: ["", " ", ""] }]), false);
  assert.equal(isLessons([{ id: "1", date: "2026-10-23", student: "student-x", completed: [0] }]), false);
  assert.equal(isLessons([{ id: "1", date: "2026-10-23", student: "student-a", completed: [7] }]), false);
  assert.equal(isNotes([{ id: "1", date: "2026-10-23", student: "student-a", text: "memo" }]), true);
});
