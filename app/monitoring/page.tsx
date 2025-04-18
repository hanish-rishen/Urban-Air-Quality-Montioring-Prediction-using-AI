"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState, useRef } from "react";
import { AlertCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { LineChartCard } from "@/components/ui/line-chart";
import { Button } from "@/components/ui/button";
import { NewsSection } from "@/components/ui/news-section";

interface AirQualityData {
  timestamp: number;
  aqi: number;
  openWeatherAqi?: number;
  level: string;
  description: string;
  color: string;
  components: Record<string, number>;
}

interface ComponentData {
  value: number;
  unit: string;
  name: string;
}

interface AirQualityTrend {
  timestamp: number;
  value: number;
  label: string;
  color: string;
}

export default function MonitoringPage() {
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [components, setComponents] = useState<Record<
    string,
    ComponentData
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aqiTrend, setAqiTrend] = useState<AirQualityTrend[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [location, setLocation] = useState<string>("global");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const pollutantCardRef = useRef<HTMLDivElement>(null);

  const fetchAirQuality = async (lat: string, lon: string) => {
    try {
      const aqResponse = await fetch(
        `https://uaqmp-api.hanishrishen.workers.dev/api/current?lat=${lat}&lon=${lon}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!aqResponse.ok)
        throw new Error(
          `Failed to fetch air quality data: ${aqResponse.status}`
        );

      const aqData = await aqResponse.json();
      setAirQuality(aqData);

      // Store the AQI value in localStorage for the news service to access
      localStorage.setItem("currentAQI", aqData.aqi.toString());
      localStorage.setItem("currentAQILevel", aqData.level);

      // Also send this data to the backend to store
      try {
        await fetch(
          "https://uaqmp-api.hanishrishen.workers.dev/api/store-air-quality",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              aqi: aqData.aqi,
              level: aqData.level,
              components: aqData.components,
            }),
          }
        );
        console.log("Successfully stored air quality data on backend");
      } catch (storeError) {
        console.error(
          "Failed to store air quality data on backend:",
          storeError
        );
      }

      // Update last refresh time
      setLastUpdateTime(new Date().toLocaleTimeString());

      // Add the new data point to our trend and ensure timestamps are ordered correctly
      setAqiTrend((prev) => {
        // Create the new trend with the new data point
        const newPoint = {
          timestamp: aqData.timestamp,
          value: aqData.aqi,
          label: aqData.level,
          color: aqData.color || getColorFromAqi(aqData.aqi),
        };

        // Add to existing points and ensure sorted by timestamp
        const newTrend = [...prev, newPoint].sort(
          (a, b) => a.timestamp - b.timestamp
        );

        // Keep only the most recent 12 points
        if (newTrend.length > 12) {
          return newTrend.slice(newTrend.length - 12);
        }
        return newTrend;
      });

      return aqData;
    } catch (apiError) {
      console.error("API request error:", apiError);
      setError(
        "Failed to load air quality data. Please check if the backend server is running."
      );
      throw apiError;
    }
  };

  const fetchComponents = async (lat: string, lon: string) => {
    try {
      const compResponse = await fetch(
        `https://uaqmp-api.hanishrishen.workers.dev/api/components?lat=${lat}&lon=${lon}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!compResponse.ok)
        throw new Error(
          `Failed to fetch components data: ${compResponse.status}`
        );
      const compData = await compResponse.json();
      console.log("Component data received:", compData);
      setComponents(compData);
    } catch (apiError) {
      console.error("API components request error:", apiError);

      // Provide fallback data if API fails
      setComponents({
        co: { value: 250.34, unit: "μg/m³", name: "Carbon Monoxide" },
        no2: { value: 12.87, unit: "μg/m³", name: "Nitrogen Dioxide" },
        o3: { value: 60.19, unit: "μg/m³", name: "Ozone" },
        pm2_5: { value: 25.32, unit: "μg/m³", name: "Fine Particles" },
        pm10: { value: 32.56, unit: "μg/m³", name: "Coarse Particles" },
        so2: { value: 6.72, unit: "μg/m³", name: "Sulfur Dioxide" },
      });
    }
  };

  const fetchData = async () => {
    try {
      setIsRefreshing(true);

      // Get user's location if available
      let lat = "37.7749";
      let lon = "-122.4194";

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
              });
            }
          );

          lat = position.coords.latitude.toString();
          lon = position.coords.longitude.toString();
        } catch (geoError) {
          console.warn("Geolocation error:", geoError);
          console.log("Using default coordinates");
        }
      }

      console.log(`Making API request with coordinates: ${lat}, ${lon}`);

      // Fetch current air quality first
      await fetchAirQuality(lat, lon);

      // Then fetch components
      await fetchComponents(lat, lon);

      // Wait a moment to ensure OpenWeather data is stored on the backend
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Now fetch news & AI summary with the OpenWeather data available
      // This ensures the summary has access to the latest air quality data
      if (location) {
        console.log("Fetching news after air quality data is loaded");
        // We don't need to await this, it can load independently now
        fetch(
          `https://uaqmp-api.hanishrishen.workers.dev/api/news/air-quality?location=${encodeURIComponent(
            location
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        )
          .then((response) => response.json())
          .then((data) => console.log("Successfully fetched news data"))
          .catch((err) => console.error("Error fetching news:", err));
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load air quality data. Please try again later.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Poll for data every 1 minute to build up the trend line (changed from 5 minutes)
    const interval = setInterval(fetchData, 1 * 60 * 1000);

    // For demo/development purposes, add some sample data to show a trend immediately
    if (aqiTrend.length === 0) {
      const now = Date.now();
      const sampleData: AirQualityTrend[] = [
        {
          timestamp: now - 11 * 5 * 60 * 1000,
          value: 48,
          label: "Good",
          color: getColorFromAqi(48),
        },
        {
          timestamp: now - 10 * 5 * 60 * 1000,
          value: 51,
          label: "Moderate",
          color: getColorFromAqi(51),
        },
        {
          timestamp: now - 9 * 5 * 60 * 1000,
          value: 54,
          label: "Moderate",
          color: getColorFromAqi(54),
        },
        {
          timestamp: now - 8 * 5 * 60 * 1000,
          value: 58,
          label: "Moderate",
          color: getColorFromAqi(58),
        },
        {
          timestamp: now - 7 * 5 * 60 * 1000,
          value: 62,
          label: "Moderate",
          color: getColorFromAqi(62),
        },
        {
          timestamp: now - 6 * 5 * 60 * 1000,
          value: 66,
          label: "Moderate",
          color: getColorFromAqi(66),
        },
        {
          timestamp: now - 5 * 5 * 60 * 1000,
          value: 60,
          label: "Moderate",
          color: getColorFromAqi(60),
        },
        {
          timestamp: now - 4 * 5 * 60 * 1000,
          value: 54,
          label: "Moderate",
          color: getColorFromAqi(54),
        },
        {
          timestamp: now - 3 * 5 * 60 * 1000,
          value: 48,
          label: "Good",
          color: getColorFromAqi(48),
        },
        {
          timestamp: now - 2 * 5 * 60 * 1000,
          value: 45,
          label: "Good",
          color: getColorFromAqi(45),
        },
        {
          timestamp: now - 1 * 5 * 60 * 1000,
          value: 42,
          label: "Good",
          color: getColorFromAqi(42),
        },
      ];

      // Sort the sample data by timestamp to ensure correct order
      setAqiTrend(sampleData.sort((a, b) => a.timestamp - b.timestamp));
    }

    // Get geo location name if possible
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            if (data.city) {
              setLocation(data.city);
            } else if (data.locality) {
              setLocation(data.locality);
            } else if (data.countryName) {
              setLocation(data.countryName);
            }
          } catch (error) {
            console.error("Error getting location name:", error);
          }
        },
        (error) => {
          console.warn("Geolocation error:", error);
        }
      );
    }

    return () => clearInterval(interval);
  }, []);

  // Helper function to get color based on AQI
  function getColorFromAqi(aqi: number): string {
    if (aqi <= 50) return "green";
    if (aqi <= 100) return "yellow";
    if (aqi <= 150) return "orange";
    if (aqi <= 200) return "red";
    if (aqi <= 300) return "purple";
    return "maroon";
  }

  // Helper function to get color class based on AQI level
  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return "bg-green-500";
    if (aqi <= 100) return "bg-yellow-500";
    if (aqi <= 150) return "bg-orange-500";
    if (aqi <= 200) return "bg-red-500";
    if (aqi <= 300) return "bg-purple-500";
    return "bg-pink-900";
  };

  // Function to navigate pollutant carousel
  const navigateCarousel = (direction: "next" | "prev") => {
    if (!components) return;

    const pollutants = Object.keys(components);
    if (direction === "next") {
      setCarouselIndex((prev) => (prev + 1) % pollutants.length);
    } else {
      setCarouselIndex(
        (prev) => (prev - 1 + pollutants.length) % pollutants.length
      );
    }

    // Scroll to the card if on mobile
    if (pollutantCardRef.current && window.innerWidth < 768) {
      pollutantCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  };

  // Get a set of visible pollutants based on carousel index
  const getVisiblePollutants = () => {
    if (!components) return [];

    const pollutants = Object.entries(components);
    // On desktop, show 3 at a time; on mobile show 1
    const perPage = window.innerWidth >= 768 ? 3 : 1;
    const startIndex = carouselIndex;

    // Get the current set of visible pollutants with wrap-around
    const visibleItems = [];
    for (let i = 0; i < perPage; i++) {
      const index = (startIndex + i) % pollutants.length;
      visibleItems.push(pollutants[index]);
    }

    return visibleItems;
  };

  // Get color for a pollutant based on its value relative to maximum
  const getPollutantColor = (key: string, value: number) => {
    const maxValue = getMaxValueForComponent(key);
    const percentage = (value / maxValue) * 100;

    if (percentage <= 25) return "bg-green-500";
    if (percentage <= 50) return "bg-yellow-500";
    if (percentage <= 75) return "bg-orange-500";
    return "bg-red-500";
  };

  // Get a pollutant's description
  const getPollutantDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      co: "Carbon monoxide, produced by combustion processes",
      no: "Nitric oxide, produced by combustion processes",
      no2: "Nitrogen dioxide, can cause respiratory issues",
      o3: "Ozone, can trigger asthma and reduce lung function",
      so2: "Sulfur dioxide, contributor to acid rain and respiratory issues",
      pm2_5: "Fine particulate matter, can penetrate deep into lungs",
      pm10: "Inhalable particles that can reach upper respiratory tract",
      nh3: "Ammonia, irritant that can affect respiratory system",
    };

    return descriptions[key] || "Air pollutant affecting air quality";
  };

  if (loading) {
    return (
      <div className="px-4 py-6 pt-20 md:p-8 md:pt-20 lg:pt-8 lg:pl-80 flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4">Loading air quality data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 pt-20 md:p-8 md:pt-20 lg:pt-8 lg:pl-80">
        <Card className="p-4 md:p-6 bg-destructive/10">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="mt-2">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    // Add responsive padding with better mobile optimization
    <div className="px-4 py-6 pt-20 md:p-8 md:pt-20 lg:pt-8 lg:pl-80">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">
          Air Quality Monitoring
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time air quality data and analysis
        </p>
      </div>

      {airQuality && (
        <>
          {/* Responsive grid with stacked cards on mobile */}
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 mb-6">
            <Card className="p-4 md:p-6">
              <div className="flex flex-col items-center justify-center">
                <h3 className="text-xl md:text-2xl font-semibold mb-2">
                  Current AQI
                </h3>
                <div className="flex items-center justify-center h-28 w-28 md:h-36 md:w-36 rounded-full bg-muted mb-3 md:mb-4 relative">
                  <span className="text-3xl md:text-4xl font-bold">
                    {airQuality.aqi}
                  </span>
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1.5 ${getAqiColor(
                      airQuality.aqi
                    )}`}
                  />
                </div>
                <h4 className="text-lg md:text-xl font-medium">
                  {airQuality.level}
                </h4>
                <p className="text-center text-muted-foreground mt-2 text-sm md:text-base">
                  {airQuality.description}
                </p>
                {airQuality.openWeatherAqi && (
                  <p className="text-xs text-muted-foreground mt-1">
                    OpenWeather Index: {airQuality.openWeatherAqi}/5
                  </p>
                )}

                {/* Mobile optimized pollutant carousel */}
                {components && (
                  <div className="w-full mt-4 md:mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-semibold">Key Pollutants</h5>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6 md:h-7 md:w-7"
                          onClick={() => navigateCarousel("prev")}
                        >
                          <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6 md:h-7 md:w-7"
                          onClick={() => navigateCarousel("next")}
                        >
                          <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </div>

                    <div
                      className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                      style={{ scrollBehavior: "smooth" }}
                      ref={pollutantCardRef}
                    >
                      {getVisiblePollutants().map(([key, comp]) => (
                        <div
                          key={key}
                          className="min-w-[100px] sm:min-w-[120px] flex-1 bg-muted rounded-lg p-3 relative overflow-hidden"
                        >
                          <div
                            className={`absolute bottom-0 left-0 right-0 h-1 ${getPollutantColor(
                              key,
                              comp.value
                            )}`}
                          />
                          <div className="font-semibold text-sm md:text-base">
                            {key.toUpperCase()}
                          </div>
                          <div className="text-base md:text-lg font-medium mt-1">
                            {comp.value}{" "}
                            <span className="text-xs text-muted-foreground">
                              {comp.unit}
                            </span>
                          </div>
                          <div
                            className="text-xs text-muted-foreground mt-1 line-clamp-2"
                            title={getPollutantDescription(key)}
                          >
                            {comp.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs md:text-sm text-muted-foreground mt-4">
                  Last updated:{" "}
                  {new Date(airQuality.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </Card>

            {/* Components card optimized for mobile */}
            <Card className="p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
                Air Quality Components
              </h3>
              {components && (
                <div className="space-y-3 md:space-y-4">
                  {Object.entries(components).map(([key, comp]) => (
                    <div key={key} className="space-y-1 md:space-y-2">
                      <div className="flex justify-between items-center text-sm md:text-base">
                        <span>{comp.name}</span>
                        <span className="text-xs md:text-sm font-medium">
                          {comp.value} {comp.unit}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(
                          100,
                          (comp.value / getMaxValueForComponent(key)) * 100
                        )}
                        className="h-1.5 md:h-2"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* AQI Trend chart with responsive height */}
          <div className="mt-4 md:mt-6 mb-6 md:mb-8">
            <div className="mb-2">
              <h2 className="text-lg md:text-xl font-semibold">
                Air Quality Trend
              </h2>
            </div>
            {lastUpdateTime && (
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                Last updated: {lastUpdateTime} · Data refreshes automatically
                every minute
              </p>
            )}
            <LineChartCard
              title="AQI Changes Over Time"
              description="Air Quality Index with real-time updates from OpenWeather API"
              data={aqiTrend}
              valueLabel="AQI"
              colors={{
                stroke: "hsl(var(--primary))",
                gradient: {
                  from: "hsl(var(--primary)/.2)",
                  to: "hsl(var(--background))",
                },
              }}
              height={window.innerWidth < 768 ? 220 : 300}
            />
          </div>

          {/* News section with better mobile spacing */}
          <div className="mt-6 md:mt-8">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">
              News & Resources
            </h2>
            <NewsSection location={location} />
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to get max values for each component to properly scale the progress bars
function getMaxValueForComponent(component: string): number {
  const maxValues: Record<string, number> = {
    co: 15000, // μg/m³
    no: 100, // μg/m³
    no2: 200, // μg/m³
    o3: 180, // μg/m³
    so2: 350, // μg/m³
    pm2_5: 75, // μg/m³
    pm10: 200, // μg/m³
    nh3: 200, // μg/m³
  };

  return maxValues[component] || 100;
}
