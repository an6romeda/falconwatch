// Open-Meteo API client (free, no API key required)

const OPEN_METEO_API = "https://api.open-meteo.com/v1/forecast";

// Location coordinates
export const LOCATIONS = {
  vandenberg: {
    name: "Vandenberg SFB",
    lat: 34.6321,
    lon: -120.6107,
    timezone: "America/Los_Angeles",
  },
  "cape-canaveral": {
    name: "Cape Canaveral SFS",
    lat: 28.5620,
    lon: -80.5772,
    timezone: "America/New_York",
  },
  "boca-chica": {
    name: "Starbase",
    lat: 25.9972,
    lon: -97.1571,
    timezone: "America/Chicago",
  },
  phoenix: {
    name: "Phoenix, AZ",
    lat: 33.4484,
    lon: -112.074,
    timezone: "America/Phoenix",
  },
} as const;

export type LocationKey = keyof typeof LOCATIONS;

export interface WeatherData {
  location: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  clouds: number; // Cloud cover percentage
  visibility: number; // Visibility in meters
  wind_speed: number;
  wind_direction: number;
  description: string;
  icon: string;
  sunrise: number;
  sunset: number;
  timestamp: number;
}

// Extended weather data for advanced visibility calculations
export interface ExtendedWeatherData extends WeatherData {
  cloudBase: number | null;      // Cloud base altitude in meters
  cloudCeiling: number | null;   // Cloud ceiling in meters
  surfaceVisibility: number;     // Surface visibility in km
  aqi: number | null;            // Air Quality Index (0-500)
  pm25: number | null;           // PM2.5 concentration
  upperWindSpeed: number | null; // Wind speed at ~10km altitude (m/s)
  upperWindDirection: number | null;
  upperHumidity: number | null;  // Relative humidity at ~10km altitude
}

export interface WeatherConditions {
  launchSite: ExtendedWeatherData | null;
  phoenix: ExtendedWeatherData | null;
}

/**
 * Estimate cloud base altitude based on weather conditions
 * Uses weather codes, cloud layer coverage, and temperature/humidity
 */
function estimateCloudBase(
  weatherCode: number,
  lowClouds: number,
  midClouds: number,
  highClouds: number,
  temperature?: number,
  humidity?: number
): number | null {
  // If clear sky or mainly clear, no significant cloud base
  if (weatherCode <= 1 && lowClouds < 20 && midClouds < 20) {
    return null;
  }

  // Fog conditions - very low ceiling
  if (weatherCode >= 45 && weatherCode <= 48) {
    return 100; // 100m ceiling for fog
  }

  // Precipitation indicates lower cloud base
  if (weatherCode >= 51 && weatherCode <= 67) {
    // Drizzle or rain - nimbostratus typically 500-2000m
    return lowClouds > 30 ? 600 : 1200;
  }

  // Snow
  if (weatherCode >= 71 && weatherCode <= 77) {
    return 800;
  }

  // Thunderstorms - cumulonimbus base typically 500-2000m
  if (weatherCode >= 95) {
    return 1000;
  }

  // Use Lifted Condensation Level (LCL) approximation if we have temp/humidity
  // LCL ≈ 125 × (T - Td) where Td is dew point
  // Simplified: LCL ≈ (100 - RH) × 25 meters (rough approximation)
  if (humidity !== undefined && humidity > 0) {
    const lclEstimate = (100 - humidity) * 25;
    // Clamp to reasonable range based on cloud layers present
    if (lowClouds > 40) {
      return Math.max(300, Math.min(lclEstimate, 2000));
    }
  }

  // Estimate based on cloud layer coverage with refined thresholds
  if (lowClouds > 60) {
    // Dense low clouds: 300-1500m typical (stratus, stratocumulus)
    return 800 + (100 - lowClouds) * 10; // Lower base for denser clouds
  } else if (lowClouds > 30) {
    // Moderate low clouds
    return 1200 + (60 - lowClouds) * 15;
  } else if (midClouds > 60) {
    // Dense mid-level clouds: 2000-6000m (altostratus, altocumulus)
    return 3000;
  } else if (midClouds > 30) {
    // Moderate mid-level clouds
    return 4500;
  } else if (highClouds > 50) {
    // High clouds only (cirrus, cirrostratus): 6000-12000m
    // These don't typically block rocket visibility
    return 8000;
  }

  // Very light/scattered clouds
  if (lowClouds > 10 || midClouds > 10) {
    return 2500;
  }

  return null;
}

