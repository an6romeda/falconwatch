# FalconWatch

**Unofficial SpaceX Launch Tracker**

A real-time launch tracking application for SpaceX missions from Vandenberg, Cape Canaveral, and Starbase. Calculate visibility from your location, get weather conditions, and never miss a launch.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Features

- **Live Countdown** - Real-time countdown to the next launch from any tracked site
- **Multi-Site Tracking** - Vandenberg, Cape Canaveral, and Starbase launches
- **Visibility Calculator** - 8-factor algorithm calculates your chances of seeing the launch based on:
  - Cloud cover and weather conditions
  - Solar elevation (twilight launches are best)
  - Distance from launch site
  - Viewing angle and bearing
  - Atmospheric clarity
  - Rocket plume visibility
- **Interactive Map** - Trajectory visualization with your viewing location
- **Location Options** - GPS, city search, or ZIP code lookup
- **Weather Data** - Current conditions at the launch site and your location
- **Email Alerts** - Get notified 24 hours before launches (encrypted storage)
- **Accessibility** - High contrast mode, reduced motion, keyboard navigation

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Maps**: React Leaflet
- **Animations**: Framer Motion
- **Data**: [The Space Devs API](https://thespacedevs.com/), [Open-Meteo](https://open-meteo.com/)

## Disclaimer

This is an unofficial, fan-made project. **Not affiliated with SpaceX.**

Launch data provided by [The Space Devs](https://thespacedevs.com/).
Weather data provided by [Open-Meteo](https://open-meteo.com/).

## License

All rights reserved.
