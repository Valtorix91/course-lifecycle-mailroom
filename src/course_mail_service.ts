import express from "express";
import { ZodError } from "zod";
import { infrai, InfraiError } from "./infrai_email";
import { chooseLifecycleMail, lifecycleRequest } from "./lifecycle_templates";

export const app = express();
app.use(express.json({ limit: "32kb" }));

app.post("/lifecycle-mails", async (request, response) => {
  try {
    const input = lifecycleRequest.parse(request.body);
    const decision = chooseLifecycleMail(input);
    const sent = await infrai.email.send(
      { to: input.to, subject: decision.subject, html: decision.html },
      `lifecycle-${input.event_id}`,
    );
    response.status(202).json({
      message_id: sent.message_id,
      template: decision.kind,
      completion_percent: input.completion_percent,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "invalid_request", issues: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.status(status).json({ error: error.detail.code ?? "email_rejected" });
      return;
    }
    response.status(500).json({ error: "internal_error" });
  }
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => console.log(`Course mail service listening on ${port}`));
}
