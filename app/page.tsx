import { Button } from "@/components/ui/button";
import { Wind } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 pt-20 lg:pl-80">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-8 flex justify-center">
          <Wind className="h-16 w-16 text-primary" />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-primary sm:text-6xl">
          Urban Air Quality Platform
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Monitor air quality, predict pollution patterns, optimize routes, and plan urban development
          for a cleaner, healthier city.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/monitoring">View Air Quality</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/prediction">See Predictions</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}