import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface DailyAqiCardProps {
  timestamp: number;
  aqi: number;
  className?: string;
}

export function DailyAqiCard({ timestamp, aqi, className }: DailyAqiCardProps) {
  // Format the date as "Day, Month D"
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Get the appropriate background color based on AQI
  const getBgColor = (aqi: number): string => {
    if (aqi <= 50) return "bg-green-100 text-green-800"; // Good
    if (aqi <= 100) return "bg-yellow-100 text-yellow-800"; // Moderate
    if (aqi <= 150) return "bg-orange-100 text-orange-800"; // USG
    if (aqi <= 200) return "bg-red-100 text-red-800"; // Unhealthy
    if (aqi <= 300) return "bg-purple-100 text-purple-800"; // Very Unhealthy
    return "bg-pink-100 text-pink-900"; // Hazardous
  };

  // Get the AQI category text
  const getAqiCategory = (aqi: number): string => {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "USG";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div
          className={`flex items-center justify-between p-3 ${getBgColor(aqi)}`}
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-semibold">{aqi} AQI</span>
            <span className="text-xs">{getAqiCategory(aqi)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
