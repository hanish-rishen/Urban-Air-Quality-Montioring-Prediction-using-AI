"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, ZoomIn, ChevronDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
} from "recharts";

interface AqiPredictionChartProps {
  data: {
    timestamp: number;
    aqi: number;
    confidence?: number;
    components?: Record<string, number>;
    featureImportance?: Record<string, number>;
  }[];
  title: string;
  description?: string;
  height?: number;
  showConfidence?: boolean;
  hourly?: boolean;
}

const AQI_LEVELS = [
  { threshold: 0, label: "Good", color: "#10b981" },
  { threshold: 51, label: "Moderate", color: "#f59e0b" },
  { threshold: 101, label: "Unhealthy for Sensitive Groups", color: "#f97316" },
  { threshold: 151, label: "Unhealthy", color: "#ef4444" },
  { threshold: 201, label: "Very Unhealthy", color: "#8b5cf6" },
  { threshold: 301, label: "Hazardous", color: "#831843" },
];

export function AqiPredictionChart({
  data,
  title,
  description,
  height = 300,
  showConfidence = true,
  hourly = true,
}: AqiPredictionChartProps) {
  // Remove the state for showDetails and zoomLevel since we're removing those buttons
  const [showDetails, setShowDetails] = useState(false);
  // const [zoomLevel, setZoomLevel] = useState(1);

  // Check if data is valid
  const hasValidData = Array.isArray(data) && data.length > 0;

  // Format data for chart with confidence intervals
  const chartData = hasValidData
    ? data.map((item) => {
        const date = new Date(item.timestamp);
        const formattedDate = hourly
          ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : date.toLocaleDateString([], { month: "short", day: "numeric" });

        const confidence = item.confidence || 0.7;
        const confidenceRange = item.aqi * (1 - confidence);

        return {
          name: formattedDate,
          aqi: item.aqi,
          min: Math.max(0, item.aqi - confidenceRange),
          max: item.aqi + confidenceRange,
          timestamp: item.timestamp,
          ...item.components,
        };
      })
    : [];

  // Get maximum AQI value for Y-axis scale with some padding
  const maxAqi = hasValidData
    ? Math.max(...data.map((item) => item.aqi)) * 1.2
    : 300;

  // Get AQI level for current/first data point
  const getAqiInfo = (aqi: number) => {
    const level = AQI_LEVELS.reduce(
      (prev, curr) => (aqi >= curr.threshold ? curr : prev),
      AQI_LEVELS[0]
    );
    return level;
  };

  const currentLevel = hasValidData ? getAqiInfo(data[0].aqi) : AQI_LEVELS[0];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const aqiValue = data.aqi;
      const aqiInfo = getAqiInfo(aqiValue);
      const date = new Date(data.timestamp);

      return (
        <div className="p-3 bg-white dark:bg-gray-800 shadow-lg rounded-lg border">
          <p className="font-bold">
            {label} -{" "}
            {hourly
              ? date.toLocaleDateString([], { month: "short", day: "numeric" })
              : `Week ${
                  Math.floor(
                    (date.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
                  ) + 1
                }`}
          </p>
          <div className="flex items-center gap-2 my-1">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: aqiInfo.color }}
            ></div>
            <p className="font-semibold">{`AQI: ${aqiValue} - ${aqiInfo.label}`}</p>
          </div>
          {showDetails && data.pm25 && (
            <div className="mt-2 pt-2 border-t text-xs space-y-1">
              <p className="text-gray-500 dark:text-gray-400">Components:</p>
              <p>PM2.5: {data.pm25} μg/m³</p>
              <p>PM10: {data.pm10} μg/m³</p>
              <p>O3: {data.o3} μg/m³</p>
              <p>NO2: {data.no2} μg/m³</p>
            </div>
          )}
          {showConfidence && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Confidence Range: {Math.round(data.min)} - {Math.round(data.max)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Show loading or empty state if no data
  if (!hasValidData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground flex items-center gap-2">
            <Info className="w-4 h-4" />
            No prediction data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            {AQI_LEVELS.slice(0, 4).map((level) => (
              <Badge
                key={level.label}
                variant="outline"
                className="text-white"
                style={{ backgroundColor: level.color }}
              >
                {level.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: height }} className="relative">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <defs>
                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorConfidence"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="name"
                angle={-30}
                textAnchor="end"
                height={50}
                interval={hourly ? 3 : 0}
              />
              <YAxis
                domain={[0, Math.ceil(maxAqi / 50) * 50]}
                label={{ value: "AQI", angle: -90, position: "insideLeft" }}
              />

              {/* Add reference lines for AQI levels */}
              {AQI_LEVELS.slice(1).map((level) => (
                <ReferenceLine
                  key={level.threshold}
                  y={level.threshold}
                  stroke={level.color}
                  strokeDasharray="3 3"
                  label={{
                    value: level.label,
                    position: "right",
                    fill: level.color,
                    fontSize: 10,
                  }}
                />
              ))}

              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Confidence interval area */}
              {showConfidence && (
                <Area
                  type="monotone"
                  dataKey="max"
                  stroke="transparent"
                  fillOpacity={1}
                  fill="url(#colorConfidence)"
                />
              )}
              {showConfidence && (
                <Area
                  type="monotone"
                  dataKey="min"
                  stroke="transparent"
                  fillOpacity={0}
                />
              )}

              {/* Main line */}
              <Line
                type="monotone"
                dataKey="aqi"
                name="AQI Prediction"
                stroke="#8884d8"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 8 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center border-t pt-3">
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: currentLevel.color }}
          ></div>
          <span className="text-sm font-medium">
            Current: {hasValidData ? data[0].aqi : "N/A"} ({currentLevel.label})
          </span>
        </div>
        {/* Removed the buttons div that contained zoom and details buttons */}
      </CardFooter>
    </Card>
  );
}