// Weather code to description mapping (WMO codes)
const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: "Clear sky", icon: "01d" },
  1: { description: "Mainly clear", icon: "02d" },
  2: { description: "Partly cloudy", icon: "03d" },
  3: { description: "Overcast", icon: "04d" },
  45: { description: "Fog", icon: "50d" },
  48: { description: "Depositing rime fog", icon: "50d" },
  51: { description: "Light drizzle", icon: "09d" },
  53: { description: "Moderate drizzle", icon: "09d" },
  55: { description: "Dense drizzle", icon: "09d" },
  61: { description: "Slight rain", icon: "10d" },
  63: { description: "Moderate rain", icon: "10d" },
  65: { description: "Heavy rain", icon: "10d" },
  71: { description: "Slight snow", icon: "13d" },
  73: { description: "Moderate snow", icon: "13d" },
  75: { description: "Heavy snow", icon: "13d" },
  80: { description: "Slight rain showers", icon: "09d" },
  81: { description: "Moderate rain showers", icon: "09d" },
  82: { description: "Violent rain showers", icon: "09d" },
  95: { description: "Thunderstorm", icon: "11d" },
  96: { description: "Thunderstorm with hail", icon: "11d" },
  99: { description: "Thunderstorm with heavy hail", icon: "11d" },
};

