import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export default function RouteOptimizerPage() {
  return (
    <div className="p-8 pt-20 lg:pt-8 lg:pl-80">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Route Optimizer</h1>
        <p className="text-muted-foreground">
          Find the healthiest routes for your journey
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Route Planner</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Start Location
                </label>
                <div className="flex gap-2">
                  <Input placeholder="Enter start point" />
                  <Button variant="outline" size="icon">
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Destination
                </label>
                <div className="flex gap-2">
                  <Input placeholder="Enter destination" />
                  <Button variant="outline" size="icon">
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button className="w-full">Find Best Route</Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Route Map</h3>
            <div className="h-[400px] flex items-center justify-center border rounded-lg">
              <p className="text-muted-foreground">
                Interactive map coming soon
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
