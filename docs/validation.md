# Workshop validation script

Use fictional names and a spare device. Do not import customer records.

1. Ask the technician to receive a controller without coaching. Time the flow.
2. Have them record a cable and a cosmetic mark, then attach a harmless device photo.
3. Ask them to find the order after returning to the dashboard.
4. Ask them to record a budget and a customer-facing message.
5. Switch to tracking and ask a second person to explain the current state.
6. Verify they understand the difference between internal notes and the customer message.
7. Ask what prevents replacing their current intake method.

Record task completion, time, confusion, missing information and whether the workshop would run a supervised pilot. Aim for a familiar intake in approximately two minutes. Do not infer purchase intent from compliments.

## Manual QA checklist

- Desktop dashboard, detail and tracking are readable.
- At 390 px, there is no horizontal document overflow and touch controls remain accessible.
- Keyboard navigation reaches labeled inputs and actions.
- New order survives reload in the same browser.
- Invalid input does not save an order.
- Status changes appear in the customer timeline.
- Internal details do not appear in the customer view.
- Search with no results has an understandable empty state.
- Missing tracking IDs have an error screen.
- Canceling reset preserves data.
- Printed reception hides navigation and editing controls.

Automated domain tests are included. Browser verification results are recorded in `qa-results.md` after execution.
