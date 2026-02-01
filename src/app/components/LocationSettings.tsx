"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ViewingLocation {
  name: string;
  lat: number;
  lon: number;
}

interface LocationSettingsProps {
  onLocationChange: (location: ViewingLocation) => void;
  currentLocation: ViewingLocation;
}

interface GeocodingResult {
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
}

export default function LocationSettings({
  onLocationChange,
  currentLocation,
}: LocationSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<
    "left" | "right" | "center"
  >("right");
  const [geolocating, setGeolocating] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  // Focus input reliably when dropdown opens (works across browsers including mobile Safari)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    // Use mousedown + touchstart for broad browser support
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Escape key to close (document-level for reliability)
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  // Calculate dropdown position based on viewport
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = 320;
      const padding = 16;

      const spaceOnRight = viewportWidth - buttonRect.right;
      const spaceOnLeft = buttonRect.left;

      if (viewportWidth < 400) {
        setDropdownPosition("center");
      } else if (spaceOnRight >= dropdownWidth + padding) {
        setDropdownPosition("left");
      } else if (spaceOnLeft >= dropdownWidth + padding) {
        setDropdownPosition("right");
      } else {
        setDropdownPosition("center");
      }
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const isZipCode = (query: string): boolean => {
    return /^\d{5}$/.test(query.trim());
  };

  const isPartialZip = (query: string): boolean => {
    return /^\d{1,4}$/.test(query.trim());
  };

  const searchLocation = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setError("");
      setIsSearching(false);
      return;
    }

    // Don't search partial ZIP codes — wait for 5 digits
    if (isPartialZip(trimmed)) {
      setResults([]);
      setError("");
      setIsSearching(false);
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setIsSearching(true);
    setError("");
    setHighlightedIndex(-1);

    try {
      // All geocoding goes through our own API route (avoids CORS issues)
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(trimmed)}`,
        { signal }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        setError(
          isZipCode(trimmed)
            ? "ZIP code not found. Try a city name instead."
            : "No locations found. Try a different search."
        );
        setResults([]);
      } else {
        setResults(data.results);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Search failed. Please try again.");
      setResults([]);
    } finally {
      if (!signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);

    // Clear pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();

    if (!trimmed) {
      setResults([]);
      setError("");
      setIsSearching(false);
      return;
    }

    // For partial digits, don't show loading or search yet
    if (isPartialZip(trimmed)) {
      setResults([]);
      setError("");
      setIsSearching(false);
      return;
    }

    // Show loading indicator immediately, actual search is debounced
    if (trimmed.length >= 2) {
      setIsSearching(true);
    }

    debounceRef.current = setTimeout(() => {
      searchLocation(value);
    }, 300);
  };

  const handleSelectResult = (result: GeocodingResult) => {
    const locationName = result.admin1
      ? `${result.name}, ${result.admin1}`
      : `${result.name}, ${result.country}`;

    const location: ViewingLocation = {
      name: locationName,
      lat: result.latitude,
      lon: result.longitude,
    };

    onLocationChange(location);
    localStorage.setItem(
      "falconwatch_viewing_location",
      JSON.stringify(location)
    );
    handleClose();
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setGeolocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Reverse geocode through our own server (protects user IP from third parties)
          const response = await fetch(
            `/api/geocode?lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          );

          let name = "My Location";
          if (response.ok) {
            const data = await response.json();
            if (data.name) {
              name = data.name;
            }
          }

          const location: ViewingLocation = {
            name,
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };

          onLocationChange(location);
          localStorage.setItem(
            "falconwatch_viewing_location",
            JSON.stringify(location)
          );
          handleClose();
        } catch {
          // If reverse geocoding fails, still use coords with generic name
          const location: ViewingLocation = {
            name: "My Location",
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          onLocationChange(location);
          localStorage.setItem(
            "falconwatch_viewing_location",
            JSON.stringify(location)
          );
          handleClose();
        } finally {
          setGeolocating(false);
        }
      },
      (err) => {
        setGeolocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied. Enter your city or ZIP instead.");
        } else {
          setError("Could not get your location. Enter it manually.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelectResult(results[highlightedIndex]);
      } else if (results.length === 1) {
        // Auto-select if there's only one result
        handleSelectResult(results[0]);
      } else if (searchQuery.trim().length >= 2) {
        // Force immediate search (cancel debounce)
        if (debounceRef.current) clearTimeout(debounceRef.current);
        searchLocation(searchQuery);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery("");
    setResults([]);
    setError("");
    setHighlightedIndex(-1);
    setGeolocating(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  };

  const handleClear = () => {
    setSearchQuery("");
    setResults([]);
    setError("");
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Current location button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-off-white/70 hover:text-off-white transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Change viewing location, currently set to ${currentLocation.name}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="font-mono">{currentLocation.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-space-navy/95 border border-nasa-blue/40 rounded-lg shadow-xl z-[100] backdrop-blur-sm ${
              dropdownPosition === "center"
                ? "left-1/2 -translate-x-1/2"
                : dropdownPosition === "left"
                  ? "left-0"
                  : "right-0"
            }`}
          >
            <div className="p-3">
              {/* Use my location */}
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={geolocating}
                className="w-full flex items-center gap-2 px-3 py-2.5 mb-2 text-sm text-nasa-blue hover:text-off-white hover:bg-nasa-blue/20 rounded transition-colors disabled:opacity-50"
              >
                {geolocating ? (
                  <svg
                    className="w-4 h-4 animate-spin flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      strokeWidth={2}
                    />
                    <path
                      strokeLinecap="round"
                      strokeWidth={2}
                      d="M12 2v4m0 12v4m-10-10h4m12 0h4"
                    />
                  </svg>
                )}
                {geolocating ? "Finding your location..." : "Use my current location"}
              </button>

              <div className="border-t border-nasa-blue/30 pt-3">
                {/* Search input */}
                <div className="relative">
                  <label htmlFor="location-search" className="sr-only">
                    Search city or ZIP code
                  </label>
                  <input
                    ref={inputRef}
                    id="location-search"
                    type="search"
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={searchQuery}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search city or ZIP code..."
                    className="retro-input w-full text-sm pr-8"
                    role="combobox"
                    aria-expanded={results.length > 0}
                    aria-controls="location-results"
                    aria-activedescendant={
                      highlightedIndex >= 0
                        ? `location-result-${highlightedIndex}`
                        : undefined
                    }
                    aria-describedby={error ? "location-error" : undefined}
                  />

                  {/* Spinner or clear button inside input */}
                  {isSearching ? (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        className="w-4 h-4 animate-spin text-off-white/40"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    </div>
                  ) : (
                    searchQuery && (
                      <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-off-white/40 hover:text-off-white/70 transition-colors"
                        aria-label="Clear search"
                        tabIndex={-1}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )
                  )}
                </div>

                {error && (
                  <p
                    id="location-error"
                    className="text-xs text-retro-orange mt-2"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                {/* Search results */}
                {results.length > 0 && (
                  <ul
                    id="location-results"
                    role="listbox"
                    className="mt-2 border-t border-nasa-blue/30 pt-2 space-y-0.5 max-h-48 overflow-y-auto themed-scrollbar"
                  >
                    {results.map((result, index) => (
                      <li
                        key={`${result.latitude}-${result.longitude}-${index}`}
                        id={`location-result-${index}`}
                        role="option"
                        aria-selected={index === highlightedIndex}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectResult(result)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                            index === highlightedIndex
                              ? "bg-nasa-blue/30 text-off-white"
                              : "text-off-white/70 hover:bg-nasa-blue/20 hover:text-off-white"
                          }`}
                        >
                          <span className="font-medium">{result.name}</span>
                          {result.admin1 && (
                            <span className="text-off-white/50">
                              , {result.admin1}
                            </span>
                          )}
                          <span className="text-off-white/40">
                            {" "}
                            - {result.country}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
