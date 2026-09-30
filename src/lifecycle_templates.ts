import { z } from "zod";

export const lifecycleRequest = z.object({
  event_id: z.string().min(1),
  to: z.string().email(),
  learner_name: z.string().min(1),
  course_title: z.string().min(1),
  educator_name: z.string().min(1),
  completion_percent: z.number().int().min(0).max(100),
  days_until_deadline: z.number().int(),
  report_url: z.string().url(),
  template_vars: z.record(z.string()).default({}),
});

export type LifecycleRequest = z.infer<typeof lifecycleRequest>;
export type MailDecision = {
  kind: "course_delivered" | "deadline_nudge" | "educator_report";
  subject: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function chooseLifecycleMail(input: LifecycleRequest): MailDecision {
  const learner = escapeHtml(input.learner_name);
  const course = escapeHtml(input.course_title);
  const educator = escapeHtml(input.educator_name);

  if (input.completion_percent >= 100) {
    return {
      kind: "educator_report",
      subject: `${input.course_title}: completion report ready`,
      html: `<p>${learner} completed ${course}.</p><p>${educator}, review the learner report: <a href="${input.report_url}">open report</a>.</p>`,
    };
  }
  if (input.days_until_deadline <= 2) {
    return {
      kind: "deadline_nudge",
      subject: `${input.days_until_deadline} days left in ${input.course_title}`,
      html: `<p>Hi ${learner}, your ${course} deadline is close.</p><p>You are ${input.completion_percent}% complete. Pick up where you stopped today.</p>`,
    };
  }
  return {
    kind: "course_delivered",
    subject: `${input.course_title} is ready`,
    html: `<p>Hi ${learner}, ${educator} has opened ${course} for you.</p><p>Your deadline is in ${input.days_until_deadline} days.</p>`,
  };
}
