# Third-party notices

The receipt feature uses qrcode 1.5.4 (MIT, copyright 2012 Ryan Day) and its bundled dijkstrajs dependency (MIT). Their full licenses are copied to the generated public dist/vendor/qrcode.LICENSE.txt during every build. Preserve that file when distributing the browser bundle.

jsQR 1.4.0 (Apache-2.0) is a development-only QR decoder used to independently verify the generated receipt SVG. Its license remains in the npm package; it is not included in the deployed browser assets.

Dependencies and exact resolved versions are recorded in package-lock.json. Existing Supabase and build-tool dependencies retain their package licenses.
