import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Trees, Factory, Wind } from "lucide-react";

export default function UrbanPlanningPage() {
  return (
    <div className="p-8 pt-20 lg:pt-8 lg:pl-80">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Urban Planning</h1>
        <p className="text-muted-foreground">
          Data-driven recommendations for urban development
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="p-6">
          <Building2 className="h-8 w-8 mb-4 text-primary" />
          <h3 className="font-semibold">Building Density</h3>
          <p className="text-2xl font-bold mt-2">45%</p>
          <p className="text-sm text-muted-foreground mt-1">Optimal: 40-50%</p>
        </Card>

        <Card className="p-6">
          <Trees className="h-8 w-8 mb-4 text-primary" />
          <h3 className="font-semibold">Green Spaces</h3>
          <p className="text-2xl font-bold mt-2">28%</p>
          <p className="text-sm text-muted-foreground mt-1">Target: 30%</p>
        </Card>

        <Card className="p-6">
          <Factory className="h-8 w-8 mb-4 text-primary" />
          <h3 className="font-semibold">Industrial Zones</h3>
          <p className="text-2xl font-bold mt-2">15%</p>
          <p className="text-sm text-muted-foreground mt-1">Within limits</p>
        </Card>

        <Card className="p-6">
          <Wind className="h-8 w-8 mb-4 text-primary" />
          <h3 className="font-semibold">Air Flow Score</h3>
          <p className="text-2xl font-bold mt-2">8.4/10</p>
          <p className="text-sm text-muted-foreground mt-1">Good ventilation</p>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Development Impact</h3>
          <div className="h-[300px] flex items-center justify-center border rounded-lg mb-4">
            <p className="text-muted-foreground">
              Impact visualization coming soon
            </p>
          </div>
          <Button className="w-full">Generate Impact Report</Button>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
          <div className="space-y-4">
            <div className="p-4 bg-accent rounded-lg">
              <h4 className="font-medium">Increase Green Corridors</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Add 2% more green spaces along major roads to improve air flow
              </p>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <h4 className="font-medium">Building Height Optimization</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Adjust building heights in district A to improve ventilation
              </p>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <h4 className="font-medium">Traffic Flow Restructuring</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Implement one-way system in high-congestion areas
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
