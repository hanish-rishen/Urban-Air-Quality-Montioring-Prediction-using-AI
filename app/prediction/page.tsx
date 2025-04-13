import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export default function PredictionPage() {
  return (
    <div className="p-8 pt-20 lg:pt-8 lg:pl-80">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Air Quality Prediction</h1>
        <p className="text-muted-foreground">
          Forecast and analyze future air quality patterns
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">24-Hour Forecast</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <span>Tomorrow, 9 AM</span>
              </div>
              <span className="font-semibold">42 AQI</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <span>Tomorrow, 3 PM</span>
              </div>
              <span className="font-semibold">55 AQI</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Weekly Outlook</h3>
          <div className="h-[200px] flex items-center justify-center border rounded-lg mb-4">
            <p className="text-muted-foreground">
              Weekly prediction chart coming soon
            </p>
          </div>
          <Button className="w-full">Generate Detailed Report</Button>
        </Card>
      </div>
    </div>
  );
}
