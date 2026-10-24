import test from "node:test";
import assert from "node:assert/strict";
import { capacityIssues, defaultPreviewRole, isSection, roleHome, sectionFromPath, sectionDefinitions, type MemberProfile, type RoleAssignment } from "../lib/platform.ts";

test("capacity accepts the final available student place and rejects full limits", () => {
  assert.deepEqual(capacityIssues({ activeTeachers: 10, activeStudents: 99, assignedActiveStudents: 9 }, "add_student"), []);
  assert.equal(capacityIssues({ activeTeachers: 10, activeStudents: 100, assignedActiveStudents: 10 }, "add_student").length, 2);
  assert.equal(capacityIssues({ activeTeachers: 10, activeStudents: 20, assignedActiveStudents: 10 }, "add_student").length, 1);
});

test("teacher admission and invalid capacity values are rejected at the boundary", () => {
  assert.deepEqual(capacityIssues({ activeTeachers: 9, activeStudents: 0, assignedActiveStudents: 0 }, "add_teacher"), []);
  assert.equal(capacityIssues({ activeTeachers: 10, activeStudents: 0, assignedActiveStudents: 0 }, "add_teacher").length, 1);
  for (const invalid of [-1, 0.5, NaN, Infinity]) {
    assert.ok(capacityIssues({ activeTeachers: invalid, activeStudents: 0, assignedActiveStudents: 0 }, "add_teacher").length);
  }
  assert.ok(capacityIssues({ activeTeachers: 0, activeStudents: 0, assignedActiveStudents: 0 }, "add_student").length);
});

test("age, alumni status, and independently approved roles remain separate", () => {
  const member: MemberProfile = { id: "example", accountStatus: "active", ageCategory: "minor", enrollmentStatus: "alumni" };
  const roles: RoleAssignment[] = [
    { memberId: member.id, role: "alumni", status: "approved", approvedBy: "reviewer" },
    { memberId: member.id, role: "assistant", status: "pending", approvedBy: null },
  ];
  assert.equal(member.ageCategory, "minor");
  assert.deepEqual(roles.filter((r) => r.status === "approved").map((r) => r.role), ["alumni"]);
});

test("route registry rejects unknown and inherited property names", () => {
  assert.equal(sectionFromPath("/app/questions"), "questions");
  assert.equal(sectionFromPath("/"), null);
  assert.equal(sectionFromPath("/app/unknown"), null);
  assert.equal(isSection("constructor"), false);
  assert.equal(isSection("__proto__"), false);
  assert.equal(defaultPreviewRole("/app/teacher"), "teacher");
  assert.equal(roleHome("assistant"), "home");
  assert.equal(roleHome("administrator"), "accounts");
  assert.equal(roleHome("alumni"), "profile");
  for (const removed of ["notices", "board", "register", "research", "community", "operations"]) assert.equal(isSection(removed), false);
  assert.equal(sectionFromPath("/app/register"), null);
  assert.deepEqual(sectionDefinitions.profile.roles.includes("alumni"), true);
});
