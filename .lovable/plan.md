## Deliverable

A single Word document — `Phoenix360_Demo_TalkTrack_10min.docx` — written for a World Bank Group / IFC executive audience. No application code changes.

## Approach

Before writing, I'll walk the built app to make sure every click-path, screen name, KPI label, client, and project ID in the script matches what's actually on screen (personas, Command Center KPIs, Client 360 tabs, Project 360 lifecycle, Exposure drill-downs, Document Review, Phoenix AI). Nothing invented — only figures the seeded demo data actually shows.

## Document structure

**Cover block** — title, subtitle, audience, run time (10 min), presenter name placeholder.

**Before you start** — 4-item pre-flight checklist: sign in, set persona to Senior Investment Officer, close the AI panel, browser at full width.

**Timed run sheet** — a two-column table (time / segment) giving the at-a-glance shape of the talk:

```text
0:00–0:45   Framing: the institutional problem
0:45–2:15   Command Center + persona switch
2:15–4:00   Client 360 & relationship intelligence
4:00–6:00   Project 360 & lifecycle readiness
6:00–7:15   Phoenix AI in context
7:15–8:30   Risk, exposure & document review
8:30–9:30   Platform trust: integration, migration, governance
9:30–10:00  Close & the ask
```

**Segment pages** — one section per segment, each with:
- *Screen* — exact route and what's visible
- *Click path* — numbered, literal UI actions
- *Say* — the spoken script, written in full sentences an executive presenter can read verbatim (~130 words per minute, sized to the segment)
- *Point to* — the two or three on-screen elements to draw the eye to
- *Executive value* — the one-sentence "so what" tying back to the transformation themes

**Narrative spine** — the script runs one continuous story rather than a feature tour: a relationship signal surfaces on the Command Center, is traced through the client and the flagship GreenGrid project, tested against risk and conditions, and closed with an AI-assisted decision — showing origination-to-portfolio continuity on one platform.

**Appendix A — Q&A prep**: eight likely executive questions (data residency, AI governance and human-in-the-loop, legacy migration, timeline, effort, integration with existing systems) with short answers.

**Appendix B — Recovery notes**: what to say if a screen is slow, and safe fallback moments; a reminder that all data is illustrative demo data.

**Appendix C — 5-minute cut**: which two segments to drop and the bridging sentence, for when the slot gets shortened.

## Formatting

US Letter, 1" margins, Arial. Headings and accent rules in the Phoenix institutional navy `#0B3B60` with teal `#3E7F8F` secondary; timing tables use light-teal header shading to match the app's design tokens. Timing in the margin-adjacent left column so it's scannable while presenting. Page numbers in the footer.

## Verification

After generating, I'll convert every page to an image and inspect each one for clipped text, broken tables, or bad page breaks, then fix and re-run until clean. The finished `.docx` lands in your documents for download.
