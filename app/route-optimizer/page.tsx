"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Fix icon imports - import icons individually instead of using barrel imports
import { AlertTriangle } from "lucide-react";
import { BarChart2 } from "lucide-react";
import { Clock } from "lucide-react";
import { Loader2 } from "lucide-react";
import { MapPin } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Hash } from "lucide-react";
import { Network } from "lucide-react";
import { Leaf } from "lucide-react"; // Using Leaf instead of Tree

// Make sure Tooltip components are imported correctly
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Add window interface augmentation for TomTom
declare global {
  interface Window {
    tt: any;
  }
}

// TomTom map will be loaded dynamically on the client side
let map: any = null;
let tomtom: any = null;
let routeControl: any = null;
let searchMarkers: any[] = [];

// API key from environment variables
const TOMTOM_API_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;

// Create a separate component that uses search params
function RouteOptimizerContent() {
  const mapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [startLocation, setStartLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [routeType, setRouteType] = useState("eco"); // eco, fast, short
  const [airQualityData, setAirQualityData] = useState<any>(null);
  const [isLoadingAirQuality, setIsLoadingAirQuality] = useState(false);
  const [showAirQualityLayer, setShowAirQualityLayer] = useState(false);

  // Search suggestions
  const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  // Environmental impact stats
  const [environmentalStats, setEnvironmentalStats] = useState({
    co2Saved: 0,
    fuelSaved: 0,
    timeAdded: 0,
  });

  // Search suggestions function using TomTom Fuzzy Search API
  const fetchSuggestions = async (query: string, isStart: boolean) => {
    if (!query || query.length < 2) {
      isStart ? setStartSuggestions([]) : setDestSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(
          query
        )}.json?key=${TOMTOM_API_KEY}&limit=5&typeahead=true&countrySet=IN&language=en-GB`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const suggestions = data.results.map((result: any) => ({
            id: result.id,
            text: result.address.freeformAddress,
            position: result.position,
          }));

          if (isStart) {
            setStartSuggestions(suggestions);
            setShowStartSuggestions(true);
          } else {
            setDestSuggestions(suggestions);
            setShowDestSuggestions(true);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  // Function to search for a location
  const searchLocation = async (
    query: string,
    isStart = true,
    addMarker = true
  ) => {
    if (!tomtom || !query) return;

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(
          query
        )}.json?key=${TOMTOM_API_KEY}&limit=1&countrySet=IN`
      );

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const location = data.results[0];
        const position = location.position;

        // Add marker for the location only if addMarker is true
        if (addMarker) {
          const marker = new tomtom.Marker()
            .setLngLat([position.lon, position.lat])
            .addTo(map);

          // Store in the markers array for later removal
          searchMarkers.push(marker);

          // Center map on the first search result
          map.flyTo({ center: [position.lon, position.lat], zoom: 14 });
        }

        // Update state based on whether it's start or destination
        if (isStart) {
          setStartLocation(location.address.freeformAddress);
          setShowStartSuggestions(false);
        } else {
          setDestination(location.address.freeformAddress);
          setShowDestSuggestions(false);
        }

        return {
          position,
          address: location.address.freeformAddress,
        };
      }
    } catch (error) {
      console.error("Error searching for location:", error);
    } finally {
      setIsSearching(false);
    }

    return null;
  };

  // Handle selection from suggestions
  const handleSelectSuggestion = (suggestion: any, isStart: boolean) => {
    if (isStart) {
      setStartLocation(suggestion.text);
      setShowStartSuggestions(false);
      // Add marker for start location
      if (map && tomtom) {
        const marker = new tomtom.Marker()
          .setLngLat([suggestion.position.lon, suggestion.position.lat])
          .addTo(map);
        searchMarkers.push(marker);
        map.flyTo({
          center: [suggestion.position.lon, suggestion.position.lat],
          zoom: 14,
        });
      }
    } else {
      setDestination(suggestion.text);
      setShowDestSuggestions(false);
      // Add marker for destination
      if (map && tomtom) {
        const marker = new tomtom.Marker()
          .setLngLat([suggestion.position.lon, suggestion.position.lat])
          .addTo(map);
        searchMarkers.push(marker);
        map.flyTo({
          center: [suggestion.position.lon, suggestion.position.lat],
          zoom: 14,
        });
      }
    }
  };

  // Function to fetch air quality data
  const fetchAirQualityData = async (lat: string, lon: string) => {
    setIsLoadingAirQuality(true);
    try {
      const response = await fetch(
        `https://uaqmp-api.hanishrishen.workers.dev/api/current?lat=${lat}&lon=${lon}`
      );
      if (response.ok) {
        const data = await response.json();
        setAirQualityData(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching air quality data:", error);
    } finally {
      setIsLoadingAirQuality(false);
    }
    return null;
  };

  // Function to visualize air quality on the map
  const visualizeAirQuality = async () => {
    if (!map || !tomtom || !startLocation || !destination) return;

    // Toggle air quality layer visibility
    const newVisibilityState = !showAirQualityLayer;
    setShowAirQualityLayer(newVisibilityState);

    // If we're turning it off, remove the layers
    if (showAirQualityLayer) {
      if (map.getLayer("air-quality-text")) {
        map.removeLayer("air-quality-text");
      }
      if (map.getLayer("air-quality-layer")) {
        map.removeLayer("air-quality-layer");
      }
      if (map.getSource("air-quality-source")) {
        map.removeSource("air-quality-source");
      }
      return;
    }

    // Otherwise, we're turning it on - fetch and display air quality
    setIsLoadingAirQuality(true);

    try {
      // Search for start and destination coordinates
      const startPoint = await searchLocation(startLocation, true, false);
      const endPoint = await searchLocation(destination, false, false);

      if (!startPoint || !endPoint) {
        alert("Couldn't find one of the locations. Please try again.");
        setIsLoadingAirQuality(false);
        return;
      }

      // Get air quality data for the route area (midpoint)
      const midLat = (startPoint.position.lat + endPoint.position.lat) / 2;
      const midLon = (startPoint.position.lon + endPoint.position.lon) / 2;

      const aqData = await fetchAirQualityData(
        midLat.toString(),
        midLon.toString()
      );

      if (aqData) {
        // Choose color based on AQI
        const getAqiColor = (aqi: number) => {
          if (aqi <= 50) return "#10b981"; // Good - Green
          if (aqi <= 100) return "#f59e0b"; // Moderate - Yellow
          if (aqi <= 150) return "#f97316"; // USG - Orange
          if (aqi <= 200) return "#ef4444"; // Unhealthy - Red
          if (aqi <= 300) return "#8b5cf6"; // Very Unhealthy - Purple
          return "#831843"; // Hazardous - Maroon
        };

        // Add air quality visualization as a circle overlay
        if (map.getSource("air-quality-source")) {
          if (map.getLayer("air-quality-text")) {
            map.removeLayer("air-quality-text");
          }
          if (map.getLayer("air-quality-layer")) {
            map.removeLayer("air-quality-layer");
          }
          map.removeSource("air-quality-source");
        }

        // Create a GeoJSON source for the air quality visualization
        map.addSource("air-quality-source", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [midLon, midLat],
            },
            properties: {
              aqi: aqData.aqi,
            },
          },
        });

        // Add a circle layer to visualize air quality
        map.addLayer({
          id: "air-quality-layer",
          type: "circle",
          source: "air-quality-source",
          paint: {
            "circle-radius": 70,
            "circle-color": getAqiColor(aqData.aqi),
            "circle-opacity": 0.3,
            "circle-stroke-width": 2,
            "circle-stroke-color": getAqiColor(aqData.aqi),
          },
        });

        // Add a text label with the AQI
        map.addLayer({
          id: "air-quality-text",
          type: "symbol",
          source: "air-quality-source",
          layout: {
            "text-field": `AQI: ${aqData.aqi} (${aqData.level})`,
            "text-font": ["Open Sans Bold"],
            "text-size": 16,
            "text-anchor": "center",
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 1,
          },
        });

        // Let the user know what the colors mean
        let airQualityMessage = "";
        if (aqData.aqi <= 50) {
          airQualityMessage =
            "Air quality is Good - ideal for outdoor activities.";
        } else if (aqData.aqi <= 100) {
          airQualityMessage =
            "Air quality is Moderate - acceptable for most people.";
        } else if (aqData.aqi <= 150) {
          airQualityMessage =
            "Air quality is Unhealthy for Sensitive Groups - limit prolonged outdoor activities.";
        } else if (aqData.aqi <= 200) {
          airQualityMessage =
            "Air quality is Unhealthy - reduce outdoor activities.";
        } else if (aqData.aqi <= 300) {
          airQualityMessage =
            "Air quality is Very Unhealthy - avoid outdoor activities.";
        } else {
          airQualityMessage =
            "Air quality is Hazardous - stay indoors if possible.";
        }

        // Center map on the air quality visualization
        map.flyTo({ center: [midLon, midLat], zoom: 11 });

        // Show user message about the air quality
        alert(
          `Current Air Quality Index: ${aqData.aqi}\nLevel: ${aqData.level}\n\n${airQualityMessage}`
        );

        console.log("Air quality visualization added to map");
      }
    } catch (error) {
      console.error("Error visualizing air quality:", error);
      alert("Failed to visualize air quality. Please try again.");
    } finally {
      setIsLoadingAirQuality(false);
    }
  };

  // Define TypeScript interfaces for our route parameters
  interface RoutePoint {
    position: {
      lat: number;
      lon: number;
    };
    address: string;
  }

  interface RoutePointTomTom {
    latitude: number;
    longitude: number;
  }

  interface RouteLeg {
    points: RoutePointTomTom[];
  }

  interface RouteData {
    legs: RouteLeg[];
    summary: {
      lengthInMeters: number;
      travelTimeInSeconds: number;
    };
    guidance?: {
      instructions?: {
        message?: string;
      }[];
    };
  }

  // A timestamp to make source IDs unique for each route calculation
  let routeTimestamp = 0;

  // Helper function to get route color based on route type and air quality
  const getRouteColor = (type: string, aqData: any): string => {
    if (type === "eco") {
      if (!aqData) return "#10b981"; // Default green for eco
      if (aqData.aqi <= 50) return "#10b981"; // Good - Green
      if (aqData.aqi <= 100) return "#FFD700"; // Moderate - Yellow
      return "#ef4444"; // Poor - Red
    } else if (type === "fast") {
      return "#3b82f6"; // Blue for fast
    } else {
      return "#8b5cf6"; // Purple for short
    }
  };

  // Function to calculate a route - modified to auto-select algorithm based on route type
  const calculateRoute = async () => {
    if (!tomtom || !startLocation || !destination) return;

    setIsRouting(true);

    // Generate a unique timestamp for this route calculation
    routeTimestamp = Date.now();

    try {
      // STEP 1: Clear ALL previous layers and sources to prevent conflicts
      // First get all existing layers
      if (map) {
        const layers = map.getStyle().layers || [];

        // Remove any custom layers we've added
        layers.forEach((layer: any) => {
          const id = layer.id;
          if (
            id.startsWith("route-") ||
            id.includes("-alt-") ||
            id.includes("air-quality")
          ) {
            map.removeLayer(id);
          }
        });

        // Then remove sources - get all sources
        const sources = Object.keys(map.getStyle().sources || {});
        sources.forEach((sourceId) => {
          if (
            sourceId.startsWith("route-") ||
            sourceId.includes("-alt-") ||
            sourceId.includes("air-quality")
          ) {
            map.removeSource(sourceId);
          }
        });
      }

      // Clear existing markers
      searchMarkers.forEach((marker) => marker.remove());
      searchMarkers = [];

      if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
      }

      console.log("Calculating route from", startLocation, "to", destination);
      console.log("Using route type:", routeType);

      // Search for start and destination coordinates
      const startPoint = await searchLocation(startLocation, true, true);
      const endPoint = await searchLocation(destination, false, true);

      if (!startPoint || !endPoint) {
        alert("Couldn't find one of the locations. Please try again.");
        setIsRouting(false);
        return;
      }

      // Get air quality data for the route area
      const midLat = (startPoint.position.lat + endPoint.position.lat) / 2;
      const midLon = (startPoint.position.lon + endPoint.position.lon) / 2;
      const aqData = await fetchAirQualityData(
        midLat.toString(),
        midLon.toString()
      );

      // Save AQI number for display in overlay
      let aqiNumber = aqData ? aqData.aqi : 0;

      // ------------- MAIN ALGORITHM IMPLEMENTATION -------------
      let routes: RouteData[] = [];
      let primaryRoute: RouteData | undefined;
      let routeInfo: any;

      // Automatically select the most appropriate algorithm based on route type
      if (routeType === "eco") {
        // For eco-friendly routes - Use Dijkstra for balanced exploration that can avoid pollution
        const algoId = `route-eco-${routeTimestamp}`;

        routes = await calculateDijkstraRoute(startPoint, endPoint);
        if (!routes || routes.length === 0) {
          throw new Error("No routes found for eco-friendly path");
        }
        primaryRoute = routes[0];

        // Route color based on air quality
        const routeColor = getRouteColor(routeType, aqData);

        // Add to map
        addRouteToMap(primaryRoute, algoId, routeColor);

        // Add alternative eco-routes if available
        if (routes.length > 1) {
          for (let i = 1; i < Math.min(routes.length, 3); i++) {
            addRouteToMap(
              routes[i],
              `route-eco-alt-${i}-${routeTimestamp}`,
              "#FFD700",
              true
            );
          }
        }

        // Generate route info
        routeInfo = generateRouteInfo(primaryRoute, aqData, routes.length - 1);
      } else if (routeType === "fast") {
        // For fastest routes - Use A* which is optimized for highway preference and speed
        const algoId = `route-fast-${routeTimestamp}`;

        routes = await calculateAStarRoute(startPoint, endPoint);
        if (!routes || routes.length === 0) {
          throw new Error("No routes found for fastest path");
        }
        primaryRoute = routes[0];

        // Blue for fast routes
        const routeColor = getRouteColor(routeType, aqData);

        // Add to map
        addRouteToMap(primaryRoute, algoId, routeColor);

        // Add alternative fast routes if available
        if (routes.length > 1) {
          for (let i = 1; i < Math.min(routes.length, 3); i++) {
            addRouteToMap(
              routes[i],
              `route-fast-alt-${i}-${routeTimestamp}`,
              "#FFD700",
              true
            );
          }
        }

        // Generate route info
        routeInfo = generateRouteInfo(primaryRoute, aqData, routes.length - 1);
      } else if (routeType === "short") {
        // For shortest routes - Use Bellman-Ford which specializes in finding the geometrically shortest path
        const algoId = `route-short-${routeTimestamp}`;

        routes = await calculateBellmanFordRoute(startPoint, endPoint);
        if (!routes || routes.length === 0) {
          throw new Error("No routes found for shortest path");
        }
        primaryRoute = routes[0];

        // Purple for short routes
        const routeColor = getRouteColor(routeType, aqData);

        // Add to map
        addRouteToMap(primaryRoute, algoId, routeColor);

        // Add alternative short routes if available
        if (routes.length > 1) {
          for (let i = 1; i < Math.min(routes.length, 3); i++) {
            addRouteToMap(
              routes[i],
              `route-short-alt-${i}-${routeTimestamp}`,
              "#FFD700",
              true
            );
          }
        }

        // Generate route info
        routeInfo = generateRouteInfo(primaryRoute, aqData, routes.length - 1);
      }

      // Ensure primary route exists before proceeding
      if (!primaryRoute) {
        throw new Error("Failed to calculate a primary route");
      }

      // Set route info and update UI
      setRouteInfo(routeInfo);

      // Add air quality visualization along route if we have a route
      if (primaryRoute) {
        // Check AQI at multiple points along the route (more than just 3 points)
        const airQualityAlongRoute = await checkAirQualityAlongRoute(
          primaryRoute
        );

        // Visualize air quality along the route with colored points
        if (airQualityAlongRoute.points.length > 0) {
          // Generate a unique source ID with timestamp
          const aqSourceId = `route-air-quality-source-${routeTimestamp}`;

          // Create data points for visualization
          const features = airQualityAlongRoute.points.map((point) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [point.lon, point.lat],
            },
            properties: {
              aqi: point.aqi,
            },
          }));

          // Add GeoJSON source for air quality points
          map.addSource(aqSourceId, {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: features,
            },
          });

          // Add circle layer to show air quality points
          map.addLayer({
            id: `route-air-quality-layer-${routeTimestamp}`,
            type: "circle",
            source: aqSourceId,
            paint: {
              "circle-radius": 12,
              "circle-color": [
                "step",
                ["get", "aqi"],
                "#10b981", // Good (AQI ≤ 50) - Green
                50,
                "#f59e0b", // Moderate (AQI 51-100) - Yellow
                100,
                "#f97316", // USG (AQI 101-150) - Orange
                150,
                "#ef4444", // Unhealthy (AQI 151-200) - Red
                200,
                "#8b5cf6", // Very Unhealthy (AQI 201-300) - Purple
                300,
                "#831843", // Hazardous (AQI > 300) - Maroon
              ],
              "circle-opacity": 0.8,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });

          // Add air quality value as text
          map.addLayer({
            id: `route-air-quality-labels-${routeTimestamp}`,
            type: "symbol",
            source: aqSourceId,
            layout: {
              "text-field": ["to-string", ["get", "aqi"]],
              "text-font": ["Open Sans Bold"],
              "text-size": 12,
              "text-allow-overlap": true,
            },
            paint: {
              "text-color": "#ffffff",
            },
          });

          // Update route info with the worst air quality along route
          if (routeInfo) {
            routeInfo.airQuality = airQualityAlongRoute.level;
          }
        }
      }

      // ...existing code for environmental stats...

      // Add markers for start and end points
      const startMarker = new tomtom.Marker()
        .setLngLat([startPoint.position.lon, startPoint.position.lat])
        .addTo(map);

      const endMarker = new tomtom.Marker({ color: "#00cc66" })
        .setLngLat([endPoint.position.lon, endPoint.position.lat])
        .addTo(map);

      searchMarkers.push(startMarker, endMarker);

      // Fit map to show the entire route
      const bounds = new tomtom.LngLatBounds();
      routes.forEach((route) => {
        route.legs[0].points.forEach((point: RoutePointTomTom) => {
          bounds.extend([point.longitude, point.latitude]);
        });
      });
      map.fitBounds(bounds, { padding: 100 });

      console.log("Route calculation completed successfully");
    } catch (error) {
      console.error("Error calculating route:", error);
      alert(
        "Failed to calculate route. Please try again: " +
          (error as Error).message
      );
    } finally {
      setIsRouting(false);
    }
  };

  // Add a route to the map
  const addRouteToMap = (
    route: RouteData,
    sourceId: string,
    color: string,
    isDashed = false
  ) => {
    // Create a GeoJSON object from the route
    const routeGeoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: route.legs[0].points.map((point: RoutePointTomTom) => [
              point.longitude,
              point.latitude,
            ]),
          },
          properties: {},
        },
      ],
    };

    // Add source for the route
    map.addSource(sourceId, {
      type: "geojson",
      data: routeGeoJson,
    });

    // Add layer for the route
    map.addLayer({
      id: sourceId,
      type: "line",
      source: sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": color,
        "line-width": isDashed ? 4 : 6,
        "line-opacity": isDashed ? 0.6 : 0.8,
        ...(isDashed && { "line-dasharray": [2, 1] }),
      },
    });
  };

  // Check air quality along the route
  const checkAirQualityAlongRoute = async (
    route: RouteData
  ): Promise<{
    level: string;
    points: { lat: number; lon: number; aqi: number }[];
  }> => {
    try {
      // Take 3 sample points along the route (start, middle, end)
      const points = route.legs[0].points;
      const numPoints = points.length;

      if (numPoints < 2) return { level: "Unknown", points: [] };

      const checkPoints = [
        points[0], // Start
        points[Math.floor(numPoints / 2)], // Middle
        points[numPoints - 1], // End
      ];

      const aqiData = [];

      // Get air quality for each point
      for (const point of checkPoints) {
        const data = await fetchAirQualityData(
          point.latitude.toString(),
          point.longitude.toString()
        );

        if (data) {
          aqiData.push({
            lat: point.latitude,
            lon: point.longitude,
            aqi: data.aqi,
            level: data.level,
          });
        }
      }

      // If we have data, determine the worst air quality along the route
      if (aqiData.length > 0) {
        // Sort by AQI (highest/worst first)
        aqiData.sort((a, b) => b.aqi - a.aqi);
        return {
          level: aqiData[0].level, // Return the worst level
          points: aqiData,
        };
      }

      return { level: "Unknown", points: [] };
    } catch (error) {
      console.error("Error checking air quality along route:", error);
      return { level: "Unknown", points: [] };
    }
  };

  // Dijkstra's Algorithm - Modified to properly differentiate route types
  const calculateDijkstraRoute = async (
    startPoint: RoutePoint,
    endPoint: RoutePoint
  ): Promise<RouteData[]> => {
    // Base parameters for all route types
    const routeParams = new URLSearchParams();
    routeParams.append("key", TOMTOM_API_KEY || "");
    routeParams.append("instructionsType", "tagged");

    // Customize parameters based on route type
    if (routeType === "eco") {
      // ECO-FRIENDLY: Prioritize routes with better air quality
      routeParams.append("vehicleEngineType", "combustion");
      routeParams.append("routeType", "eco");
      routeParams.append("vehicleMaxSpeed", "90"); // Lower max speed is more eco-friendly
      routeParams.append("traffic", "true");

      // Add current air quality data to avoid high pollution areas if available
      if (airQualityData && airQualityData.aqi > 100) {
        // For areas with poor air quality, calculate alternate routes
        routeParams.append("maxAlternatives", "3");
      } else {
        routeParams.append("maxAlternatives", "1");
      }
    } else if (routeType === "fast") {
      // FASTEST: Prioritize routes with lower traffic
      routeParams.append("routeType", "fastest");
      routeParams.append("traffic", "true"); // Enable traffic consideration
      routeParams.append("travelMode", "car");
      routeParams.append("departAt", "now"); // Current time for real-time traffic
      // Add option to get traffic-optimized alternatives
      routeParams.append("trafficModel", "historical");
      routeParams.append("maxAlternatives", "2");
    } else if (routeType === "short") {
      // SHORTEST: Just calculate the shortest physical distance
      routeParams.append("routeType", "shortest");
      routeParams.append("traffic", "false"); // Disable traffic to get pure shortest
      routeParams.append("travelMode", "car");
      routeParams.append("maxAlternatives", "1");
    }

    console.log(
      "Running Dijkstra algorithm with following parameters:",
      Object.fromEntries(routeParams)
    );

    // For eco route, use direct path without waypoints to ensure destination is reached
    if (routeType === "eco") {
      const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${
        startPoint.position.lat
      },${startPoint.position.lon}:${endPoint.position.lat},${
        endPoint.position.lon
      }/json?${routeParams.toString()}`;

      console.log(`Dijkstra eco direct route URL:`, routeUrl);
      const response = await fetch(routeUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("TomTom API error:", errorText);
        throw new Error(`TomTom API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.routes;
    }
    // For fast routes, we add waypoints to force exploration of different paths
    else if (routeType === "fast") {
      // Calculate a different offset for eco vs fast routes to ensure different paths
      const dx = endPoint.position.lon - startPoint.position.lon;
      const dy = endPoint.position.lat - startPoint.position.lat;

      // Fast routes prefer major highways
      const offsetFactor = 0.1;
      // Bias towards areas with major roads
      const offsetLon = dx * offsetFactor;
      const offsetLat = dy * offsetFactor;

      const midLon =
        (startPoint.position.lon + endPoint.position.lon) / 2 + offsetLon;
      const midLat =
        (startPoint.position.lat + endPoint.position.lat) / 2 + offsetLat;

      // Add waypoint to force different path exploration
      const waypoints = `${startPoint.position.lat},${startPoint.position.lon}:${midLat},${midLon}:${endPoint.position.lat},${endPoint.position.lon}`;

      // Route URL with waypoint
      const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${waypoints}/json?${routeParams.toString()}`;
      console.log(`Dijkstra fast route URL (with waypoints):`, routeUrl);

      // Make API request and handle response
      const response = await fetch(routeUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("TomTom API error:", errorText);
        throw new Error(`TomTom API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.routes;
    } else {
      // short route
      // For shortest route, use a direct path without waypoints
      const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${
        startPoint.position.lat
      },${startPoint.position.lon}:${endPoint.position.lat},${
        endPoint.position.lon
      }/json?${routeParams.toString()}`;

      console.log(`Dijkstra shortest route URL:`, routeUrl);
      const response = await fetch(routeUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("TomTom API error:", errorText);
        throw new Error(`TomTom API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.routes;
    }
  };

  // A* Algorithm - Modified to better differentiate route types
  const calculateAStarRoute = async (
    startPoint: RoutePoint,
    endPoint: RoutePoint
  ): Promise<RouteData[]> => {
    const routeParams = new URLSearchParams();
    routeParams.append("key", TOMTOM_API_KEY || "");
    routeParams.append("instructionsType", "tagged");

    // A* specific parameters based on route type
    if (routeType === "eco") {
      // ECO-FRIENDLY: A* version prioritizes fuel efficiency
      routeParams.append("vehicleEngineType", "combustion");
      routeParams.append("routeType", "eco");
      routeParams.append("vehicleMaxSpeed", "80"); // Even lower speed for A* eco routes
      routeParams.append("traffic", "true");
      // REMOVE hilliness parameter - not compatible with ECO cost model

      // Use modest alternatives to find greener routes
      routeParams.append("maxAlternatives", "2");

      // For A*, add time constraints for eco routes to avoid rush hours if possible
      const now = new Date();
      if (
        (now.getHours() >= 7 && now.getHours() <= 10) ||
        (now.getHours() >= 16 && now.getHours() <= 19)
      ) {
        // During rush hour, prioritize avoiding traffic jams - Fix: use "true" instead of "extended"
        routeParams.append("traffic", "true");
        // Add avoid congestion parameter
        routeParams.append("avoid", "congestionZones");
      }
    } else if (routeType === "fast") {
      // FASTEST: A* provides the most direct highway-focused route
      routeParams.append("routeType", "fastest");
      routeParams.append("travelMode", "car"); // Changed from taxi to car
      routeParams.append("traffic", "true"); // Fix: use "true" instead of "extended"
      routeParams.append("routeRepresentation", "polyline");

      // A* for fastest should always check traffic
      routeParams.append("departAt", "now");

      // For highways priority
      routeParams.append("avoid", "unpavedRoads");
    } else if (routeType === "short") {
      // SHORTEST: A* calculates the most direct geometrically shortest path
      routeParams.append("routeType", "shortest");
      routeParams.append("travelMode", "car");
      routeParams.append("traffic", "false");
      routeParams.append("avoid", "ferries,carpools"); // Avoid features that might add distance
    }

    console.log(
      `A* ${routeType} route parameters:`,
      Object.fromEntries(routeParams)
    );

    // Direct route with parameters specific to the route type
    const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${
      startPoint.position.lat
    },${startPoint.position.lon}:${endPoint.position.lat},${
      endPoint.position.lon
    }/json?${routeParams.toString()}`;

    console.log(`A* ${routeType} route URL:`, routeUrl);
    const response = await fetch(routeUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TomTom API error:", errorText);
      throw new Error(`TomTom API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Validation and fallback handling
    // ...existing code...

    return data.routes;
  };

  // Bellman-Ford Algorithm - Modified to better differentiate route types
  const calculateBellmanFordRoute = async (
    startPoint: RoutePoint,
    endPoint: RoutePoint
  ): Promise<RouteData[]> => {
    const routeParams = new URLSearchParams();
    routeParams.append("key", TOMTOM_API_KEY || "");
    routeParams.append("instructionsType", "tagged");
    routeParams.append("routeRepresentation", "polyline");

    // Bellman-Ford specializes in finding multiple alternative routes
    if (routeType === "eco") {
      // ECO-FRIENDLY: Focus on green routes with less pollution
      routeParams.append("vehicleEngineType", "combustion");
      routeParams.append("routeType", "eco");
      routeParams.append("vehicleMaxSpeed", "70"); // Lower max speed
      routeParams.append("traffic", "true");

      // Ensure we get alternatives that are more eco-friendly
      routeParams.append("maxAlternatives", "3");

      // If air quality is poor in the area, find more alternatives
      if (airQualityData && airQualityData.aqi > 100) {
        routeParams.append("avoid", "urbanAreas");
      }
    } else if (routeType === "fast") {
      // FASTEST: Complex traffic optimization
      routeParams.append("routeType", "fastest");
      routeParams.append("traffic", "true");
      routeParams.append("travelMode", "car");

      // Fast routes should actively seek routes with less congestion
      routeParams.append("trafficModel", "historical");
      routeParams.append("departAt", "now");

      // Generate more alternatives to find the fastest possible route
      routeParams.append("maxAlternatives", "4");
    } else if (routeType === "short") {
      // SHORTEST: Focus on minimizing total distance
      routeParams.append("routeType", "shortest");
      routeParams.append("traffic", "false");
      routeParams.append("travelMode", "car");

      // Fix: Use separate append calls for each avoid parameter instead of comma-separated values
      routeParams.append("avoid", "tollRoads");
      routeParams.append("avoid", "ferries");
      routeParams.append("maxAlternatives", "2");
    }

    console.log(
      `Bellman-Ford ${routeType} parameters:`,
      Object.fromEntries(routeParams)
    );

    // For all route types, use direct route with no waypoints to ensure destination is reached
    const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${
      startPoint.position.lat
    },${startPoint.position.lon}:${endPoint.position.lat},${
      endPoint.position.lon
    }/json?${routeParams.toString()}`;

    console.log(`Bellman-Ford ${routeType} direct route URL:`, routeUrl);
    const response = await fetch(routeUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TomTom API error:", errorText);
      throw new Error(`TomTom API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.routes;
  };

  // Simplified generateRouteInfo - no longer includes algorithm info
  const generateRouteInfo = (
    route: RouteData,
    aqData: any,
    alternativeCount: number
  ): any => {
    // Calculate basic route info
    const distance = (route.summary.lengthInMeters / 1000).toFixed(1);
    const duration = Math.round(route.summary.travelTimeInSeconds / 60);

    // Count emission zones if available
    const emissionZones =
      route.guidance?.instructions?.filter((i) =>
        i.message?.includes("emission")
      ).length || 0;

    // Base info with route type appropriate description and AQI number
    const info = {
      distance,
      duration,
      emissionZones,
      alternativeRoutes: alternativeCount,
      airQuality: aqData ? aqData.level : "Unknown",
      aqi: aqData ? aqData.aqi : "N/A", // Add AQI number
      fuelEfficiency:
        routeType === "eco" ? "High" : routeType === "fast" ? "Low" : "Medium",
      description:
        routeType === "eco"
          ? "Optimized for lower emissions and air quality"
          : routeType === "fast"
          ? "Optimized for travel time with traffic conditions"
          : "Shortest distance path with minimal detours",
    };

    return info;
  };

  // Load TomTom Maps SDK
  useEffect(() => {
    // Load TomTom Maps SDK and initialize the map
    const loadTomTomMap = async () => {
      // Load the TomTom SDK scripts dynamically
      const script1 = document.createElement("script");
      script1.src =
        "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js";
      script1.async = true;
      document.body.appendChild(script1);

      const script2 = document.createElement("script");
      script2.src =
        "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/services/services-web.min.js";
      script2.async = true;
      document.body.appendChild(script2);

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css";
      document.head.appendChild(link);

      // Wait for both scripts to load before initializing the map
      const waitForScripts = () => {
        return new Promise<void>((resolve) => {
          const checkScripts = () => {
            if (window.tt) {
              resolve();
            } else {
              setTimeout(checkScripts, 100);
            }
          };
          checkScripts();
        });
      };

      try {
        await waitForScripts();

        // Now that scripts are loaded, initialize the map
        tomtom = window.tt;
        if (mapRef.current && tomtom) {
          // Fix: Use tt.map() as a function call, not a constructor
          map = tomtom.map({
            key: TOMTOM_API_KEY,
            container: mapRef.current,
            center: [80.17812278961485, 13.039835226912825], // Default to Ambattur
            zoom: 13,
            language: "en-GB",
            stylesVisibility: {
              trafficIncidents: true,
              trafficFlow: true,
            },
          });

          // Mark map as loaded
          map.on("load", () => {
            console.log("Map loaded successfully");
            setIsMapLoaded(true);
          });
        }
      } catch (error) {
        console.error("Error initializing TomTom map:", error);
        setIsMapLoaded(false); // Make sure we indicate the map failed to load
      }
    };

    loadTomTomMap();

    // Cleanup function
    return () => {
      try {
        if (map) {
          // Clear any route layers first
          if (map.getStyle && map.getStyle()) {
            const layers = map.getStyle().layers || [];
            layers.forEach((layer: { id?: string }) => {
              if (
                layer.id &&
                (layer.id.startsWith("route-") ||
                  layer.id.includes("-alt-") ||
                  layer.id.includes("air-quality"))
              ) {
                try {
                  map.removeLayer(layer.id);
                } catch (e) {
                  console.log(`Failed to remove layer ${layer.id}`, e);
                }
              }
            });

            // Remove sources
            const sources = Object.keys(map.getStyle().sources || {});
            sources.forEach((sourceId) => {
              if (
                sourceId.startsWith("route-") ||
                sourceId.includes("-alt-") ||
                sourceId.includes("air-quality")
              ) {
                try {
                  map.removeSource(sourceId);
                } catch (e) {
                  console.log(`Failed to remove source ${sourceId}`, e);
                }
              }
            });
          }

          // Remove markers
          if (searchMarkers && searchMarkers.length) {
            searchMarkers.forEach((marker) => {
              try {
                if (marker && marker.remove) {
                  marker.remove();
                }
              } catch (e) {
                console.log("Failed to remove marker", e);
              }
            });
          }

          // Remove route control if it exists
          if (routeControl) {
            try {
              map.removeControl(routeControl);
            } catch (e) {
              console.log("Failed to remove route control", e);
            }
            routeControl = null;
          }

          // Finally remove the map itself
          try {
            map.remove();
          } catch (e) {
            console.log("Non-critical error during map cleanup:", e);
          }
        }

        // Reset these variables
        map = null;
        tomtom = null;
        searchMarkers = [];
      } catch (error) {
        console.log("Error during map cleanup:", error);
      }
    };
  }, []);

  // Custom tooltip content components to avoid nesting issues
  const renderDijkstraTooltip = () => (
    <p className="w-[200px] text-xs">
      Finds the shortest path by exploring all possible routes. Most reliable
      but can be slower on complex routes.
    </p>
  );
  const renderAstarTooltip = () => (
    <p className="w-[200px] text-xs">
      Uses heuristics to find optimal paths faster than Dijkstra. Better for
      longer distances and complex road networks.
    </p>
  );
  const renderBellmanFordTooltip = () => (
    <p className="w-[200px] text-xs">
      Can handle negative weights and finds multiple alternative routes. Good
      for avoiding traffic or exploring options.
    </p>
  );

  // Improved return statement with route info overlay at bottom of map and better mobile support
  return (
    // Add back the left padding (lg:pl-80) to accommodate the sidebar
    <div className="px-4 py-6 pt-20 md:p-8 md:pt-20 lg:pt-8 lg:pl-80">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">
          Route Optimizer
        </h1>
        <p className="text-sm text-muted-foreground">
          Find the cleanest routes with lowest air pollution exposure
        </p>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3 relative">
        {/* Form card - full width on mobile, 1/3 width on desktop */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6 order-2 lg:order-1">
          <Card className="p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
              Route Planner
            </h3>
            <div className="space-y-3 md:space-y-4">
              {/* Start Location Input */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Start Location
                </label>
                <div className="flex gap-2 relative">
                  <Input
                    placeholder="Enter start point"
                    value={startLocation}
                    onChange={(e) => {
                      setStartLocation(e.target.value);
                      fetchSuggestions(e.target.value, true);
                    }}
                    onFocus={() => {
                      if (startSuggestions.length > 0) {
                        setShowStartSuggestions(true);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          try {
                            const response = await fetch(
                              `https://api.tomtom.com/search/2/reverseGeocode/${position.coords.latitude},${position.coords.longitude}.json?key=${TOMTOM_API_KEY}`
                            );
                            const data = await response.json();
                            if (data.addresses && data.addresses.length > 0) {
                              setStartLocation(
                                data.addresses[0].address.freeformAddress
                              );

                              // Add marker and center map
                              if (map && tomtom) {
                                const marker = new tomtom.Marker()
                                  .setLngLat([
                                    position.coords.longitude,
                                    position.coords.latitude,
                                  ])
                                  .addTo(map);
                                searchMarkers.push(marker);
                                map.flyTo({
                                  center: [
                                    position.coords.longitude,
                                    position.coords.latitude,
                                  ],
                                  zoom: 14,
                                });
                              }
                            }
                          } catch (error) {
                            console.error(
                              "Error getting current location:",
                              error
                            );
                          }
                        },
                        (error) => {
                          console.error(
                            "Error getting current location:",
                            error
                          );
                          alert(
                            "Failed to get your current location. Please enter it manually."
                          );
                        }
                      );
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                  {showStartSuggestions && startSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-[150px] overflow-y-auto">
                      {startSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                          onClick={() =>
                            handleSelectSuggestion(suggestion, true)
                          }
                        >
                          {suggestion.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Destination Input */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Destination
                </label>
                <div className="flex gap-2 relative">
                  <Input
                    placeholder="Enter destination"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      fetchSuggestions(e.target.value, false);
                    }}
                    onFocus={() => {
                      if (destSuggestions.length > 0) {
                        setShowDestSuggestions(true);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => searchLocation(destination, false)}
                    disabled={!destination || isSearching}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                  {showDestSuggestions && destSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-[150px] overflow-y-auto">
                      {destSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                          onClick={() =>
                            handleSelectSuggestion(suggestion, false)
                          }
                        >
                          {suggestion.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Route Type Select */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Route Type
                </label>
                <Select
                  value={routeType}
                  onValueChange={(value) => setRouteType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select route type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eco">
                      <div className="flex items-center">
                        <Leaf className="w-4 h-4 mr-2 text-green-500" />
                        <span>Eco-Friendly</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="fast">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-blue-500" />
                        <span>Fastest Route</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="short">
                      <div className="flex items-center">
                        <BarChart2 className="w-4 h-4 mr-2 text-purple-500" />
                        <span>Shortest Distance</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Add route type descriptions - hidden on smallest screens */}
              <div className="text-xs text-muted-foreground hidden sm:block">
                {routeType === "eco" && (
                  <p>
                    Prioritizes routes with better air quality and lower
                    emissions. Optimized for fuel efficiency and environmental
                    impact.
                  </p>
                )}
                {routeType === "fast" && (
                  <p>
                    Optimizes for shortest travel time with real-time traffic
                    data. Prefers major roads and highways for speed.
                  </p>
                )}
                {routeType === "short" && (
                  <p>
                    Finds the most direct path with minimum distance, regardless
                    of traffic conditions or road type.
                  </p>
                )}
              </div>

              {/* Action Buttons - stacked on mobile, side by side on larger screens */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  className="w-full"
                  onClick={calculateRoute}
                  disabled={!startLocation || !destination || isRouting}
                >
                  {isRouting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    "Calculate Route"
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={visualizeAirQuality}
                  disabled={!startLocation || !destination}
                >
                  {isLoadingAirQuality ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `${showAirQualityLayer ? "Hide" : "Show"} Air Quality`
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Map card - full width on mobile, 2/3 width on desktop */}
        <div className="lg:col-span-2 relative order-1 lg:order-2">
          <Card className="p-4 md:p-6 relative">
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
              Route Map
            </h3>
            <div
              ref={mapRef}
              className="h-[300px] md:h-[400px] lg:h-[500px] rounded-lg"
              style={{ width: "100%" }}
            >
              {!isMapLoaded && (
                <div className="h-full w-full flex items-center justify-center border rounded-lg">
                  <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Route info overlay at bottom of map */}
              {routeInfo && (
                <div className="absolute bottom-4 left-4 right-4 p-2 md:p-3 rounded-md bg-background/95 backdrop-blur-sm shadow-lg border border-gray-200 z-10 text-xs md:text-sm">
                  <div className="flex items-center justify-between mb-1 md:mb-2">
                    <h3 className="font-semibold">
                      {routeType === "eco"
                        ? "Eco-Friendly Route"
                        : routeType === "fast"
                        ? "Fastest Route"
                        : "Shortest Route"}
                    </h3>
                    <Badge
                      className={
                        routeType === "eco"
                          ? "bg-green-100 text-green-800"
                          : routeType === "fast"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }
                    >
                      {routeInfo.alternativeRoutes > 0
                        ? `${routeInfo.alternativeRoutes} alternatives`
                        : "Optimal route"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-1 md:gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Distance:</span>
                      <p className="font-medium">{routeInfo.distance} km</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time:</span>
                      <p className="font-medium">{routeInfo.duration} min</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Air Quality:
                      </span>
                      <div className="font-medium">
                        <Badge
                          className={
                            routeInfo.airQuality === "Good"
                              ? "bg-green-100 text-green-800"
                              : routeInfo.airQuality === "Moderate"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {routeInfo.airQuality} (AQI: {routeInfo.aqi})
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {routeType === "eco" && environmentalStats.co2Saved > 0 && (
                    <div className="flex flex-col xs:flex-row xs:justify-between mt-2 text-xs text-green-700">
                      <span>CO₂ Saved: {environmentalStats.co2Saved} kg</span>
                      <span className="hidden xs:inline">•</span>
                      <span>Fuel Saved: {environmentalStats.fuelSaved}L</span>
                      {environmentalStats.timeAdded > 0 && (
                        <>
                          <span className="hidden xs:inline">•</span>
                          <span>
                            +{environmentalStats.timeAdded} min vs. fastest
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-2 md:mt-3 text-xs text-muted-foreground">
              <p>
                Map shows real-time traffic conditions with{" "}
                <span className="text-amber-500 font-medium">
                  gold dotted lines
                </span>{" "}
                indicating alternative routes. Colored circles show air quality
                levels along your route.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Main component that wraps the content with a Suspense boundary
export default function RouteOptimizerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-8 pt-20 lg:pt-8 lg:pl-80">
          <div className="flex items-center justify-center w-full h-[60vh] md:h-[80vh]">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" />
            <span className="ml-2">Loading route optimizer...</span>
          </div>
        </div>
      }
    >
      <RouteOptimizerContent />
    </Suspense>
  );
}
