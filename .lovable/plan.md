# Axion Screenshot PDFs — Internal Enablement + Customer Positioning

Two annotated PDF walkthroughs of the Axion Data Accelerator, built from real screenshots captured against a populated simulation workspace.

## What gets produced

1. `axion-enablement-walkthrough.pdf` — internal audience. Per module: what the screen is, how to use it, where to click, what "done" looks like.
2. `axion-customer-positioning.pdf` — customer-facing. Per module: the client problem, what Axion shows, the value/differentiator message. Lighter on mechanics.

Both share the same screenshot set and Axion brand styling (white background, Tech Mahindra red accents, charcoal/slate type, Axion logo on cover and page footers).

## Modules covered (12)

Portfolio (role dashboard + guided path), Lifecycle Manager, Assessments, Architecture Studio, Data Product Library, Mapping Workbench, Source Catalog / Metadata Import, Connectivity Decision Engine, Identity Studio, Trust & Compliance, Governance & Risk, Agentforce Studio (portfolio + workbench), Simulation Hub.

## Page layout

Each module gets one page:

```text
+--------------------------------------------------+
| MODULE NAME                      Lifecycle stage |
| One-line purpose statement                       |
|                                                  |
|  [ screenshot, framed, red callout markers 1-3 ] |
|                                                  |
| 1  Key area — what it is / why it matters        |
| 2  Key area — ...                               |
| 3  Key area — ...                               |
|                                                  |
| Key message: single bold takeaway line           |
|              [logo]   Axion Data Accelerator  p# |
+--------------------------------------------------+
```

Numbered red circular markers are drawn onto the screenshot at the coordinates of the highlighted UI element, matched to the numbered notes below it. Cover page and a lifecycle-overview page open each document; the internal deck also closes with an access/how-to-get-started page.

## Technical approach

- Capture with Playwright against `http://localhost:8080` at 1600x1100 viewport, restoring the injected auth session, selecting a simulation (`is_demo`) client so screens are populated, then visiting each route and screenshotting the main content area to `/tmp/axion-shots/`.
- Locate highlight targets by querying bounding boxes of stable elements (headings, stat tiles, tables, action buttons) in the same script and writing a JSON manifest of marker coordinates per screenshot.
- Compose both PDFs with ReportLab (Platypus + canvas overlays), registering DejaVu Sans for clean text, scaling screenshots to fit with margins, drawing markers from the manifest.
- Output to `/mnt/documents/`.
- QA: render every page with `pdftoppm` and inspect each image for clipped text, overlapping callouts, low-contrast markers, blank or misordered pages; fix and re-verify before delivery.

## Notes

- All copy is written from the actual module content in the app — no invented metrics or customer names. Screens showing simulation data are labelled as illustrative.
- Placeholder modules (Validation, Deployment, Monitoring, Administration) are excluded from the module pages; the internal deck mentions them in a one-line roadmap note.
