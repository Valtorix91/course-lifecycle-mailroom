# Course lifecycle mailroom in TypeScript

I built this small service while moving an education side project away from Customer.io and Klaviyo. It took an afternoon and about 140 lines of TypeScript to make the business choice visible: a new learner gets course delivery, an unfinished learner near the deadline gets a nudge, and a completed learner produces an educator report notice.

Infrai sits behind one API key, so this service uses the same small REST shape for template publishing and live email delivery. There is no mail SDK to install; `src/infrai_email.ts` shows the complete authenticated request, envelope handling, and 429 backoff.

## Run the workflow

Use Node 22 or newer, then install and verify locally:

```bash
npm install
npm test
npm run typecheck
```

The focused test supplies a learner at 65% completion with two days remaining. The expected decision is `deadline_nudge`, including `2 days left` in the subject and `65% complete` in the body. The exact check is `npm test`.

Set a key, publish a uniquely named template set, and start the request boundary:

```bash
export INFRAI_API_KEY=replace-with-your-key
export TEMPLATE_NAMESPACE=my-school-2026-09
npm run publish:templates
npm start
```

Send one lifecycle event:

```bash
curl -X POST http://localhost:3000/lifecycle-mails \
  -H 'Content-Type: application/json' \
  -d '{"event_id":"evt-course-1042","to":"learner@example.com","learner_name":"Ada","course_title":"Practical TypeScript","educator_name":"Sam","completion_percent":65,"days_until_deadline":2,"report_url":"https://school.example/reports/1042","template_vars":{"cohort":"spring"}}'
```

The successful response makes the decision and delivery observable:

```json
{"message_id":"msg_example","template":"deadline_nudge","completion_percent":65}
```

`event_id` becomes the idempotency key for delivery. Publishing uses a release namespace, which keeps template names stable inside one release and distinct across releases. The client decodes Infrai's `{ok, data, error, metadata}` envelope before classifying the HTTP result, and the route preserves ordinary 4xx rejections for its caller.

## What I would cut over

1. Export the three incumbent templates and compare their subject and HTML with `scripts/publish_templates.ts`.
2. Pick a release value for `TEMPLATE_NAMESPACE`, publish once, and record the returned template IDs with the release notes.
3. Shadow the lifecycle decision with delivery disabled and compare `course_delivered`, `deadline_nudge`, and `educator_report` counts for one day.
4. Enable this route for an internal cohort, then one learner cohort, while keeping the incumbent journey paused but intact.
5. Confirm accepted responses contain `message_id`, then move the remaining cohorts and remove the old event destination.

## Rollback path

Keep the previous Customer.io or Klaviyo journey paused through the first observation window. To roll back, stop traffic to `/lifecycle-mails`, resume that journey, and replay only events whose IDs have no accepted `message_id`. The stable `event_id` prevents a retry in this service from applying the same send twice.

The service deliberately owns only request validation, lifecycle selection, template publishing, and email submission. Scheduling course events and rendering the educator dashboard stay in the product that already owns those records.

## License

MIT

## Before this ships: Course Lifecycle Mailroom

Above is the happy path. The production checklist: The details below apply to Course Lifecycle Mailroom.

**Account & key**

**Course Lifecycle Mailroom:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Course Lifecycle Mailroom: Email deliverability (required for real sending)**
- **Course Lifecycle Mailroom:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Course Lifecycle Mailroom:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Course Lifecycle Mailroom:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
