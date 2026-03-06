# FalconWatch

SpaceX launch visibility tracker for Vandenberg, Cape Canaveral, and Starbase. Enter any city to get visibility predictions based on trajectory, weather, and time of day.

## Features

- **Multi-Site Tracking** — Vandenberg, Cape Canaveral, and Starbase launches
- **Visibility Calculator** — 8-factor algorithm based on cloud cover, solar elevation, distance, viewing angle, atmospheric clarity, and plume visibility
- **Visibility Map** — See if you are within viewing distance with your location plotted
- **Live Countdown** — Real-time countdown to the next launch from any tracked site
- **Location Options** — GPS, city search, or ZIP code lookup
- **Weather Data** — Current conditions at the launch site and your location
- **Email Alerts** — Get notified 24 hours before launches with per-site preferences
- **Accessibility** — High contrast mode, reduced motion, keyboard navigation

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Maps**: React Leaflet
- **Animations**: Framer Motion
- **Data**: [The Space Devs API](https://thespacedevs.com/), [Open-Meteo](https://open-meteo.com/)

## Disclaimer

This is an unofficial, fan-made project. Not affiliated with SpaceX. Launch data provided by [The Space Devs](https://thespacedevs.com/). Weather data provided by [Open-Meteo](https://open-meteo.com/).

## License

[MIT](LICENSE)
