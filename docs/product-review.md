# Product review and next steps

## Current deployment

The public static application is hosted on OpenAI Sites at https://garantiatrack-console-workshop.gonzaloacd.chatgpt.site. Supabase provides authentication, PostgreSQL, private photo storage and Vault for recoverable tracking capabilities. The local development server binds to loopback. See `deployment.md` and `supabase-setup.md` for configuration and release steps.

## Users and flows

- Workshop members sign in, create a workshop, receive consoles or controllers, upload intake photos and manage order status, quotes and notes. Membership enforcement is server-side; staff provisioning is currently administrative.
- Customers need no account: a private capability URL or QR shows a limited tracking view. The link expires after 30 days and may be explicitly renewed or revoked.
- Workshop members print 58 mm or 80 mm intake tickets. The active QR survives reloads and reprints. Older QR links can be imported once using the original URL. PDF sharing uses the device share sheet or manual download and attachment; WhatsApp text sharing opens a prefilled message. The user selects the recipient and sends manually.
- Demo users can explore fictional local data without a shared QR. Demo and connected records are separate.

## Priorities before broader launch

1. Validate intake, status updates, customer tracking and WhatsApp handoff with real console/controller workshops; measure time saved and willingness to pay.
2. Test 58 mm and 80 mm output and phone scanning on the actual target printer. Review recipient selection and privacy expectations with workshop owners.
3. Configure production email delivery and recovery, monitoring and a tested backup/restore plan including Vault key material before inviting external workshops.
4. Address operational limits identified in `architecture.md`: pagination/search, member management, image inspection, cleanup and abuse controls. Prioritize from observed demand.
5. Define pricing, support and terms after pilot feedback. Sharing is a manual handoff, not an automated notification.

Use feature branches and pull requests into develop; release branches target main and are merged back into develop. CI checks lint, syntax, tests and build. See the existing release and environment documentation for migration ordering and known security advisor notices.
