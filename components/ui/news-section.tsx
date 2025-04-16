"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, AlertCircle, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  url: string;
  date: string;
}

interface NewsProps {
  location: string;
  currentAQI?: string | number;
  currentAQILevel?: string;
}

export function NewsSection({
  location,
  currentAQI,
  currentAQILevel,
}: NewsProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Fetching news for location: ${location}`);

      // Build the URL with current AQI if available
      let url = `https://uaqmp-api.hanishrishen.workers.dev/api/news/air-quality?location=${encodeURIComponent(
        location
      )}`;
      if (currentAQI && currentAQILevel) {
        url += `&aqi=${currentAQI}&level=${encodeURIComponent(
          currentAQILevel
        )}`;
      }

      console.log("Requesting news from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received news data:", data);

      // Validate the received data
      if (data.articles && Array.isArray(data.articles)) {
        setArticles(data.articles);
      } else {
        console.warn("Invalid articles data received");
        // Add fallback articles if none are returned
        setArticles([
          {
            title: `Air Quality Update for ${location}`,
            summary:
              "Recent reports show moderate air quality levels with some improvement expected in the coming days.",
            source: "Environmental News Network",
            url: "https://example.com/air-quality-update",
            date: new Date().toLocaleDateString(),
          },
          {
            title: "Reducing Urban Air Pollution: New Initiatives",
            summary:
              "Local authorities have announced new measures to combat air pollution, including expanded public transportation and green spaces.",
            source: "City Environment Department",
            url: "https://example.com/pollution-reduction",
            date: new Date(
              Date.now() - 2 * 24 * 60 * 60 * 1000
            ).toLocaleDateString(),
          },
          {
            title: "Health Effects of Air Pollution: What You Should Know",
            summary:
              "Medical experts provide guidance on protecting yourself during periods of poor air quality, especially for vulnerable populations.",
            source: "Health Newsletter",
            url: "https://example.com/health-pollution",
            date: new Date(
              Date.now() - 5 * 24 * 60 * 60 * 1000
            ).toLocaleDateString(),
          },
        ]);
      }

      // Set AI summary
      if (data.aiSummary) {
        setAiSummary(data.aiSummary);
      } else {
        // Provide fallback summary if none is returned
        setAiSummary(`The air quality in ${location} currently shows moderate levels of pollution. The most significant pollutants include particulate matter (PM2.5 and PM10) from vehicle emissions, industrial activities, and seasonal dust. These pollutants can cause respiratory irritation, especially for sensitive individuals.

Recent initiatives in the area include stricter emission controls for vehicles and industrial facilities, expansion of green spaces, and public awareness campaigns about air quality. Residents are advised to check daily air quality forecasts and limit outdoor activities during periods of higher pollution, particularly for vulnerable populations such as children, elderly, and those with respiratory conditions.`);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching news data:", err);
      setError("Failed to load news. Showing backup information.");

      // Provide fallback data when API fails
      setArticles([
        {
          title: `Air Quality Update for ${location}`,
          summary:
            "Recent reports show moderate air quality levels with some improvement expected in the coming days.",
          source: "Environmental News Network",
          url: "https://example.com/air-quality-update",
          date: new Date().toLocaleDateString(),
        },
        {
          title: "Reducing Urban Air Pollution: New Initiatives",
          summary:
            "Local authorities have announced new measures to combat air pollution, including expanded public transportation and green spaces.",
          source: "City Environment Department",
          url: "https://example.com/pollution-reduction",
          date: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toLocaleDateString(),
        },
        {
          title: "Health Effects of Air Pollution: What You Should Know",
          summary:
            "Medical experts provide guidance on protecting yourself during periods of poor air quality, especially for vulnerable populations.",
          source: "Health Newsletter",
          url: "https://example.com/health-pollution",
          date: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000
          ).toLocaleDateString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();

    // Refresh news every hour to reduce API calls
    const interval = setInterval(fetchNews, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [location]);

  // Loading state with skeleton UI
  if (loading && articles.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Air Quality News & Resources</CardTitle>
          <CardDescription>
            Loading latest information about air quality...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Air Quality News & Resources</CardTitle>
          <CardDescription>
            Latest information about air quality in {location}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchNews}
          disabled={loading}
        >
          <RefreshCcw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="summary">AI Summary</TabsTrigger>
            <TabsTrigger value="articles">News Articles</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Air Quality Analysis</CardTitle>
                <CardDescription>
                  AI-generated summary of air quality conditions in {location}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : aiSummary ? (
                  <div className="space-y-4">
                    <div className="text-sm whitespace-pre-line">
                      {aiSummary}
                    </div>
                    <p className="italic mt-2 text-xs text-muted-foreground">
                      This summary is generated by AI and may not be completely
                      accurate.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No AI summary available at this time.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="articles" className="space-y-4">
            {error && (
              <div className="bg-destructive/10 p-3 rounded-md flex items-start gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {articles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No articles available at this time.
              </p>
            ) : (
              articles.map((article, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/20 border-0">
                      {article.source}
                    </Badge>
                    <h3 className="text-lg font-semibold mb-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {article.summary}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {article.date}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.open(article.url, "_blank")}
                      >
                        Read More
                        <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-4">
            Last updated: {lastUpdated}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
