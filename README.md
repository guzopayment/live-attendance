# Gubae Beteseb — Live Attendance Display

This is a separate Vercel-ready frontend for the ceremony projector and the attendance operator.

## Pages

- `/` — public live projector screen. No login required.
- `/operator` — protected operator page. Admin logs in using the existing server admin account and can search/filter by name, organization, phone, and attendance status.

## Environment variables

Create `.env.local` for local development:

```env
VITE_API_BASE_URL=https://server-y72m.onrender.com/api
VITE_SOCKET_URL=https://server-y72m.onrender.com
```

For Vercel, add the same two variables in Project Settings → Environment Variables.

## Server requirement

The shared server must contain the new `/api/attendance/live` and `/api/attendance/operator` routes and allow the Vercel origin through `LIVE_ATTENDANCE_ORIGIN`.

Example Render environment variable:

```env
LIVE_ATTENDANCE_ORIGIN=https://YOUR-LIVE-ATTENDANCE-PROJECT.vercel.app
```

## Deployment

1. Put this `live-attendance` folder in a separate GitHub repository.
2. Import it into Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add `VITE_API_BASE_URL` and `VITE_SOCKET_URL`.
7. Deploy.

The projector page automatically refreshes every 5 seconds and also reacts immediately to Socket.IO attendance events from the scanner.

## Visual background
The live display uses the participant-page `qineeSocialDeputs.jpg` background with an emerald translucent overlay, dark teal/gold brand palette, glass/blurred surfaces, and rounded modern panels. The image is bundled at `public/qineeSocialDeputs.jpg`.


Marquee fix: the live check-in ticker is forced to run continuously and is not disabled by prefers-reduced-motion, because this page is intended for an event projector.
