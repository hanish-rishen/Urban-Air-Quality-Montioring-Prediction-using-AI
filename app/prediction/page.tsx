"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Download,
  Loader2,
  RefreshCcw,
  MapPin,
  Brain,
  BarChart3,
  AlertCircle,
  Zap,
  Info,
} from "lucide-react";
import { AqiPredictionChart } from "@/components/ui/aqi-prediction-chart";
import { DailyAqiCard } from "@/components/ui/daily-aqi-card";
import { predictionApi } from "@/services/prediction-api";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ModelMetricsDisplay } from "@/components/ui/model-metrics-display";
import { useMLModel } from "./use-ml-model";

export default function PredictionPage() {
  const [hourlyPredictions, setHourlyPredictions] = useState<any[]>([]);
  const [weeklyPredictions, setWeeklyPredictions] = useState<any[]>([]);
  const [location, setLocation] = useState<string>("Loading location...");
  const [coordinates, setCoordinates] = useState({
    lat: "",
    lon: "",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  // Add state for current AQI
  const [currentAQI, setCurrentAQI] = useState<{
    aqi: number;
    level: string;
  } | null>(null);

  // Add new state for location suggestions
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // Use the enhanced ML model hook
  const { modelStatus, setModelStatus, modelSteps } = useMLModel();

  // Get model info
  const [modelInfo] = useState(() => predictionApi.getModelInformation());

  // Fetch prediction data with optional coordinates - Wrapped in useCallback
  const fetchPredictionData = useCallback(
    async (lat?: string, lon?: string) => {
      try {
        setRefreshing(true);
        if (loading) setModelStatus("loading");

        const latToUse = lat || coordinates.lat;
        const lonToUse = lon || coordinates.lon;

        // Only proceed if we have coordinates
        if (!latToUse || !lonToUse) {
          setRefreshing(false);
          return;
        }

        // First, fetch current AQI from backend
        let currentApiAqi = null;
        try {
          const response = await fetch(
            `https://uaqmp-api.hanishrishen.workers.dev/api/current?lat=${latToUse}&lon=${lonToUse}`
          );
          if (response.ok) {
            const data = await response.json();
            // Store the current AQI and level
            setCurrentAQI({
              aqi: data.aqi,
              level: data.level,
            });
            currentApiAqi = data.aqi;
            console.log(`Current API AQI: ${data.aqi}, Level: ${data.level}`);
          }
        } catch (error) {
          console.error("Error fetching current AQI:", error);
        }

        // Continue with predictions
        const hourlyData = await predictionApi.getHourlyPredictions(
          latToUse,
          lonToUse
        );

        // Replace first hourly prediction with actual current AQI if available
        if (hourlyData.length > 0 && currentApiAqi !== null) {
          hourlyData[0].aqi = currentApiAqi;
          console.log("Updated hourly prediction with current API AQI value");
        }

        setHourlyPredictions(hourlyData);

        const weeklyData = await predictionApi.getWeeklyPredictions(
          latToUse,
          lonToUse
        );

        // Replace first weekly prediction with actual current AQI if available
        if (weeklyData.length > 0 && currentApiAqi !== null) {
          weeklyData[0].aqi = currentApiAqi;
          console.log("Updated weekly prediction with current API AQI value");
        }

        setWeeklyPredictions(weeklyData);

        // Set model status based on data availability
        setModelStatus(
          hourlyData.length > 0 && weeklyData.length > 0 ? "ready" : "error"
        );
      } catch (error) {
        console.error("Error fetching prediction data:", error);
        setModelStatus("error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [coordinates.lat, coordinates.lon, loading, setModelStatus]
  );

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(
    (suggestion: any) => {
      setLocation(suggestion.text);
      setCoordinates({
        lat: suggestion.position.lat.toString(),
        lon: suggestion.position.lon.toString(),
      });
      setShowLocationSuggestions(false);

      // Fetch new prediction data for selected location
      fetchPredictionData(
        suggestion.position.lat.toString(),
        suggestion.position.lon.toString()
      );
    },
    [fetchPredictionData]
  );

  // Search for a location
  const searchLocation = useCallback(async () => {
    if (!location) return;

    try {
      setRefreshing(true);

      // Use TomTom geocoding API to get coordinates from location name
      const response = await fetch(
        `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(
          location
        )}.json?key=${process.env.NEXT_PUBLIC_TOMTOM_API_KEY}`
      );

      if (!response.ok) throw new Error("Location search failed");

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const newLat = result.position.lat.toString();
        const newLon = result.position.lon.toString();

        setCoordinates({
          lat: newLat,
          lon: newLon,
        });

        // Update location display name if available
        if (result.address && result.address.freeformAddress) {
          setLocation(result.address.freeformAddress);
        }

        // Fetch new prediction data for this location
        await fetchPredictionData(newLat, newLon);
      }
    } catch (error) {
      console.error("Error searching location:", error);
      alert("Could not find the specified location. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, [fetchPredictionData, location]);

  // Add new function to fetch location suggestions
  const fetchLocationSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(
          query
        )}.json?key=${
          process.env.NEXT_PUBLIC_TOMTOM_API_KEY
        }&limit=5&typeahead=true&language=en-GB`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const suggestions = data.results.map((result: any) => ({
            id: result.id,
            text: result.address.freeformAddress,
            position: result.position,
          }));

          setLocationSuggestions(suggestions);
          setShowLocationSuggestions(suggestions.length > 0);
        } else {
          setLocationSuggestions([]);
          setShowLocationSuggestions(false);
        }
      }
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  }, []);

  // Download prediction report as CSV
  const downloadReport = useCallback(() => {
    // Combine hourly and weekly predictions into a CSV format
    let csvContent = "Date,Time,AQI,Category\n";

    // Add hourly predictions
    hourlyPredictions.forEach((prediction) => {
      const date = new Date(prediction.timestamp);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      let category = "Good";
      if (prediction.aqi > 300) category = "Hazardous";
      else if (prediction.aqi > 200) category = "Very Unhealthy";
      else if (prediction.aqi > 150) category = "Unhealthy";
      else if (prediction.aqi > 100)
        category = "Unhealthy for Sensitive Groups";
      else if (prediction.aqi > 50) category = "Moderate";

      csvContent += `${dateStr},${timeStr},${prediction.aqi},${category}\n`;
    });

    // Create download link
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `aqi_predictions_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [hourlyPredictions]);

  // Initial data fetch (depends on coordinates and fetchPredictionData)
  useEffect(() => {
    // Only fetch if coordinates are available
    if (coordinates.lat && coordinates.lon) {
      fetchPredictionData(); // Call fetchPredictionData here

      // Simulate model loading time - only if status is loading
      if (modelStatus === "loading") {
        const timer = setTimeout(() => {
          // Check again before setting to ready, might have errored
          if (modelStatus === "loading") {
            setModelStatus("ready");
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [coordinates, fetchPredictionData, modelStatus, setModelStatus]); // Add dependencies

  // Get user's location on component mount - Fixed implementation
  useEffect(() => {
    // Get user's location and initialize data
    const initLocation = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude.toString();
              const lon = position.coords.longitude.toString();

              // Only set coordinates and location if we don't already have a user-specified location
              if (!coordinates.lat || !coordinates.lon) {
                setCoordinates({ lat, lon });

                // Try to get location name with reverse geocoding
                fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
                )
                  .then((response) => response.json())
                  .then((data) => {
                    let locationName = "Current Location";
                    if (data.city) {
                      locationName = data.city;
                    } else if (data.locality) {
                      locationName = data.locality;
                    } else if (data.countryName) {
                      locationName = data.countryName;
                    }
                    setLocation(locationName);
                  })
                  .catch((error) => {
                    console.error("Error getting location name:", error);
                    setLocation("Current Location");
                  })
                  .finally(() => {
                    // Fetch predictions with the user's location
                    fetchPredictionData(lat, lon);
                  });
              }
            },
            (error) => {
              console.warn("Geolocation error:", error.message);
              // Fallback to a default location if geolocation fails
              const defaultLat = "37.7749";
              const defaultLon = "-122.4194";

              // Only set coordinates if we don't already have any
              if (!coordinates.lat || !coordinates.lon) {
                setCoordinates({ lat: defaultLat, lon: defaultLon });
                setLocation("San Francisco, CA");
                fetchPredictionData(defaultLat, defaultLon);
              }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          console.log("Geolocation not supported, using default coordinates");
          // Fallback to a default location if geolocation is not available
          const defaultLat = "37.7749";
          const defaultLon = "-122.4194";

          // Only set if we don't already have coordinates
          if (!coordinates.lat || !coordinates.lon) {
            setCoordinates({ lat: defaultLat, lon: defaultLon });
            setLocation("San Francisco, CA");
            fetchPredictionData(defaultLat, defaultLon);
          }
        }
      } catch (error) {
        console.warn("Error in location initialization:", error);
        // Avoid throwing a generic error that will appear in the console

        // Fallback to a default location
        const defaultLat = "37.7749";
        const defaultLon = "-122.4194";

        // Only set if we don't already have coordinates
        if (!coordinates.lat || !coordinates.lon) {
          setCoordinates({ lat: defaultLat, lon: defaultLon });
          setLocation("San Francisco, CA");
          fetchPredictionData(defaultLat, defaultLon);
        }
      }
    };

    // Only run on initial mount
    initLocation();
    // We're explicitly not including fetchPredictionData and coordinates as dependencies
    // because we want this to run only once on mount, and we're guarding against
    // unnecessary updates within the function itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // Add back the left padding (lg:pl-80) to accommodate the sidebar
    <div className="p-8 pt-20 lg:pt-8 lg:pl-80">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Air Quality Prediction</h1>
        <p className="text-muted-foreground">
          Forecast and analyze future air quality patterns using machine
          learning
        </p>
      </div>

      {/* Display current AQI from API */}
      {currentAQI && (
        <Card className="mb-6 border-2 border-primary">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-3 mb-3 md:mb-0">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    currentAQI.aqi <= 50
                      ? "bg-green-500"
                      : currentAQI.aqi <= 100
                      ? "bg-yellow-500"
                      : currentAQI.aqi <= 150
                      ? "bg-orange-500"
                      : currentAQI.aqi <= 200
                      ? "bg-red-500"
                      : currentAQI.aqi <= 300
                      ? "bg-purple-500"
                      : "bg-pink-900"
                  }`}
                >
                  {currentAQI.aqi}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Current AQI</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentAQI.level}
                  </p>
                </div>
              </div>
              <div className="text-sm">
                <Badge variant="outline" className="mb-1">
                  Real-time Data
                </Badge>
                <p className="text-muted-foreground text-xs">
                  From OpenWeather API
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-grow flex gap-2 items-center relative">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <Input
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  fetchLocationSuggestions(e.target.value);
                }}
                onFocus={() => {
                  if (locationSuggestions.length > 0)
                    setShowLocationSuggestions(true);
                }}
                placeholder="Enter location"
                className="flex-grow"
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchLocation();
                }}
              />
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50">
                  {locationSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      {suggestion.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={searchLocation}
                disabled={refreshing || !location}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => fetchPredictionData()} // Wrap in arrow function
                disabled={refreshing}
              >
                <RefreshCcw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""} mr-2`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Model status indicator */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-2 text-sm text-muted-foreground">
                Model status:
              </div>
              {modelStatus === "loading" ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-1 text-yellow-500" />
                  <span className="text-xs text-yellow-600">
                    Initializing prediction model...
                  </span>
                </div>
              ) : modelStatus === "ready" ? (
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs text-green-600">Ready</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-xs text-red-600">
                    Error loading model
                  </span>
                </div>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 cursor-help">
                    <Zap className="h-3 w-3" /> Live Predictions
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    TensorFlow.js model running in your browser. Predictions are
                    based on real-time data and weather patterns.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* ML Model Steps Progress */}
          <div className="mt-6 border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-3">
              Machine Learning Pipeline Status
            </h4>
            <div className="space-y-2">
              {modelSteps.map((step, index) => (
                <div key={index} className="flex items-center">
                  {step.completed ? (
                    <div className="w-4 h-4 rounded-full bg-green-500 mr-3 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  ) : modelStatus === "error" ? (
                    <div className="w-4 h-4 rounded-full bg-red-500 mr-3" />
                  ) : index === modelSteps.findIndex((s) => !s.completed) ? (
                    <div className="w-4 h-4 mr-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-gray-200 mr-3" />
                  )}
                  <span
                    className={`text-xs ${
                      step.completed
                        ? "text-green-700 dark:text-green-400 font-medium"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {step.step}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center">
              <Info className="w-3 h-3 mr-1" />
              {modelStatus === "ready"
                ? "TensorFlow.js model active and making predictions in your browser"
                : modelStatus === "error"
                ? "Error initializing model - using fallback data"
                : "Initializing TensorFlow.js model..."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hourly prediction chart */}
      <div className="mb-6">
        <AqiPredictionChart
          data={hourlyPredictions}
          title="24-Hour AQI Forecast"
          description={`Hourly air quality predictions starting with current AQI: ${
            currentAQI?.aqi || "Loading..."
          }`}
          height={350}
          hourly={true}
        />
      </div>

      {/* Weekly prediction cards and chart */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 mb-6">
        <Card className="md:row-span-2">
          <CardHeader>
            <CardTitle>7-Day AQI Forecast</CardTitle>
            <CardDescription>
              Predicted air quality starting from today&apos;s AQI:{" "}
              {currentAQI?.aqi || "Loading..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : weeklyPredictions.length > 0 ? (
              weeklyPredictions.map((prediction) => (
                <DailyAqiCard
                  key={prediction.timestamp}
                  timestamp={prediction.timestamp}
                  aqi={prediction.aqi}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No weekly forecast data available
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <AqiPredictionChart
            data={weeklyPredictions}
            title="Weekly Trend"
            height={250}
            showConfidence={true}
            hourly={false}
          />

          <Card>
            <CardHeader>
              <CardTitle>Detailed Report</CardTitle>
              <CardDescription>
                Export prediction data for further analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={downloadReport}
                disabled={loading || hourlyPredictions.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ML Model Metrics Display */}
      <ModelMetricsDisplay />
    </div>
  );
}
