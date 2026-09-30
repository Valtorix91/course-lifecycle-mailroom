import { randomUUID } from "node:crypto";
import { infrai } from "../src/infrai_email";

const namespace = process.env.TEMPLATE_NAMESPACE ?? `course-mail-${randomUUID().slice(0, 8)}`;
const templates = [
  {
    name: `${namespace}-course-delivered`,
    subject: "Your course is ready",
    html: "<p>Your course is open. Sign in to begin.</p>",
  },
  {
    name: `${namespace}-deadline-nudge`,
    subject: "Your course deadline is close",
    html: "<p>Return to your course and finish the next lesson.</p>",
  },
  {
    name: `${namespace}-educator-report`,
    subject: "A learner report is ready",
    html: "<p>A learner completed the course. Open the educator dashboard for the report.</p>",
  },
];

for (const template of templates) {
  const created = await infrai.email.template.create(
    template,
    `publish-${template.name}`,
  );
  console.log(`${template.name}: ${created.template_id}`);
}
