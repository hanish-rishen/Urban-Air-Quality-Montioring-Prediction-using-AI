"use client";

import React, { useState, useEffect, useRef, useCallback } from "react"; // Import useCallback
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Trees,
  Factory,
  Wind,
  Map,
  Layers,
  Pencil,
  MousePointer,
  Maximize,
  Loader2,
  AlertCircle,
  Search, // Add Search icon
  X, // Add X icon for clearing search
  MapPin, // Add MapPin icon
  Menu, // Add Menu icon for mobile sidebar toggle
  ChevronDown, // Add ChevronDown for expandable sections
  ChevronUp, // Add ChevronUp for expandable sections
} from "lucide-react";
import { Input } from "@/components/ui/input"; // Add Input component
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown"; // Import react-markdown

// Declare global to handle TomTom
declare global {
  interface Window {
    tt: any;
    tomtom: any; // Ensure tomtom is also declared if used directly
  }
}

export default function UrbanPlanningPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const tomtom = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({
    lat: 13.039835226912825,
    lon: 80.17812278961485,
  }); // Default to Ambattur

  // Track if we're in drawing mode to temporarily disable map panning
  const [isDraggingDisabled, setIsDraggingDisabled] = useState(false);

  // GIS tools state
  const [activeToolGroup, setActiveToolGroup] = useState<string | null>(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showBuildings, setShowBuildings] = useState(true);
  const [drawingMode, setDrawingMode] = useState({
    active: false,
    type: "polygon", // Changed default from "point" to "polygon"
  });

  // Drawing state
  const drawingPoints = useRef<number[][]>([]);
  // Add a state variable to track point count for UI updates
  const [pointCount, setPointCount] = useState<number>(0);

  // State for urban planning features
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [areaData, setAreaData] = useState<{
    topology?: any;
    density?: number;
    airQuality?: any;
  }>({});
  const [recommendations, setRecommendations] = useState<string>("");
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState<boolean>(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState<boolean>(false);

  // Add state for location search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(""); // State for debounced query
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // Add state for mobile UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "tools"
  ); // Default expanded section

  // Function to toggle section expansion on mobile
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Calculate if we're on a mobile device
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size on mount and when resized
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkScreenSize();

    // Listen for resize events
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Debounce effect for search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    // Cleanup function to cancel the timeout if user types again
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]); // Re-run effect when searchQuery changes

  // Effect to fetch suggestions based on debounced query
  useEffect(() => {
    if (debouncedSearchQuery.trim() && tomtom.current) {
      fetchLocationSuggestions(debouncedSearchQuery);
    } else {
      setSearchResults([]); // Clear results if query is empty
      setShowSearchResults(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery]); // Run when debounced query changes

  useEffect(() => {
    // Load TomTom Maps SDK
    const loadTomTomMap = async () => {
      try {
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

        // Wait for scripts to load
        await new Promise<void>((resolve) => {
          const checkScripts = () => {
            if (window.tt) {
              resolve();
            } else {
              setTimeout(checkScripts, 100);
            }
          };
          checkScripts();
        });

        // Initialize the map
        tomtom.current = window.tt;
        if (mapRef.current && tomtom.current) {
          map.current = tomtom.current.map({
            key: process.env.NEXT_PUBLIC_TOMTOM_API_KEY || "",
            container: mapRef.current,
            center: [currentLocation.lon, currentLocation.lat],
            zoom: 13,
            language: "en-GB",
            stylesVisibility: {
              trafficIncidents: false,
              trafficFlow: false,
              poi: true,
              map: true,
            },
            dragPan: !isDraggingDisabled, // Initial state for drag panning
          });

          map.current.on("load", () => {
            console.log("Map loaded successfully");
            setIsMapLoaded(true);
            // addDefaultLayers(); // Called within useEffect dependent on isMapLoaded now
          });
        }
      } catch (error) {
        console.error("Error loading TomTom map:", error);
      }
    };

    loadTomTomMap();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null; // Clear ref on cleanup
      }
      // Consider removing scripts/link if necessary, though often not required
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep empty: Map initialization should only run once on mount

  // Update map drag panning when drawing mode changes (removing measure mode)
  useEffect(() => {
    if (map.current && isMapLoaded) {
      const shouldDisable = drawingMode.active;
      if (shouldDisable) {
        map.current.dragPan.disable();
      } else {
        map.current.dragPan.enable();
      }
      setIsDraggingDisabled(shouldDisable); // Keep state in sync
    }
  }, [drawingMode.active, isMapLoaded]);

  // Update traffic visibility
  useEffect(() => {
    if (map.current && isMapLoaded) {
      try {
        const visibility = showTraffic ? "visible" : "none";
        const layers = ["traffic-flow", "traffic-incident"];

        // Try direct methods first (might not exist in all SDK versions)
        try {
          if (showTraffic) {
            map.current.showTrafficFlow?.();
            map.current.showTrafficIncidents?.();
          } else {
            map.current.hideTrafficFlow?.();
            map.current.hideTrafficIncidents?.();
          }
        } catch (directMethodError) {
          console.warn(
            "Traffic direct methods failed, using layers:",
            directMethodError
          );
          // Fallback to layer visibility
          layers.forEach((layerId) => {
            try {
              if (map.current.getLayer(layerId)) {
                map.current.setLayoutProperty(
                  layerId,
                  "visibility",
                  visibility
                );
              }
            } catch (layerError) {
              console.warn(
                `Could not set visibility for layer "${layerId}":`,
                layerError
              );
            }
          });
        }
      } catch (error) {
        console.error("Error toggling traffic visibility:", error);
      }
    }
  }, [showTraffic, isMapLoaded]);

  // Update building visibility
  useEffect(() => {
    if (map.current && isMapLoaded) {
      try {
        const buildingLayers = ["buildings", "3d-buildings"]; // Adjust layer names if needed
        const visibility = showBuildings ? "visible" : "none";
        buildingLayers.forEach((layerId) => {
          try {
            if (map.current.getLayer(layerId)) {
              map.current.setLayoutProperty(layerId, "visibility", visibility);
            }
          } catch (e) {
            console.warn(`Could not toggle buildings layer "${layerId}":`, e);
          }
        });
      } catch (error) {
        console.error("Error toggling building visibility:", error);
      }
    }
  }, [showBuildings, isMapLoaded]);

  // Add default map layers (if any) - Wrapped in useCallback
  const addDefaultLayers = useCallback(() => {
    if (!map.current || !isMapLoaded) return;
    // Example: Add sources or layers needed on initial load
    console.log("Adding default layers to map (if any)");
  }, [isMapLoaded]); // Dependency: isMapLoaded

  // Call addDefaultLayers when map is loaded
  useEffect(() => {
    if (isMapLoaded) {
      addDefaultLayers();
    }
  }, [isMapLoaded, addDefaultLayers]); // Add addDefaultLayers dependency

  // --- Drawing and Measurement Logic ---

  // Clear any existing drawing graphics
  const clearExistingDrawings = () => {
    try {
      if (map.current && map.current.getSource("drawing-source")) {
        const layers = [
          "drawing-fill-layer",
          "drawing-line-layer",
          "drawing-point-layer",
        ];
        layers.forEach((layer) => {
          if (map.current.getLayer(layer)) {
            map.current.removeLayer(layer);
          }
        });
        map.current.removeSource("drawing-source");
      }
    } catch (e) {
      console.error("Error clearing existing drawings:", e);
    }
  };

  // Initialize new drawing source
  const initDrawingSource = () => {
    if (!map.current) return;
    // Ensure source doesn't already exist before adding
    if (!map.current.getSource("drawing-source")) {
      map.current.addSource("drawing-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      // Add the layers immediately after adding the source
      // This ensures layers are present as soon as the source is created
      map.current.addLayer({
        id: "drawing-point-layer",
        type: "circle",
        source: "drawing-source",
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#3b82f6",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.current.addLayer({
        id: "drawing-line-layer",
        type: "line",
        source: "drawing-source",
        filter: ["==", "$type", "LineString"],
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-dasharray": [2, 1],
        },
      });

      map.current.addLayer({
        id: "drawing-fill-layer",
        type: "fill",
        source: "drawing-source",
        filter: ["==", "$type", "Polygon"],
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.3,
        },
      });
    } else {
      // If it exists, clear its data
      map.current.getSource("drawing-source")?.setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  };

  // Function to fetch area data (topology, density, air quality) - Wrapped in useCallback
  const fetchAreaData = useCallback(async (geometry: any) => {
    if (!geometry || !geometry.geometry) {
      console.error("Invalid geometry provided to fetchAreaData");
      return;
    }

    setIsLoading(true);
    setAreaData({}); // Clear previous data
    setRecommendations(""); // Clear previous recommendations
    try {
      let centerLat, centerLng;

      if (geometry.geometry.type === "Polygon") {
        const coords = geometry.geometry.coordinates[0];
        if (!coords || coords.length < 4) {
          // Need at least 3 unique points + closing point
          throw new Error("Invalid polygon coordinates");
        }
        const totalPoints = coords.length - 1;
        let sumLat = 0,
          sumLng = 0;
        for (let i = 0; i < totalPoints; i++) {
          sumLng += coords[i][0];
          sumLat += coords[i][1];
        }
        centerLat = sumLat / totalPoints;
        centerLng = sumLng / totalPoints;
      } else if (geometry.geometry.type === "Point") {
        centerLat = geometry.geometry.coordinates[1];
        centerLng = geometry.geometry.coordinates[0];
      } else {
        throw new Error(`Unsupported geometry type: ${geometry.geometry.type}`);
      }

      if (
        centerLat === undefined ||
        centerLng === undefined ||
        isNaN(centerLat) ||
        isNaN(centerLng)
      ) {
        throw new Error(
          "Could not determine valid coordinates for the selected area"
        );
      }

      // Fetch topology data
      const topologyResponse = await fetch(
        `https://uaqmp-api.hanishrishen.workers.dev/api/urban-planning/topology?lat=${centerLat}&lon=${centerLng}`
      );
      if (!topologyResponse.ok)
        throw new Error(
          `Failed to fetch topology data: ${topologyResponse.statusText}`
        );
      const topologyData = await topologyResponse.json();

      // Fetch air quality data
      let airQualityData: any = {};
      try {
        const aqResponse = await fetch(
          `https://uaqmp-api.hanishrishen.workers.dev/api/current?lat=${centerLat}&lon=${centerLng}`
        );
        if (!aqResponse.ok)
          throw new Error(
            `Failed to fetch air quality data: ${aqResponse.statusText}`
          );
        airQualityData = await aqResponse.json();
      } catch (aqError) {
        console.error("Error fetching air quality:", aqError);
        // Decide if you want to proceed without AQ data or throw error
        // For now, let's proceed but indicate missing data
        airQualityData = { error: "Could not retrieve air quality data" };
      }

      // Set the area data
      setAreaData({
        topology: {
          elevation: topologyData.elevation,
          terrain: topologyData.terrain,
          waterBodies: topologyData.waterBodies,
        },
        density: topologyData.populationDensity,
        airQuality: airQualityData, // Will include error if fetch failed
      });

      // Show analysis dialog
      setAnalysisDialogOpen(true);
    } catch (error) {
      console.error("Error fetching area data:", error);
      alert(
        "Failed to analyze the selected area: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      // Reset selection if analysis fails
      setSelectedArea(null);
      clearExistingDrawings(); // Also clear visual representation
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencies for fetchAreaData (currently none, but add if needed, e.g., API keys from state)

  // ADD Consolidated useEffect for map interaction listeners
  useEffect(() => {
    if (!map.current || !tomtom.current || !isMapLoaded) return;

    // Log mode changes to debug
    console.log("Mode change detected:", {
      drawingMode: drawingMode.active ? drawingMode.type : "inactive",
    });

    // 1. Always clear previous listeners and graphics first
    map.current.off("click");
    map.current.off("dblclick");
    map.current.off("mousemove");
    map.current.off("contextmenu"); // Clear right-click listener

    // Reset drawing data when changing modes
    if (drawingMode.active) {
      // Only clear drawings when activating a new drawing mode, not when deactivating
      clearExistingDrawings();
      drawingPoints.current = []; // Reset drawing points
      setPointCount(0); // Reset point count state
      initDrawingSource(); // Reinitialize source
    }

    // Remove all measure-related code, handlers, and variables

    // Polygon handlers
    const addPointHandler = (e: any) => {
      e.preventDefault();
      e.originalEvent.stopPropagation();

      const coords = [e.lngLat.lng, e.lngLat.lat];
      drawingPoints.current.push(coords);
      // Update the point count state to trigger re-render
      setPointCount(drawingPoints.current.length);

      // Create polygon feature for visualization
      const polygonCoords = [...drawingPoints.current];

      // For preview, close the polygon if we have at least 3 points
      let features = [];

      // Always add the line connecting points
      const polygonFeature = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: polygonCoords },
        properties: {},
      };
      features.push(polygonFeature);

      // Add individual points
      drawingPoints.current.forEach((coord) => {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: coord },
          properties: {},
        });
      });

      // If we have at least 3 points, also show a preview polygon
      if (drawingPoints.current.length >= 3) {
        const previewPolygonCoords = [
          ...drawingPoints.current,
          drawingPoints.current[0], // Close the polygon
        ];

        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [previewPolygonCoords] },
          properties: {},
        });
      }

      // Update the drawing source
      const source = map.current.getSource("drawing-source");
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: features,
        });
      } else {
        console.error("Drawing source not found in addPointHandler");
      }
    };

    const finishPolygonHandler = (e: any) => {
      // If this is a synthetic event from our button, we need to prevent default differently
      if (e && e.preventDefault) {
        e.preventDefault();
      }

      // If this is a synthetic event from our button, we handle stopPropagation differently
      if (e && e.originalEvent && e.originalEvent.stopPropagation) {
        e.originalEvent.stopPropagation();
      }

      // Only finish if we have enough points
      if (drawingPoints.current.length < 3) {
        console.log("Need at least 3 points to finish polygon.");
        alert("Please add at least 3 points before finishing the polygon."); // Give clear user feedback
        return;
      }

      // --- Finish Polygon Logic (same as before) ---
      const finalCoords = [
        ...drawingPoints.current,
        drawingPoints.current[0], // Close the polygon
      ];
      const finalPolygonFeature = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [finalCoords] },
        properties: {},
      };
      const source = map.current.getSource("drawing-source");
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: [finalPolygonFeature],
        });
      } else {
        console.error("Drawing source not found in finishPolygonHandler");
      }

      // Update state & explicitly remove event listeners to prevent callbacks after cleanup
      map.current.off("mousemove", mouseMoveHandler);
      map.current.off("click", addPointHandler);
      map.current.off("contextmenu", finishPolygonHandler);

      setDrawingMode({ ...drawingMode, active: false });
      setSelectedArea({
        type: "FeatureCollection",
        features: [finalPolygonFeature],
      });
      setPointCount(0); // Reset point count when finished

      // NOW fetch area data ONLY when the polygon is completed
      fetchAreaData(finalPolygonFeature); // Call the memoized fetchAreaData
    };

    // Store the handler in a ref so we can access it from outside the effect
    finishPolygonHandlerRef.current = finishPolygonHandler;

    const mouseMoveHandler = (e: any) => {
      // Check if drawing mode is still active and drawingPoints has items
      if (!drawingMode.active || drawingPoints.current.length === 0) return;

      // Check if the source still exists - if not, exit early
      if (!map.current || !map.current.getSource("drawing-source")) return;

      const currentCoords = [e.lngLat.lng, e.lngLat.lat];

      // Construct features array
      let features = [];

      // 1. Add points for all vertices
      drawingPoints.current.forEach((coord) => {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: coord },
          properties: {},
        });
      });

      // 2. Add the preview line from vertices to current mouse position
      const previewLineCoords = [...drawingPoints.current, currentCoords];
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: previewLineCoords },
        properties: { preview: true },
      });

      // 3. If we have at least 2 points (meaning with current mouse pos we have 3),
      // also add a preview polygon
      if (drawingPoints.current.length >= 2) {
        const previewPolygonCoords = [
          ...drawingPoints.current,
          currentCoords,
          drawingPoints.current[0], // Close the polygon
        ];

        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [previewPolygonCoords] },
          properties: { preview: true },
        });
      }

      // Update the source with all features
      const source = map.current.getSource("drawing-source");
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: features,
        });
      }
    };

    // Attach listeners based on the active mode
    if (drawingMode.active) {
      console.log(`Attaching ${drawingMode.type} drawing handlers`);

      // First, clear any existing drawing data to avoid mode conflicts
      clearExistingDrawings();
      drawingPoints.current = []; // Reset drawing points
      initDrawingSource(); // Reinitialize source

      // Only handle polygon drawing now
      map.current.on("click", addPointHandler);
      map.current.on("contextmenu", finishPolygonHandler);
      map.current.on("mousemove", mouseMoveHandler);
    }

    // Cleanup function
    return () => {
      console.log("Cleaning up map listeners");
      if (map.current) {
        map.current.off("click");
        map.current.off("dblclick");
        map.current.off("mousemove");
        map.current.off("contextmenu");

        // Explicitly clean up specific handlers to be extra safe
        map.current.off("click", addPointHandler);
        map.current.off("mousemove", mouseMoveHandler);
        map.current.off("contextmenu", finishPolygonHandler);
      }
    };
  }, [drawingMode, isMapLoaded, fetchAreaData]); // Add drawingMode and fetchAreaData dependencies

  // Cancel drawing function that resets the drawing mode and cleans up
  const handleCancelDrawing = () => {
    // Clear drawing points
    drawingPoints.current = [];
    setPointCount(0);

    // Deactivate drawing mode
    setDrawingMode({ ...drawingMode, active: false });

    // Clear any existing drawing graphics
    clearExistingDrawings();

    // Re-enable map panning
    if (map.current) {
      map.current.dragPan.enable();
    }
  };

  // Add keyboard escape handler for drawing mode
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawingMode.active) {
        handleCancelDrawing();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);

    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [drawingMode.active]);

  // Toggle layer visibility
  const toggleLayer = (layer: string) => {
    if (layer === "traffic") {
      setShowTraffic(!showTraffic);
    } else if (layer === "buildings") {
      setShowBuildings(!showBuildings);
    }
  };

  // Handle tool selection - remove measure tool
  const handleToolSelect = (toolGroup: string, tool?: string) => {
    console.log(`Tool selection: ${toolGroup}${tool ? ` - ${tool}` : ""}`);

    // Determine the target state based on the selection
    let nextDrawingMode = { ...drawingMode };
    let nextActiveToolGroup: string | null = activeToolGroup;

    // Clear selection when changing tools or activating a new one
    setSelectedArea(null);

    // First, deactivate all modes to ensure clean transitions
    nextDrawingMode.active = false;

    // Then activate only the selected tool
    if (toolGroup === "draw") {
      // No need to check for tool type since we only have polygon now
      nextDrawingMode = { active: true, type: "polygon" };
      nextActiveToolGroup = "draw";
    } else if (toolGroup === "select") {
      nextActiveToolGroup = "select";
    } else if (toolGroup === "zoom") {
      // ... existing zoom code ...
      nextActiveToolGroup = null;
    } else {
      nextActiveToolGroup = null;
    }

    // Update state with the changes
    setActiveToolGroup(nextActiveToolGroup);
    setDrawingMode(nextDrawingMode);
  };

  // Function to get urban planning recommendations from OpenRouter API
  const getUrbanPlanningRecommendations = async () => {
    if (
      !selectedArea ||
      !areaData ||
      !areaData.airQuality ||
      areaData.airQuality.error
    ) {
      alert(
        "Cannot generate recommendations without valid area data, including air quality."
      );
      return;
    }

    setIsLoadingRecommendations(true);
    setRecommendations(""); // Clear previous
    try {
      const prompt = `
        As an urban planning AI assistant, provide practical and sustainable development recommendations for the following area based ONLY on the data provided:
        
        AREA DATA:
        - Topology: Elevation ${areaData.topology?.elevation}m, ${
        areaData.topology?.terrain
      } terrain with ${areaData.topology?.waterBodies} water bodies nearby.
        - Population Density: ${
          areaData.density ?? "Unknown"
        } people per square km.
        - Air Quality: AQI of ${areaData.airQuality?.aqi} (${
        areaData.airQuality?.level
      }). Key pollutant PM2.5 is ${
        areaData.airQuality?.components?.pm2_5 ?? "N/A"
      } μg/m³.

        RECOMMENDATIONS:
        Provide concise, actionable recommendations focusing on:
        1. Land Use & Zoning: Suggest suitable development types (residential, commercial, green space, mixed-use) considering density, topology, and air quality.
        2. Green Infrastructure: Recommend specific greening strategies (parks, green roofs, tree planting) to mitigate pollution and improve livability.
        3. Transportation: Suggest infrastructure or policies to manage traffic and promote cleaner transport options, especially if air quality is poor.
        4. Building Design: Briefly mention sustainable building practices relevant to the context (e.g., ventilation for poor AQI, green roofs).

        Keep the response structured with clear headings or bullet points for each category. Be specific and justify recommendations based on the provided data (e.g., "Due to the high density and moderate air quality, prioritize mixed-use development with integrated green spaces..."). Do not invent data not provided.
      `;

      // First, attempt to use the backend API endpoint
      try {
        const response = await fetch(
          "https://uaqmp-api.hanishrishen.workers.dev/api/urban-planning/recommendations",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          }
        );

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(`Recommendation API error: ${data.error}`);
        }
        setRecommendations(
          data.recommendation || "No recommendations available at this time."
        );
      } catch (apiError) {
        console.error("Error using API endpoint:", apiError);

        // Fallback to mock data if API fails
        setRecommendations(`# Urban Planning Recommendations

## Land Use & Zoning
Based on the elevation of ${areaData.topology?.elevation}m with ${areaData.topology?.terrain} terrain, and population density of ${areaData.density} people/km², the following recommendations are provided:

- Implement mixed-use development with medium density residential areas
- Establish green buffer zones near water bodies to prevent pollution runoff
- Designate eco-industrial zones with strict emission controls due to current AQI of ${areaData.airQuality?.aqi}

## Green Infrastructure
- Create a network of urban parks and green corridors to improve air quality
- Implement mandatory green roofs for new commercial developments
- Establish urban forests with native species to serve as natural air filters
- Develop wetland restoration projects near existing water bodies

## Transportation
- Develop dedicated cycling infrastructure and pedestrian-friendly streets
- Implement low-emission zones in high-density areas
- Create park-and-ride facilities at urban periphery to reduce inner-city traffic
- Transition public transportation to electric or hydrogen-powered vehicles

## Building Design
- Require HEPA filtration systems in new residential buildings
- Implement energy-efficient building codes with solar panel requirements
- Design buildings with natural ventilation systems to reduce energy consumption
- Create incentives for retrofitting older buildings with green technologies`);
      }
    } catch (error) {
      console.error("Error getting recommendations:", error);
      setRecommendations(
        "Failed to generate recommendations. Error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Function to fetch location suggestions as user types (now called based on debounced query)
  const fetchLocationSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || !tomtom.current) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setIsSearching(true);
    // Keep existing search results visible while fetching new ones for better UX
    // setSearchResults([]); // Optionally clear immediately or wait for new results
    try {
      console.log("Fetching suggestions for:", query); // Log the query being used
      const response = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(
          query
        )}.json?key=${
          process.env.NEXT_PUBLIC_TOMTOM_API_KEY
        }&limit=5&typeahead=true&language=en-GB`
      );

      if (!response.ok) {
        // Handle 429 specifically if needed, maybe show a message
        if (response.status === 429) {
          console.warn("Rate limit exceeded for suggestions.");
          // Optionally show a subtle indicator to the user
        }
        throw new Error(
          `Suggestion request failed with status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Suggestion response:", data);
      if (data && data.results && data.results.length > 0) {
        setSearchResults(data.results);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
      // Avoid alerting for suggestion errors unless critical
      // alert("Failed to fetch suggestions: " + (error instanceof Error ? error.message : "Unknown error"));
      setSearchResults([]); // Clear results on error
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []); // Add dependencies if needed (e.g., API key if from state)

  // Function to search for a specific location (triggered by button or Enter key)
  const searchLocation = async (query: string) => {
    if (!query.trim() || !tomtom.current) return;
    setIsSearching(true);
    setShowSearchResults(false); // Hide suggestions when performing a direct search
    setSearchResults([]);
    try {
      console.log("Searching for location:", query);
      const response = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(
          query
        )}.json?key=${
          process.env.NEXT_PUBLIC_TOMTOM_API_KEY
        }&limit=5&typeahead=false&language=en-GB` // Use typeahead=false for direct search?
      );

      if (!response.ok) {
        // Handle 429 specifically
        if (response.status === 429) {
          console.error("Rate limit exceeded during search.");
          alert(
            "Search rate limit exceeded. Please wait a moment and try again."
          );
        }
        throw new Error(
          `Search request failed with status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Search response:", data);
      if (data && data.results && data.results.length > 0) {
        // For direct search, maybe just go to the first result?
        // Or display results similarly to suggestions but maybe mark them differently
        setSearchResults(data.results);
        setShowSearchResults(true); // Show results after search button click
        // Optionally, automatically select the first result:
        // goToSearchResult(data.results[0]);

        // On mobile, automatically select first result to save space
        if (isMobile && data.results[0]) {
          goToSearchResult(data.results[0]);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
        alert("Location not found."); // Inform user if no results
      }
    } catch (error) {
      console.error("Error searching location:", error);
      alert(
        "Failed to search for location: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Function to go to a selected search result
  const goToSearchResult = (result: any) => {
    if (!map.current || !result) return;

    try {
      // Extract coordinates based on result format
      const lat =
        result.position?.lat ||
        result.position?.latitude ||
        result.position?.[1];
      const lon =
        result.position?.lon ||
        result.position?.longitude ||
        result.position?.[0];

      if (!lat || !lon) {
        console.error("Invalid coordinates in result:", result);
        return;
      }

      // Fly to the search result location - adjust padding for mobile
      map.current.flyTo({
        center: [lon, lat],
        zoom: 15,
        duration: 1000,
        padding: isMobile ? { bottom: 100, top: 50 } : undefined,
      });

      // Get best address display
      const address =
        result.address?.freeformAddress ||
        result.poi?.name ||
        result.name ||
        "Location";

      // Add marker at the location
      addTemporaryMarker([lon, lat], address);

      // Clear search results after selection
      setShowSearchResults(false);
      setSearchQuery(address);

      // Close sidebar on mobile after selecting location
      if (isMobile) {
        setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error("Error navigating to search result:", error);
    }
  };

  // Function to add a temporary marker to the map
  const addTemporaryMarker = (coordinates: number[], popupText: string) => {
    if (!map.current) return;

    // Remove any existing temporary markers
    const existingMarker = document.querySelector(".temp-marker-container");
    if (existingMarker) {
      existingMarker.remove();
    }

    // Create marker element
    const markerElement = document.createElement("div");
    markerElement.className = "temp-marker-container";
    markerElement.style.position = "relative";

    const markerPin = document.createElement("div");
    markerPin.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 13V13.01M12 22L5.5 15.5C4.83333 14.8333 4.33333 14.0833 4 13.25C3.66667 12.4167 3.5 11.5 3.5 10.5C3.5 8.5 4.16667 6.83333 5.5 5.5C6.83333 4.16667 8.5 3.5 10.5 3.5C12.5 3.5 14.1667 4.16667 15.5 5.5C16.8333 6.83333 17.5 8.5 17.5 10.5C17.5 11.5 17.3333 12.4167 17 13.25C16.6667 14.0833 16.1667 14.8333 15.5 15.5L9 22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    markerPin.style.transform = "translate(-50%, -100%)";
    markerElement.appendChild(markerPin);

    // Add popup with text
    const popup = new tomtom.current.Popup({
      offset: [0, -15],
    })
      .setLngLat(coordinates)
      .setHTML(`<p style="margin: 0; font-weight: 500;">${popupText}</p>`)
      .addTo(map.current);

    // Add marker to map
    new tomtom.current.Marker({
      element: markerElement,
    })
      .setLngLat(coordinates)
      .addTo(map.current);

    // Automatically remove marker after 5 seconds
    setTimeout(() => {
      const marker = document.querySelector(".temp-marker-container");
      if (marker) marker.remove();
      popup.remove();
    }, 5000);
  };

  // Add a ref to store the finishPolygonHandler
  const finishPolygonHandlerRef = useRef<((e: any) => void) | null>(null);

  // ADD Consolidated useEffect for map interaction listeners
  useEffect(() => {
    if (!map.current || !tomtom.current || !isMapLoaded) return;

    // Log mode changes to debug
    console.log("Mode change detected:", {
      drawingMode: drawingMode.active ? drawingMode.type : "inactive",
    });

    // 1. Always clear previous listeners and graphics first
    map.current.off("click");
    map.current.off("dblclick");
    map.current.off("mousemove");
    map.current.off("contextmenu"); // Clear right-click listener

    // Reset drawing data when changing modes
    if (drawingMode.active) {
      // Only clear drawings when activating a new drawing mode, not when deactivating
      clearExistingDrawings();
      drawingPoints.current = []; // Reset drawing points
      setPointCount(0); // Reset point count state
      initDrawingSource(); // Reinitialize source
    }

    // Polygon handlers
    const addPointHandler = (e: any) => {
      // ...existing code...
    };

    const finishPolygonHandler = (e: any) => {
      // If this is a synthetic event from our button, we need to prevent default differently
      if (e && e.preventDefault) {
        e.preventDefault();
      }

      // If this is a synthetic event from our button, we handle stopPropagation differently
      if (e && e.originalEvent && e.originalEvent.stopPropagation) {
        e.originalEvent.stopPropagation();
      }

      // Only finish if we have enough points
      if (drawingPoints.current.length < 3) {
        console.log("Need at least 3 points to finish polygon.");
        alert("Please add at least 3 points before finishing the polygon."); // Give clear user feedback
        return;
      }

      // --- Finish Polygon Logic (same as before) ---
      const finalCoords = [
        ...drawingPoints.current,
        drawingPoints.current[0], // Close the polygon
      ];
      const finalPolygonFeature = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [finalCoords] },
        properties: {},
      };
      const source = map.current.getSource("drawing-source");
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: [finalPolygonFeature],
        });
      } else {
        console.error("Drawing source not found in finishPolygonHandler");
      }

      // Update state & explicitly remove event listeners to prevent callbacks after cleanup
      if (map.current) {
        map.current.off("mousemove", mouseMoveHandler);
        map.current.off("click", addPointHandler);
        map.current.off("contextmenu", finishPolygonHandler);
      }

      setDrawingMode({ ...drawingMode, active: false });
      setSelectedArea({
        type: "FeatureCollection",
        features: [finalPolygonFeature],
      });
      setPointCount(0); // Reset point count when finished

      // NOW fetch area data ONLY when the polygon is completed
      fetchAreaData(finalPolygonFeature); // Call the memoized fetchAreaData
    };

    // Store the handler in a ref so we can access it from outside the effect
    finishPolygonHandlerRef.current = finishPolygonHandler;

    const mouseMoveHandler = (e: any) => {
      // Check if drawing mode is still active and drawingPoints has items
      if (!drawingMode.active || drawingPoints.current.length === 0) return;

      // Check if the source still exists - if not, exit early
      if (!map.current || !map.current.getSource("drawing-source")) return;

      const currentCoords = [e.lngLat.lng, e.lngLat.lat];

      // Construct features array
      let features = [];

      // 1. Add points for all vertices
      drawingPoints.current.forEach((coord) => {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: coord },
          properties: {},
        });
      });

      // 2. Add the preview line from vertices to current mouse position
      const previewLineCoords = [...drawingPoints.current, currentCoords];
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: previewLineCoords },
        properties: { preview: true },
      });

      // 3. If we have at least 2 points (meaning with current mouse pos we have 3),
      // also add a preview polygon
      if (drawingPoints.current.length >= 2) {
        const previewPolygonCoords = [
          ...drawingPoints.current,
          currentCoords,
          drawingPoints.current[0], // Close the polygon
        ];

        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [previewPolygonCoords] },
          properties: { preview: true },
        });
      }

      // Update the source with all features
      const source = map.current.getSource("drawing-source");
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: features,
        });
      }
    };

    // Attach listeners based on the active mode
    if (drawingMode.active) {
      console.log(`Attaching ${drawingMode.type} drawing handlers`);

      // First, clear any existing drawing data to avoid mode conflicts
      clearExistingDrawings();
      drawingPoints.current = []; // Reset drawing points
      initDrawingSource(); // Reinitialize source

      // Only handle polygon drawing now
      map.current.on("click", addPointHandler);
      map.current.on("contextmenu", finishPolygonHandler);
      map.current.on("mousemove", mouseMoveHandler);
    }

    // Cleanup function
    return () => {
      console.log("Cleaning up map listeners");
      if (map.current) {
        map.current.off("click");
        map.current.off("dblclick");
        map.current.off("mousemove");
        map.current.off("contextmenu");

        // Explicitly clean up specific handlers to be extra safe
        map.current.off("click", addPointHandler);
        map.current.off("mousemove", mouseMoveHandler);
        map.current.off("contextmenu", finishPolygonHandler);
      }
    };
  }, [drawingMode, isMapLoaded, fetchAreaData]); // Add drawingMode and fetchAreaData dependencies

  // Update the Finish Drawing button to use our stored handler
  const handleFinishDrawing = () => {
    if (finishPolygonHandlerRef.current) {
      // Only allow finishing if we have enough points
      if (pointCount >= 3) {
        // Call the handler with a minimal synthetic event
        finishPolygonHandlerRef.current({
          preventDefault: () => {},
          originalEvent: { stopPropagation: () => {} },
        });

        // Ensure the layers are properly updated with the final polygon
        if (map.current && drawingPoints.current.length >= 3) {
          const finalCoords = [
            ...drawingPoints.current,
            drawingPoints.current[0], // Close the polygon
          ];

          const finalPolygonFeature = {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [finalCoords] },
            properties: {},
          };

          const source = map.current.getSource("drawing-source");
          if (source) {
            source.setData({
              type: "FeatureCollection",
              features: [finalPolygonFeature],
            });
          }
        }
      } else {
        alert("Please add at least 3 points before finishing the polygon.");
      }
    }
  };

  // --- Render Logic ---
  return (
    <>
      {/* Mobile-optimized layout - adjusted for existing sidebar */}
      <div className="h-screen overflow-hidden bg-background flex flex-col pt-14 md:pt-16 lg:pt-4 lg:pl-72">
        {/* Page header - adjusted for mobile sidebar */}
        <div className="p-4 md:p-8 flex-shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Urban Planning</h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              Analyze areas and get AI-driven recommendations for sustainable
              development.
            </p>
          </div>

          {/* Tools sidebar trigger for mobile - only shows tools sheet */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden">
                <Map className="h-4 w-4 mr-2" />
                <span>Tools</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] sm:w-[350px] p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Urban Planning Tools</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-80px)] px-4 py-2">
                {/* Mobile Search */}
                <div className="mb-4 sticky top-0 bg-background pt-2 pb-4 z-10">
                  <div className="flex gap-2 items-center relative w-full">
                    <Input
                      type="text"
                      placeholder="Search location..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      onFocus={() => {
                        if (searchResults.length > 0 && searchQuery.trim()) {
                          setShowSearchResults(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          searchLocation(searchQuery);
                        }
                        if (e.key === "Escape") {
                          setShowSearchResults(false);
                        }
                      }}
                      className="pl-10"
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      <Search className="h-4 w-4" />
                    </span>
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-10 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          setShowSearchResults(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      disabled={!searchQuery.trim() || isSearching}
                      onClick={() => searchLocation(searchQuery)}
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Search"
                      )}
                    </Button>
                  </div>

                  {/* Mobile Search Results */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center gap-2"
                          onClick={() => {
                            goToSearchResult(result);
                            setIsSidebarOpen(false); // Close sidebar after selection
                          }}
                        >
                          <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-medium">
                              {result.poi?.name ||
                                result.address?.freeformAddress}
                            </p>
                            {result.poi?.name && (
                              <p className="text-xs text-muted-foreground">
                                {result.address?.freeformAddress}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mobile Tool Sections */}
                <div className="space-y-4">
                  {/* GIS Tools Section - Expandable on Mobile */}
                  <Card>
                    <CardHeader
                      className="py-3 cursor-pointer"
                      onClick={() => toggleSection("tools")}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          GIS Tools
                        </CardTitle>
                        {expandedSection === "tools" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                    {expandedSection === "tools" && (
                      <CardContent className="px-3 pb-3 pt-0">
                        <div className="space-y-1">
                          <Button
                            variant={
                              activeToolGroup === "select"
                                ? "secondary"
                                : "ghost"
                            }
                            className="w-full justify-start"
                            onClick={() => {
                              handleToolSelect("select");
                              setIsSidebarOpen(false);
                            }}
                            size="sm"
                            disabled={drawingMode.active}
                          >
                            <MousePointer className="h-4 w-4 mr-2" />
                            <span>Select / Pan</span>
                          </Button>
                          <Button
                            variant={
                              activeToolGroup === "draw" ? "secondary" : "ghost"
                            }
                            className="w-full justify-start"
                            onClick={() => {
                              handleToolSelect("draw");
                              setIsSidebarOpen(false);
                            }}
                            size="sm"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            <span>Draw Polygon</span>
                          </Button>
                          <Button
                            variant={
                              activeToolGroup === "zoom" ? "secondary" : "ghost"
                            }
                            className="w-full justify-start"
                            onClick={() => {
                              handleToolSelect("zoom");
                              setIsSidebarOpen(false);
                            }}
                            size="sm"
                            disabled={!selectedArea || drawingMode.active}
                          >
                            <Maximize className="h-4 w-4 mr-2" />
                            <span>Zoom to Selection</span>
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Layers Section - Expandable on Mobile */}
                  <Card>
                    <CardHeader
                      className="py-3 cursor-pointer"
                      onClick={() => toggleSection("layers")}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          Layers
                        </CardTitle>
                        {expandedSection === "layers" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                    {expandedSection === "layers" && (
                      <CardContent className="px-3 pb-3 pt-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="traffic-toggle-mobile"
                            className="text-sm flex items-center gap-2"
                          >
                            <Layers className="h-4 w-4" /> Traffic
                          </label>
                          <input
                            type="checkbox"
                            id="traffic-toggle-mobile"
                            checked={showTraffic}
                            onChange={() => toggleLayer("traffic")}
                            className="form-checkbox h-5 w-5 text-primary rounded" // Larger checkbox for mobile
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="buildings-toggle-mobile"
                            className="text-sm flex items-center gap-2"
                          >
                            <Building2 className="h-4 w-4" /> Buildings
                          </label>
                          <input
                            type="checkbox"
                            id="buildings-toggle-mobile"
                            checked={showBuildings}
                            onChange={() => toggleLayer("buildings")}
                            className="form-checkbox h-5 w-5 text-primary rounded" // Larger checkbox for mobile
                          />
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Instructions Section - Expandable on Mobile */}
                  <Card className="bg-muted/50">
                    <CardHeader
                      className="py-3 cursor-pointer"
                      onClick={() => toggleSection("instructions")}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          Instructions
                        </CardTitle>
                        {expandedSection === "instructions" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                    {expandedSection === "instructions" && (
                      <CardContent className="px-3 pb-3 pt-0 text-xs text-muted-foreground space-y-1">
                        <p>Select a tool to interact with the map.</p>
                        <p>
                          <strong>Draw Polygon:</strong> Tap to add points. Use
                          the &apos;Finish Drawing&apos; button when done (min 3
                          points).
                        </p>
                        <p>
                          <strong>Select/Pan:</strong> Drag map. Tap drawn
                          feature to re-analyze.
                        </p>
                        <p>
                          <strong>Note:</strong> Panning is disabled while
                          drawing.
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop search bar */}
        <div className="px-4 mb-4 md:px-8 flex-shrink-0">
          <div className="flex gap-2 items-center relative w-full max-w-md">
            <Input
              type="text"
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              onFocus={() => {
                if (searchResults.length > 0 && searchQuery.trim()) {
                  setShowSearchResults(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchLocation(searchQuery);
                }
                if (e.key === "Escape") {
                  setShowSearchResults(false);
                }
              }}
              className="pl-10"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              <Search className="h-4 w-4" />
            </span>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-10 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              disabled={!searchQuery.trim() || isSearching}
              onClick={() => searchLocation(searchQuery)}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>

            {/* Search results dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center gap-2"
                    onClick={() => goToSearchResult(result)}
                  >
                    <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        {result.poi?.name || result.address?.freeformAddress}
                      </p>
                      {result.poi?.name && (
                        <p className="text-xs text-muted-foreground">
                          {result.address?.freeformAddress}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Responsive layout grid - with sidebar adjusted for desktop/mobile */}
        <div className="grid md:grid-cols-12 gap-4 flex-grow min-h-0 px-4 md:px-8 pb-4 md:pb-8">
          {/* Desktop-only tools sidebar */}
          <ScrollArea className="hidden md:block md:col-span-3 h-full">
            <div className="space-y-4 pr-4">
              {/* Desktop tools sidebar content (unchanged) */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">
                    GIS Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="space-y-1">
                    <Button
                      variant={
                        activeToolGroup === "select" ? "secondary" : "ghost"
                      }
                      className="w-full justify-start"
                      onClick={() => handleToolSelect("select")}
                      size="sm"
                      disabled={drawingMode.active}
                    >
                      <MousePointer className="h-4 w-4 mr-2" />
                      <span>Select / Pan</span>
                    </Button>
                    <Button
                      variant={
                        activeToolGroup === "draw" ? "secondary" : "ghost"
                      }
                      className="w-full justify-start"
                      onClick={() => handleToolSelect("draw")}
                      size="sm"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      <span>Draw Polygon</span>
                    </Button>
                    <Button
                      variant={
                        activeToolGroup === "zoom" ? "secondary" : "ghost"
                      }
                      className="w-full justify-start"
                      onClick={() => handleToolSelect("zoom")}
                      size="sm"
                      disabled={!selectedArea || drawingMode.active}
                    >
                      <Maximize className="h-4 w-4 mr-2" />
                      <span>Zoom to Selection</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Layers</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="traffic-toggle-desktop"
                      className="text-sm flex items-center gap-2"
                    >
                      <Layers className="h-4 w-4" /> Traffic
                    </label>
                    <input
                      type="checkbox"
                      id="traffic-toggle-desktop"
                      checked={showTraffic}
                      onChange={() => toggleLayer("traffic")}
                      className="form-checkbox h-4 w-4 text-primary rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="buildings-toggle-desktop"
                      className="text-sm flex items-center gap-2"
                    >
                      <Building2 className="h-4 w-4" /> Buildings
                    </label>
                    <input
                      type="checkbox"
                      id="buildings-toggle-desktop"
                      checked={showBuildings}
                      onChange={() => toggleLayer("buildings")}
                      className="form-checkbox h-4 w-4 text-primary rounded"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">
                    Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0 text-xs text-muted-foreground space-y-1">
                  <p>Select a tool to interact with the map.</p>
                  <p>
                    <strong>Draw Polygon:</strong> Click to add points,
                    right-click to finish (min 3 points).
                  </p>
                  <p>
                    <strong>Select/Pan:</strong> Click and drag map. Click drawn
                    feature to re-analyze.
                  </p>
                  <p>
                    <strong>Note:</strong> Panning is disabled while drawing.
                  </p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          {/* Main map area - Full width on mobile */}
          <div className="col-span-12 md:col-span-9 relative h-full">
            <Card className="h-full w-full">
              <div ref={mapRef} className="h-full w-full rounded-md"></div>
              {/* Loading overlay for map */}
              {!isMapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md z-10">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p>Loading map...</p>
                  </div>
                </div>
              )}
              {/* Loading overlay for analysis */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md z-10">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p>Analyzing selected area...</p>
                  </div>
                </div>
              )}
              {/* Tool instructions overlay - position more centered on mobile */}
              {drawingMode.active && (
                <div className="absolute bottom-16 md:bottom-4 left-4 right-4 p-3 bg-background/95 rounded-md shadow border z-10 text-center">
                  <p className="text-sm">
                    {isMobile
                      ? "Tap to add points. Use the 'Finish Drawing' button when done (min 3 points)."
                      : "Click to add polygon points. Right-click to finish (min 3 points). Press Escape to cancel."}
                  </p>
                  {/* Add finish and cancel drawing buttons */}
                  <div className="flex gap-2 justify-center mt-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleCancelDrawing}
                    >
                      Cancel
                    </Button>

                    {isMobile && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleFinishDrawing}
                        disabled={pointCount < 3}
                      >
                        Finish Drawing{" "}
                        {pointCount >= 3 ? "✓" : `(${pointCount}/3)`}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Mobile quick tools - simplified to avoid duplication */}
        <div className="md:hidden fixed bottom-4 right-4 z-20 flex flex-col gap-2">
          <Button
            variant={activeToolGroup === "select" ? "secondary" : "default"}
            size="icon"
            onClick={() => handleToolSelect("select")}
            disabled={drawingMode.active}
            className="rounded-full h-12 w-12 shadow-lg"
            title="Pan"
          >
            <MousePointer className="h-5 w-5" />
          </Button>
          <Button
            variant={activeToolGroup === "draw" ? "secondary" : "default"}
            size="icon"
            onClick={() => handleToolSelect("draw")}
            className="rounded-full h-12 w-12 shadow-lg"
            title="Draw"
          >
            <Pencil className="h-5 w-5" />
          </Button>
        </div>

        {/* Analysis Dialog - Modified for better mobile experience */}
        <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
          <DialogContent className="sm:max-w-2xl z-[60] w-[95%] max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Area Analysis & Recommendations</DialogTitle>
              <DialogDescription className="hidden md:block">
                Urban planning data and AI recommendations for the selected
                area.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-2">
              <div className="space-y-4 py-4">
                {/* Area Data - Stack vertically on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Topology Card */}
                  <Card className="p-3">
                    <CardHeader className="p-2 pb-0">
                      <CardTitle className="text-sm">Topology</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      {areaData.topology ? (
                        <div className="text-sm space-y-1">
                          <p>
                            Elevation: {areaData.topology.elevation ?? "N/A"}
                          </p>
                          <p>Terrain: {areaData.topology.terrain ?? "N/A"}</p>
                          <p>
                            Water bodies:{" "}
                            {areaData.topology.waterBodies ?? "N/A"}
                          </p>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Loading...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {/* Density Card */}
                  <Card className="p-3">
                    <CardHeader className="p-2 pb-0">
                      <CardTitle className="text-sm">
                        Population Density
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      {areaData.density !== undefined ? (
                        <div className="text-sm">
                          <p>{areaData.density} people/km²</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {areaData.density > 5000
                              ? "High density"
                              : areaData.density > 1000
                              ? "Medium density"
                              : "Low density"}
                          </p>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Loading...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {/* Air Quality Card */}
                  <Card className="p-3">
                    <CardHeader className="p-2 pb-0">
                      <CardTitle className="text-sm">Air Quality</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      {areaData.airQuality && !areaData.airQuality.error ? (
                        <div className="text-sm space-y-1">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                              style={{
                                backgroundColor:
                                  areaData.airQuality.aqi <= 50
                                    ? "#10b981" // Green
                                    : areaData.airQuality.aqi <= 100
                                    ? "#f59e0b" // Yellow
                                    : areaData.airQuality.aqi <= 150
                                    ? "#f97316" // Orange
                                    : areaData.airQuality.aqi <= 200
                                    ? "#ef4444" // Red
                                    : areaData.airQuality.aqi <= 300
                                    ? "#8b5cf6" // Purple
                                    : "#831843", // Maroon
                              }}
                            ></div>
                            <span>
                              AQI: {areaData.airQuality.aqi} (
                              {areaData.airQuality.level}).
                            </span>
                          </div>
                          {areaData.airQuality.components && (
                            <p className="text-xs">
                              PM2.5:{" "}
                              {areaData.airQuality.components.pm2_5 ?? "N/A"}{" "}
                              μg/m³
                            </p>
                          )}
                        </div>
                      ) : areaData.airQuality?.error ? (
                        <div className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" /> Error loading AQI
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Loading...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                {/* AI Recommendations */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">
                    AI Planning Recommendations
                  </h3>
                  {!recommendations && !isLoadingRecommendations && (
                    <Button
                      onClick={getUrbanPlanningRecommendations}
                      disabled={
                        !areaData.airQuality || !!areaData.airQuality.error
                      } // Disable if no AQ data
                      className="w-full md:w-auto" // Full width on mobile
                    >
                      Get AI Recommendations
                    </Button>
                  )}

                  {isLoadingRecommendations && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating recommendations...</span>
                    </div>
                  )}

                  {recommendations && (
                    <Card className="p-4 bg-muted/30">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{recommendations}</ReactMarkdown>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 italic">
                        AI-generated recommendations based on provided data.
                        Verify with domain experts.
                      </p>
                    </Card>
                  )}
                  {!isLoadingRecommendations &&
                    !recommendations &&
                    areaData.airQuality?.error && (
                      <p className="text-sm text-destructive mt-2">
                        Cannot generate recommendations due to missing air
                        quality data.
                      </p>
                    )}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setAnalysisDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setSelectedArea(null);
                  setAreaData({});
                  setRecommendations("");
                  setAnalysisDialogOpen(false);
                  clearExistingDrawings();
                }}
                className="w-full sm:w-auto"
              >
                Clear Selection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
