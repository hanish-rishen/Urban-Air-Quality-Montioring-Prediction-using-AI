"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { useEffect, useState } from "react";

interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
  color?: string;
}

interface LineChartProps {
  title: string;
  description?: string;
  data: TimeSeriesPoint[];
  valueLabel: string;
  colors?: {
    stroke: string;
    gradient: {
      from: string;
      to: string;
    };
  };
  height?: number;
}

export function LineChartCard({
  title,
  description,
  data,
  valueLabel,
  colors = {
    stroke: "hsl(var(--primary))",
    gradient: {
      from: "hsl(var(--primary)/.15)",
      to: "hsl(var(--background))",
    },
  },
  height = 300,
}: LineChartProps) {
  const [blinkingDot, setBlinkingDot] = useState(true);

  // Blink effect for the latest data point
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkingDot((prev) => !prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format data for the chart and ensure it's sorted by timestamp
  const chartData = [...data]
    .sort((a, b) => a.timestamp - b.timestamp) // Sort by timestamp ascending
    .map((point, index, sortedArray) => ({
      time: new Date(point.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      originalTimestamp: point.timestamp, // Keep the original timestamp for debugging
      value: point.value,
      label: point.label,
      color: point.color,
      isLatest: index === sortedArray.length - 1, // Flag for the latest point after sorting
    }));

  // Custom dot component that adds blinking effect to the latest data point
  const CustomDot = ({
    cx,
    cy,
    stroke,
    isLatest,
    color,
    dataKey,
    payload,
    ...restProps
  }: any) => {
    // Destructure dataKey and payload separately to prevent them from being passed to the DOM element

    if (isLatest) {
      return (
        <>
          {/* Regular dot - without passing dataKey to SVG element */}
          <circle
            cx={cx}
            cy={cy}
            r={4}
            stroke={color || stroke}
            strokeWidth={2}
            fill="hsl(var(--background))"
            {...restProps} // All other props except those already destructured
          />
          {/* Pulsing overlay dot for the latest point */}
          {blinkingDot && (
            <circle
              cx={cx}
              cy={cy}
              r={8}
              stroke="transparent"
              fill={color || stroke}
              fillOpacity={0.3}
              style={{ transition: "all 0.3s ease" }}
            />
          )}
        </>
      );
    }

    // Regular dots for historical data - without passing dataKey to SVG element
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        stroke={color || stroke}
        strokeWidth={2}
        fill="hsl(var(--background))"
        {...restProps}
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="time"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Time
                          </span>
                          <span className="font-bold text-sm">{data.time}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {valueLabel}
                          </span>
                          <span className="font-bold text-sm">
                            {data.value}
                          </span>
                        </div>
                        {data.label && (
                          <div className="col-span-2 flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Status
                            </span>
                            <span className="font-bold text-sm">
                              {data.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors.stroke}
              strokeWidth={2}
              dot={(props) => {
                // Extract key and other Recharts-specific props that shouldn't be passed to DOM
                const { key, dataKey, payload, ...restProps } = props;
                return (
                  <CustomDot
                    key={key}
                    isLatest={restProps.index === chartData.length - 1}
                    {...restProps}
                  />
                );
              }}
              activeDot={{
                r: 6,
                strokeWidth: 0,
                fill: colors.stroke,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
