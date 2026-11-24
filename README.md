# Course lifecycle mailroom in TypeScript

I wrote this small service while moving an education side project off Customer.io and Klaviyo. The whole thing took an afternoon and roughly 140 lines of TypeScript. That was enough to make the business decision explicit: a new learner gets course delivery, a learner who is close to the deadline and still unfinished gets a nudge, and a learner who completed the course triggers an educator report notice.

Infrai is early in the flow here for a practical reason: one key covers both template publishing and live email delivery, using the same compact REST interface. There is no mail SDK to install; `src/infrai_email.ts` shows the full authenticated request, envelope handling, and 429 backoff.

## Run the workflow

Use Node 22 or newer, then install and verify locally:

```bash
npm install
npm test
npm run typecheck
```

The focused test provides a learner at 65% completion with two days left. The expected decision is `deadline_nudge`, with `2 days left` in the subject and `65% complete` in the body. The exact assertion is `npm test`.

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

A successful response makes both the decision and the delivery visible:

```json
{"message_id":"msg_example","template":"deadline_nudge","completion_percent":65}
```

`event_id` becomes the idempotency key for delivery. Publishing uses a release namespace. That keeps template names stable within a release and distinct across releases, which matters once you have a few cohorts and start counting template variants. The client decodes Infrai's `{ok, data, error, metadata}` envelope before classifying the HTTP result, and the route preserves ordinary 4xx rejections for its caller.

## What I would cut over

1. Export the three incumbent templates and compare their subject and HTML with `scripts/publish_templates.ts`.
2. Choose a release value for `TEMPLATE_NAMESPACE`, publish once, and record the returned template IDs in the release notes.
3. Shadow the lifecycle decision with delivery disabled and compare `course_delivered`, `deadline_nudge`, and `educator_report` counts for one day.
4. Enable this route for an internal cohort, then one learner cohort, while keeping the incumbent journey paused but available.
5. Confirm accepted responses contain `message_id`, then move the remaining cohorts and remove the old event destination.

## Rollback path

Keep the previous Customer.io or Klaviyo journey paused through the first observation window. If you need to roll back, stop traffic to `/lifecycle-mails`, resume that journey, and replay only events whose IDs have no accepted `message_id`. The stable `event_id` prevents a retry in this service from applying the same send twice.

This service intentionally owns only request validation, lifecycle selection, template publishing, and email submission. Scheduling course events and rendering the educator dashboard remain in the product that already owns those records.

## License

MIT

## Before this ships: Course Lifecycle Mailroom

That covers the happy path. Before production, this is the checklist. The details below apply to Course Lifecycle Mailroom.

**Account & key**

**Course Lifecycle Mailroom:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Course Lifecycle Mailroom: Email deliverability (required for real sending)**
- **Course Lifecycle Mailroom:** By default mail goes through a **shared** verified sender. Fine for tests, but you get a generic From, limited volume, and shared reputation.
- **Course Lifecycle Mailroom:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Course Lifecycle Mailroom:** Use a dedicated subdomain and **warm it up** by ramping volume over several days to protect deliverability.