// Fetch current weather for a location using Open-Meteo with extended data
export async function getWeather(
  location: LocationKey
): Promise<ExtendedWeatherData | null> {
  const { name, lat, lon, timezone } = LOCATIONS[location];

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "weather_code",
        "cloud_cover",
        "wind_speed_10m",
        "wind_direction_10m",
        "visibility",
      ].join(","),
      hourly: [
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "visibility",
        "wind_speed_300hPa",
        "wind_direction_300hPa",
        "relative_humidity_300hPa",
      ].join(","),
      daily: "sunrise,sunset",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      timezone: timezone,
      forecast_days: "1",
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`, {
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    const weatherCode = current.weather_code || 0;
    const weatherInfo = WEATHER_CODES[weatherCode] || {
      description: "Unknown",
      icon: "03d",
    };

    // Get visibility from API (in meters) or estimate
    let visibility = current.visibility || 10000;
    if (weatherCode >= 45 && weatherCode <= 48) {
      visibility = Math.min(visibility, 1000); // Fog
    } else if (weatherCode >= 51 && weatherCode <= 55) {
      visibility = Math.min(visibility, 5000); // Drizzle
    } else if (weatherCode >= 61 && weatherCode <= 65) {
      visibility = Math.min(visibility, 3000); // Rain
    }

    // Estimate cloud base using improved algorithm
    const lowClouds = hourly?.cloud_cover_low?.[0] || 0;
    const midClouds = hourly?.cloud_cover_mid?.[0] || 0;
    const highClouds = hourly?.cloud_cover_high?.[0] || 0;
    const cloudBase = estimateCloudBase(
      weatherCode,
      lowClouds,
      midClouds,
      highClouds,
      current.temperature_2m,
      current.relative_humidity_2m
    );

    // Get upper-air data (300hPa is roughly 9km altitude)
    const upperWindSpeed = hourly?.wind_speed_300hPa?.[0] || null;
    const upperWindDirection = hourly?.wind_direction_300hPa?.[0] || null;
    const upperHumidity = hourly?.relative_humidity_300hPa?.[0] || null;

    // Parse sunrise/sunset times to unix timestamps
    const sunriseDate = new Date(daily.sunrise[0]);
    const sunsetDate = new Date(daily.sunset[0]);

    return {
      location: name,
      temperature: Math.round(current.temperature_2m),
      feels_like: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      clouds: current.cloud_cover,
      visibility: visibility,
      wind_speed: Math.round(current.wind_speed_10m),
      wind_direction: current.wind_direction_10m,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      sunrise: Math.floor(sunriseDate.getTime() / 1000),
      sunset: Math.floor(sunsetDate.getTime() / 1000),
      timestamp: Math.floor(Date.now() / 1000),
      // Extended data
      cloudBase,
      cloudCeiling: cloudBase, // Use same as base for now
      surfaceVisibility: visibility / 1000, // Convert to km
      aqi: null, // Would need separate AQI API
      pm25: null,
      upperWindSpeed: upperWindSpeed ? upperWindSpeed * 0.514444 : null, // Convert knots to m/s
      upperWindDirection,
      upperHumidity,
    };
  } catch (error) {
    console.error(`Failed to fetch weather for ${location}:`, error);
    return null;
  }
}

// Fetch weather for a custom location with extended data
export async function getWeatherForCoords(
  lat: number,
  lon: number,
  name: string = "Custom Location"
): Promise<ExtendedWeatherData | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "weather_code",
        "cloud_cover",
        "wind_speed_10m",
        "wind_direction_10m",
        "visibility",
      ].join(","),
      hourly: [
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "visibility",
        "wind_speed_300hPa",
        "wind_direction_300hPa",
        "relative_humidity_300hPa",
      ].join(","),
      daily: "sunrise,sunset",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      timezone: "auto",
      forecast_days: "1",
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`, {
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    const weatherCode = current.weather_code || 0;
    const weatherInfo = WEATHER_CODES[weatherCode] || {
      description: "Unknown",
      icon: "03d",
    };

    let visibility = current.visibility || 10000;
    if (weatherCode >= 45 && weatherCode <= 48) {
      visibility = Math.min(visibility, 1000);
    } else if (weatherCode >= 51 && weatherCode <= 55) {
      visibility = Math.min(visibility, 5000);
    } else if (weatherCode >= 61 && weatherCode <= 65) {
      visibility = Math.min(visibility, 3000);
    }

    // Estimate cloud base using improved algorithm
    const lowClouds = hourly?.cloud_cover_low?.[0] || 0;
    const midClouds = hourly?.cloud_cover_mid?.[0] || 0;
    const highClouds = hourly?.cloud_cover_high?.[0] || 0;
    const cloudBase = estimateCloudBase(
      weatherCode,
      lowClouds,
      midClouds,
      highClouds,
      current.temperature_2m,
      current.relative_humidity_2m
    );

    // Upper-air data
    const upperWindSpeed = hourly?.wind_speed_300hPa?.[0] || null;
    const upperWindDirection = hourly?.wind_direction_300hPa?.[0] || null;
    const upperHumidity = hourly?.relative_humidity_300hPa?.[0] || null;

    const sunriseDate = new Date(daily.sunrise[0]);
    const sunsetDate = new Date(daily.sunset[0]);

    return {
      location: name,
      temperature: Math.round(current.temperature_2m),
      feels_like: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      clouds: current.cloud_cover,
      visibility: visibility,
      wind_speed: Math.round(current.wind_speed_10m),
      wind_direction: current.wind_direction_10m,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      sunrise: Math.floor(sunriseDate.getTime() / 1000),
      sunset: Math.floor(sunsetDate.getTime() / 1000),
      timestamp: Math.floor(Date.now() / 1000),
      // Extended data
      cloudBase,
      cloudCeiling: cloudBase,
      surfaceVisibility: visibility / 1000,
      aqi: null,
      pm25: null,
      upperWindSpeed: upperWindSpeed ? upperWindSpeed * 0.514444 : null,
      upperWindDirection,
      upperHumidity,
    };
  } catch (error) {
    console.error(`Failed to fetch weather for ${name}:`, error);
    return null;
  }
}

// Fetch weather for launch site and default viewer location
export async function getAllWeather(siteId: LocationKey = "vandenberg"): Promise<WeatherConditions> {
  const [launchSite, phoenix] = await Promise.all([
    getWeather(siteId),
    getWeather("phoenix"),
  ]);

  return { launchSite, phoenix };
}

