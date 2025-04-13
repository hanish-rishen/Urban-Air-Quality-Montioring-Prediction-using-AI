"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { AlertCircle, ExternalLink, RefreshCcw } from "lucide-react";
import { Button } from "./button";

interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  url: string;
  date: string;
}

interface YouTubeVideo {
  title: string;
  channelName: string;
  url: string;
  thumbnailUrl: string;
}

interface NewsProps {
  location: string;
}

export function NewsSection({ location }: NewsProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Fetching news for location: ${location}`);

      // Get current AQI from localStorage if available
      const currentAQI = localStorage.getItem("currentAQI");
      const currentAQILevel = localStorage.getItem("currentAQILevel");

      // Build the URL with current AQI if available
      let url = `http://localhost:3001/api/news/air-quality?location=${encodeURIComponent(
        location
      )}`;
      if (currentAQI && currentAQILevel) {
        url += `&aqi=${currentAQI}&level=${encodeURIComponent(
          currentAQILevel
        )}`;
      }

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
        setArticles([]);
      }

      if (data.videos && Array.isArray(data.videos)) {
        setVideos(data.videos);
      } else {
        console.warn("Invalid videos data received");
        setVideos([]);
      }

      // Set AI summary
      if (data.aiSummary) {
        setAiSummary(data.aiSummary);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching news data:", err);
      setError("Failed to load news. Please try again later.");
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
  if (loading && articles.length === 0 && videos.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Air Quality News</CardTitle>
          <CardDescription>
            Loading latest news and resources...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-48">
            <RefreshCcw className="w-8 h-8 animate-spin text-muted-foreground" />
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
            Latest information about air quality{" "}
            {location !== "global" ? `in ${location}` : "worldwide"}
            {lastUpdated && ` · Updated at ${lastUpdated}`}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchNews}
          disabled={loading}
        >
          {loading ? (
            <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ai-summary">
          <TabsList className="mb-4">
            <TabsTrigger value="ai-summary">AI Summary</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
          </TabsList>

          <TabsContent value="ai-summary" className="space-y-4">
            {error && (
              <div className="bg-destructive/10 p-3 rounded-md flex items-start gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>AI-Generated Air Quality Summary</CardTitle>
                <CardDescription>
                  Generated by Google Gemini based on OpenWeather data and news
                  articles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {aiSummary ? (
                  <div className="prose prose-sm dark:prose-invert">
                    <p className="leading-relaxed text-justify">{aiSummary}</p>
                    <div className="mt-4 text-xs text-muted-foreground">
                      <p className="italic">
                        This summary is generated by AI and may not be
                        completely accurate. Please refer to official sources
                        for critical information.
                      </p>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
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
                    <h3 className="text-lg font-semibold mb-2">
                      {article.title}
                    </h3>
                    <p className="text-muted-foreground mb-3 text-sm">
                      {article.summary}
                    </p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">{article.source}</span>
                        <span className="mx-1">•</span>
                        <span>{article.date}</span>
                      </div>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary hover:underline"
                      >
                        Read more
                        <ExternalLink className="ml-1 w-3 h-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
