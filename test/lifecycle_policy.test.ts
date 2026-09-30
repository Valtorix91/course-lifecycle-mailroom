import assert from "node:assert/strict";
import test from "node:test";
import { chooseLifecycleMail, lifecycleRequest } from "../src/lifecycle_templates";

test("a learner two days from an unfinished deadline gets the deadline nudge", () => {
  const input = lifecycleRequest.parse({
    event_id: "evt-course-1042",
    to: "ada@example.com",
    learner_name: "Ada",
    course_title: "Practical TypeScript",
    educator_name: "Sam",
    completion_percent: 65,
    days_until_deadline: 2,
    report_url: "https://school.example/reports/1042",
    template_vars: { cohort: "spring" },
  });

  const mail = chooseLifecycleMail(input);

  assert.equal(mail.kind, "deadline_nudge");
  assert.match(mail.subject, /2 days left/);
  assert.match(mail.html, /65% complete/);
});