// Get weather forecast for a specific date/time at custom coordinates
export async function getWeatherForecastForCoords(
  lat: number,
  lon: number,
  name: string,
  targetTimestamp: number
): Promise<ExtendedWeatherData | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "weather_code",
        "cloud_cover",
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "wind_speed_10m",
        "wind_direction_10m",
        "visibility",
        "wind_speed_300hPa",
        "wind_direction_300hPa",
        "relative_humidity_300hPa",
      ].join(","),
      daily: "sunrise,sunset",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      timezone: "auto",
      forecast_days: "7",
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`, {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Find the forecast closest to the target time
    const hourlyTimes = data.hourly.time as string[];
    let closestIndex = 0;
    let closestDiff = Infinity;

    for (let i = 0; i < hourlyTimes.length; i++) {
      const forecastTime = new Date(hourlyTimes[i]).getTime() / 1000;
      const diff = Math.abs(forecastTime - targetTimestamp);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    const hourly = data.hourly;
    const weatherCode = hourly.weather_code[closestIndex] || 0;
    const weatherInfo = WEATHER_CODES[weatherCode] || {
      description: "Unknown",
      icon: "03d",
    };

    let visibility = hourly.visibility?.[closestIndex] || 10000;
    if (weatherCode >= 45 && weatherCode <= 48) {
      visibility = Math.min(visibility, 1000);
    } else if (weatherCode >= 51 && weatherCode <= 55) {
      visibility = Math.min(visibility, 5000);
    } else if (weatherCode >= 61 && weatherCode <= 65) {
      visibility = Math.min(visibility, 3000);
    }

    // Estimate cloud base using improved algorithm
    const lowClouds = hourly.cloud_cover_low?.[closestIndex] || 0;
    const midClouds = hourly.cloud_cover_mid?.[closestIndex] || 0;
    const highClouds = hourly.cloud_cover_high?.[closestIndex] || 0;
    const cloudBase = estimateCloudBase(
      weatherCode,
      lowClouds,
      midClouds,
      highClouds,
      hourly.temperature_2m?.[closestIndex],
      hourly.relative_humidity_2m?.[closestIndex]
    );

    // Upper-air data
    const upperWindSpeed = hourly.wind_speed_300hPa?.[closestIndex] || null;
    const upperWindDirection = hourly.wind_direction_300hPa?.[closestIndex] || null;
    const upperHumidity = hourly.relative_humidity_300hPa?.[closestIndex] || null;

    const sunriseDate = new Date(data.daily.sunrise[0]);
    const sunsetDate = new Date(data.daily.sunset[0]);

    return {
      location: name,
      temperature: Math.round(hourly.temperature_2m[closestIndex]),
      feels_like: Math.round(hourly.apparent_temperature[closestIndex]),
      humidity: hourly.relative_humidity_2m[closestIndex],
      clouds: hourly.cloud_cover[closestIndex],
      visibility: visibility,
      wind_speed: Math.round(hourly.wind_speed_10m[closestIndex]),
      wind_direction: hourly.wind_direction_10m[closestIndex],
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      sunrise: Math.floor(sunriseDate.getTime() / 1000),
      sunset: Math.floor(sunsetDate.getTime() / 1000),
      timestamp: new Date(hourlyTimes[closestIndex]).getTime() / 1000,
      // Extended data
      cloudBase,
      cloudCeiling: cloudBase,
      surfaceVisibility: visibility / 1000,
      aqi: null,
      pm25: null,
      upperWindSpeed: upperWindSpeed ? upperWindSpeed * 0.514444 : null,
      upperWindDirection,
      upperHumidity,
    };
  } catch (error) {
    console.error(`Failed to fetch forecast for ${name}:`, error);
    return null;
  }
}

// Get weather forecast for a specific date/time with extended data
export async function getWeatherForecast(
  location: LocationKey,
  targetTimestamp: number
): Promise<ExtendedWeatherData | null> {
  const { name, lat, lon, timezone } = LOCATIONS[location];

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "weather_code",
        "cloud_cover",
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "wind_speed_10m",
        "wind_direction_10m",
        "visibility",
        "wind_speed_300hPa",
        "wind_direction_300hPa",
        "relative_humidity_300hPa",
      ].join(","),
      daily: "sunrise,sunset",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      timezone: timezone,
      forecast_days: "7",
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`, {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Find the forecast closest to the target time
    const hourlyTimes = data.hourly.time as string[];
    let closestIndex = 0;
    let closestDiff = Infinity;

    for (let i = 0; i < hourlyTimes.length; i++) {
      const forecastTime = new Date(hourlyTimes[i]).getTime() / 1000;
      const diff = Math.abs(forecastTime - targetTimestamp);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    const hourly = data.hourly;
    const weatherCode = hourly.weather_code[closestIndex] || 0;
    const weatherInfo = WEATHER_CODES[weatherCode] || {
      description: "Unknown",
      icon: "03d",
    };

    let visibility = hourly.visibility?.[closestIndex] || 10000;
    if (weatherCode >= 45 && weatherCode <= 48) {
      visibility = Math.min(visibility, 1000);
    } else if (weatherCode >= 51 && weatherCode <= 55) {
      visibility = Math.min(visibility, 5000);
    } else if (weatherCode >= 61 && weatherCode <= 65) {
      visibility = Math.min(visibility, 3000);
    }

    // Estimate cloud base using improved algorithm
    const lowClouds = hourly.cloud_cover_low?.[closestIndex] || 0;
    const midClouds = hourly.cloud_cover_mid?.[closestIndex] || 0;
    const highClouds = hourly.cloud_cover_high?.[closestIndex] || 0;
    const cloudBase = estimateCloudBase(
      weatherCode,
      lowClouds,
      midClouds,
      highClouds,
      hourly.temperature_2m?.[closestIndex],
      hourly.relative_humidity_2m?.[closestIndex]
    );

    // Upper-air data
    const upperWindSpeed = hourly.wind_speed_300hPa?.[closestIndex] || null;
    const upperWindDirection = hourly.wind_direction_300hPa?.[closestIndex] || null;
    const upperHumidity = hourly.relative_humidity_300hPa?.[closestIndex] || null;

    const sunriseDate = new Date(data.daily.sunrise[0]);
    const sunsetDate = new Date(data.daily.sunset[0]);

    return {
      location: name,
      temperature: Math.round(hourly.temperature_2m[closestIndex]),
      feels_like: Math.round(hourly.apparent_temperature[closestIndex]),
      humidity: hourly.relative_humidity_2m[closestIndex],
      clouds: hourly.cloud_cover[closestIndex],
      visibility: visibility,
      wind_speed: Math.round(hourly.wind_speed_10m[closestIndex]),
      wind_direction: hourly.wind_direction_10m[closestIndex],
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      sunrise: Math.floor(sunriseDate.getTime() / 1000),
      sunset: Math.floor(sunsetDate.getTime() / 1000),
      timestamp: new Date(hourlyTimes[closestIndex]).getTime() / 1000,
      // Extended data
      cloudBase,
      cloudCeiling: cloudBase,
      surfaceVisibility: visibility / 1000,
      aqi: null,
      pm25: null,
      upperWindSpeed: upperWindSpeed ? upperWindSpeed * 0.514444 : null,
      upperWindDirection,
      upperHumidity,
    };
  } catch (error) {
    console.error(`Failed to fetch forecast for ${location}:`, error);
    return null;
  }
}

// Get viewing conditions description based on weather
export function getViewingConditions(weather: WeatherData): {
  rating: "excellent" | "good" | "fair" | "poor";
  description: string;
} {
  const { clouds, visibility } = weather;

  if (clouds <= 10 && visibility >= 10000) {
    return {
      rating: "excellent",
      description: "Crystal clear skies, excellent visibility",
    };
  } else if (clouds <= 25 && visibility >= 8000) {
    return {
      rating: "good",
      description: "Mostly clear, good viewing conditions",
    };
  } else if (clouds <= 50 && visibility >= 5000) {
    return {
      rating: "fair",
      description: "Partly cloudy, moderate visibility",
    };
  } else {
    return {
      rating: "poor",
      description: "Cloudy or limited visibility",
    };
  }
}
