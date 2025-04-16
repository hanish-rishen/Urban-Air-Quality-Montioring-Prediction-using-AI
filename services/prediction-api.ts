import axios from "axios";
import * as tf from "@tensorflow/tfjs";
import { fetchWithCORS } from "@/utils/api-helpers";

// Constants
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://uaqmp-api.hanishrishen.workers.dev/api";
const MODEL_STORAGE_KEY = "aqi-prediction-model";

// Track model and training state
let tfModel: tf.LayersModel | null = null;
let modelStatus = "Not initialized";
let modelTrainingMetrics = {
  epoch: [] as number[],
  loss: [] as number[],
  accuracy: [] as number[],
};

// Interface for prediction results
interface PredictionResult {
  timestamp: number;
  aqi: number;
  confidence?: number;
  components?: Record<string, number>;
}

// Define interfaces for API responses to fix type errors
interface AqiResponse {
  aqi: number;
  level?: string;
  components?: Record<string, number>;
  [key: string]: any;
}

interface WeatherResponse {
  weather?: Array<{
    main: string;
    description: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

// Initialize and potentially load cached model
export const predictionApi = {
  // Initialize models - returns true if successful
  async initModels(): Promise<boolean> {
    try {
      console.log("Initializing prediction models...");
      modelStatus = "Initializing";

      // Try to load from localStorage first
      const cachedModel = localStorage.getItem(MODEL_STORAGE_KEY);
      if (cachedModel) {
        try {
          console.log("Loading model from localStorage");
          tfModel = await tf.loadLayersModel(
            `localstorage://${MODEL_STORAGE_KEY}`
          );
          console.log("Model loaded from localStorage", tfModel);
          modelStatus = "Running TensorFlow.js client models";
          return true;
        } catch (loadError) {
          console.warn("Failed to load model from storage:", loadError);
          localStorage.removeItem(MODEL_STORAGE_KEY);
        }
      }

      // Create and train a basic model for demo purposes
      console.log("Creating and training basic TensorFlow.js model");
      const model = tf.sequential();
      model.add(
        tf.layers.dense({
          inputShape: [6],
          units: 12,
          activation: "relu",
          kernelInitializer: "heNormal",
        })
      );
      model.add(tf.layers.dropout({ rate: 0.2 }));
      model.add(
        tf.layers.dense({
          units: 8,
          activation: "relu",
          kernelInitializer: "heNormal",
        })
      );
      model.add(tf.layers.dense({ units: 1 }));

      // Compile model
      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: "meanSquaredError",
        metrics: ["mse"],
      });

      // Generate synthetic training data
      const numSamples = 100;
      const xs = Array(numSamples)
        .fill(0)
        .map(() => [
          Math.random(), // hour normalized
          Math.random(), // day
          Math.random(), // month
          Math.random() > 0.7 ? 1 : 0, // isRushHour
          Math.random(), // prevAQI
          Math.random() * 2, // weather factor
        ]);
      const ys = xs.map(
        (x) =>
          [
            // Basic formula that relates features to AQI
            x[0] * 20 + // hour contribution
              x[1] * 5 + // day contribution
              x[2] * 15 + // month/season contribution
              x[3] * 40 + // rush hour has big impact
              x[4] * 80 + // previous AQI has biggest impact
              (x[5] > 1 ? 20 : -10) + // weather impact
              Math.random() * 10, // random noise
          ].map((v) => v / 150) // Normalize
      );

      // Store intermediate metrics during training
      const epochs = 50;
      modelTrainingMetrics = {
        epoch: Array(epochs)
          .fill(0)
          .map((_, i) => i + 1),
        loss: [],
        accuracy: [],
      };

      // Train the model
      await model.fit(tf.tensor2d(xs), tf.tensor2d(ys), {
        epochs,
        batchSize: 10,
        shuffle: true,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (logs) {
              // Update metrics after each epoch
              modelTrainingMetrics.loss.push(logs.loss as number);
              // Convert MSE to a pseudo-accuracy for visualization
              const pseudoAccuracy = Math.max(
                0,
                1 - (logs.loss as number) * 10
              );
              modelTrainingMetrics.accuracy.push(pseudoAccuracy);
            }
          },
        },
      });

      // Save model to localStorage
      try {
        await model.save(`localstorage://${MODEL_STORAGE_KEY}`);
        console.log("Model saved to localStorage");
      } catch (saveError) {
        console.warn("Failed to save model to localStorage:", saveError);
      }

      tfModel = model;
      modelStatus = "Running TensorFlow.js client models";
      return true;
    } catch (e) {
      console.error("Failed to initialize prediction models:", e);
      modelStatus = "Initialization failed";
      return false;
    }
  },

  // Return current model information
  getModelInformation(): { status: string } {
    return { status: modelStatus };
  },

  // Return training metrics for UI visualization
  getTrainingMetrics(): {
    epoch: number[];
    loss: number[];
    accuracy: number[];
  } {
    return modelTrainingMetrics;
  },

  // Make hourly predictions for next 24 hours
  async getHourlyPredictions(
    lat?: string,
    lon?: string
  ): Promise<PredictionResult[]> {
    try {
      // Prefer TensorFlow.js model if available
      if (tfModel) {
        return predictWithTensorFlow("hourly", lat, lon);
      }

      // Fallback to API (use correct API_BASE_URL)
      console.log("Using API for hourly predictions");
      const response = await axios.get(
        `${API_BASE_URL}/predict/hourly?lat=${lat || ""}&lon=${lon || ""}`
      );
      return response.data;
    } catch (e) {
      console.error("Error getting hourly predictions:", e);
      // Fallback to local data generation
      return generateFallbackHourlyPredictions();
    }
  },

  // Make weekly predictions for next 7 days
  async getWeeklyPredictions(
    lat?: string,
    lon?: string
  ): Promise<PredictionResult[]> {
    try {
      // Prefer TensorFlow.js model if available
      if (tfModel) {
        return predictWithTensorFlow("weekly", lat, lon);
      }

      // Fallback to API (use correct API_BASE_URL)
      console.log("Using API for weekly predictions");
      const response = await axios.get(
        `${API_BASE_URL}/predict/weekly?lat=${lat || ""}&lon=${lon || ""}`
      );
      return response.data;
    } catch (e) {
      console.error("Error getting weekly predictions:", e);
      // Fallback to local data generation
      return generateFallbackWeeklyPredictions();
    }
  },
};

/**
 * Make predictions using TensorFlow.js models with improved transparency
 */
async function predictWithTensorFlow(
  type: "hourly" | "weekly",
  lat?: string,
  lon?: string
): Promise<PredictionResult[]> {
  const predictions: PredictionResult[] = [];
  const now = Date.now();
  let currentAQI = 50; // Default starting point - moved outside the try block to fix scope issue

  try {
    // Get current air quality as baseline
    let weatherFactor = 1.0;
    let weatherDescription = "Unknown";

    try {
      // Try to get current AQI data
      console.log(
        `Fetching current AQI for ${lat}, ${lon} from ${API_BASE_URL}/current`
      );

      const aqiResponse = await fetchWithCORS<AqiResponse>(
        `${API_BASE_URL}/current?lat=${lat}&lon=${lon}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (aqiResponse && aqiResponse.aqi) {
        currentAQI = aqiResponse.aqi;
        console.log(`Current AQI data successfully retrieved: ${currentAQI}`);
      } else {
        console.warn(
          "Current AQI data response didn't contain AQI value:",
          aqiResponse
        );
      }
    } catch (e) {
      console.error("Error fetching current AQI data:", e);
    }

    // Get weather factor (simplified)
    try {
      // Use OpenWeather directly for simplicity if AQI call doesn't provide weather
      const weatherResponse = await fetchWithCORS<WeatherResponse>(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}`
      );

      if (
        weatherResponse &&
        weatherResponse.weather &&
        weatherResponse.weather.length > 0
      ) {
        const weather = weatherResponse.weather[0];
        weatherDescription = weather.main;

        // Adjust factor based on weather conditions
        if (weather.main === "Rain" || weather.main === "Drizzle") {
          weatherFactor = 0.8; // Rain tends to clear pollution
        } else if (weather.main === "Thunderstorm") {
          weatherFactor = 0.7; // Storms clear air more
        } else if (weather.main === "Snow") {
          weatherFactor = 0.85;
        } else if (weather.main === "Clear") {
          weatherFactor = 1.1; // Clear skies can allow more solar radiation = more ozone
        } else if (weather.main === "Mist" || weather.main === "Fog") {
          weatherFactor = 1.2; // Traps pollution
        }
      }
    } catch (e) {
      console.log("Weather data unavailable, using default factor", e);
    }

    // Determine intervals based on prediction type
    const count = type === "hourly" ? 24 : 7;
    const interval = type === "hourly" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // Use client-side model
    if (!tfModel) {
      throw new Error("TensorFlow model not initialized");
    }

    // Components will be relative to the AQI
    const getBaseComponents = (aqi: number) => ({
      pm25: aqi * 0.4 + Math.random() * 5,
      pm10: aqi * 0.6 + Math.random() * 8,
      o3: aqi / 3 + Math.random() * 10,
      no2: aqi / 5 + Math.random() * 6,
    });

    // Create predictions with TensorFlow.js model
    for (let i = 0; i < count; i++) {
      const timestamp = now + i * interval;
      const date = new Date(timestamp);

      // Extract features
      const hour = date.getHours() / 24; // Normalize hour
      const day = date.getDay() / 7; // Normalize day of week
      const month = date.getMonth() / 12; // Normalize month

      // Is this rush hour?
      const isRushHour =
        (date.getHours() >= 7 && date.getHours() <= 9) ||
        (date.getHours() >= 16 && date.getHours() <= 18)
          ? 1
          : 0;

      // Previous AQI (or initial value for first prediction)
      const prevAQI = i === 0 ? currentAQI / 300 : predictions[i - 1].aqi / 300; // Normalize

      // Input tensor with features
      const input = tf.tensor2d([
        [hour, day, month, isRushHour, prevAQI, weatherFactor],
      ]);

      // Make prediction
      const prediction = tfModel.predict(input) as tf.Tensor;
      let predictedValue = prediction.dataSync()[0] * 150; // Denormalize

      // Add realistic constraints and variations
      predictedValue = applyConstraints(predictedValue, currentAQI, i, type);

      // Higher confidence for near-term predictions
      const confidence =
        type === "hourly"
          ? Math.max(0.5, 1 - i * 0.02) // Hourly confidence starts higher, decays slower
          : Math.max(0.3, 1 - i * 0.1); // Weekly confidence starts lower, decays faster

      // Add to predictions array
      predictions.push({
        timestamp,
        aqi: Math.round(predictedValue),
        confidence,
        components: getBaseComponents(predictedValue),
      });

      // Clean up tensors
      input.dispose();
      prediction.dispose();
    }

    console.log(`TensorFlow.js generated ${count} ${type} predictions`);
    return predictions;
  } catch (e) {
    console.error("Error making TensorFlow predictions:", e);

    // Now currentAQI is in scope for the fallback functions
    return type === "hourly"
      ? generateFallbackHourlyPredictions(currentAQI)
      : generateFallbackWeeklyPredictions(currentAQI);
  }
}

// Apply realistic constraints to predictions
function applyConstraints(
  value: number,
  baseline: number,
  index: number,
  type: "hourly" | "weekly"
): number {
  // Cap maximum change per interval
  const maxChangePercent = type === "hourly" ? 0.15 : 0.3;

  // Calculate max change allowed
  const maxChange = baseline * maxChangePercent;

  // Limit the change compared to baseline
  let constrainedValue = Math.max(value, baseline - maxChange);
  constrainedValue = Math.min(constrainedValue, baseline + maxChange);

  // Ensure the value is within realistic AQI range
  constrainedValue = Math.max(5, constrainedValue); // Min AQI of 5
  constrainedValue = Math.min(500, constrainedValue); // Max AQI of 500

  // Reduce the random variation for more consistent results across location changes
  constrainedValue += (Math.random() - 0.5) * 4; // Reduced from 8 to 4

  return constrainedValue;
}

// Generate fallback hourly predictions if the models or API fail
function generateFallbackHourlyPredictions(baseAQI = 50): PredictionResult[] {
  console.log(`Generating fallback hourly predictions with baseAQI=${baseAQI}`);
  const predictions: PredictionResult[] = [];
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  // Create a more variable pattern by getting base from local storage or random value
  // This helps prevent the "stuck at 75" problem when using fallbacks
  let dynamicBaseAQI = baseAQI;
  try {
    // Try to get a previous AQI value from local storage to provide variety
    const storedAQI = localStorage.getItem("lastAQIValue");
    if (storedAQI) {
      const parsedAQI = parseInt(storedAQI, 10);
      if (!isNaN(parsedAQI) && parsedAQI > 0) {
        // Add some randomness to avoid getting stuck on the same value
        dynamicBaseAQI = parsedAQI + (Math.random() * 20 - 10);
      }
    } else {
      // If no stored value, add more randomness to the base value
      dynamicBaseAQI = baseAQI + (Math.random() * 30 - 15);
    }
  } catch (e) {
    console.log("Error accessing localStorage for AQI values:", e);
  }

  // Ensure the base AQI is within realistic bounds
  dynamicBaseAQI = Math.max(25, Math.min(150, dynamicBaseAQI));

  // Save this new base value for future reference
  try {
    localStorage.setItem("lastAQIValue", Math.round(dynamicBaseAQI).toString());
  } catch (e) {
    // Ignore storage errors
  }

  // Create a realistic pattern with morning and evening peaks
  for (let i = 0; i < 24; i++) {
    const timestamp = now + i * hourMs;
    const date = new Date(timestamp);
    const hour = date.getHours();

    // Model typical daily patterns with higher values during rush hours
    // Morning rush hour
    const isMorningRush = hour >= 7 && hour <= 9;
    // Evening rush hour
    const isEveningRush = hour >= 16 && hour <= 19;
    // Night time with typically lower values
    const isNight = hour >= 22 || hour <= 5;

    let adjustedAQI = dynamicBaseAQI;
    if (isMorningRush) {
      adjustedAQI *= 1.3; // 30% higher during morning rush
    } else if (isEveningRush) {
      adjustedAQI *= 1.4; // 40% higher during evening rush
    } else if (isNight) {
      adjustedAQI *= 0.7; // 30% lower during night
    }

    // Add some randomness
    adjustedAQI += (Math.random() - 0.5) * 15;

    // Ensure AQI is in valid range
    adjustedAQI = Math.max(0, Math.min(500, adjustedAQI));

    // Decreasing confidence as we predict further into the future
    const confidence = Math.max(0.5, 1 - i * 0.02);

    predictions.push({
      timestamp,
      aqi: Math.round(adjustedAQI),
      confidence,
      components: {
        pm25: adjustedAQI * 0.4 + Math.random() * 5,
        pm10: adjustedAQI * 0.6 + Math.random() * 8,
        o3: adjustedAQI / 3 + Math.random() * 10,
        no2: adjustedAQI / 5 + Math.random() * 6,
      },
    });
  }

  return predictions;
}

// Generate fallback weekly predictions if the models or API fail
function generateFallbackWeeklyPredictions(baseAQI = 50): PredictionResult[] {
  console.log(`Generating fallback weekly predictions with baseAQI=${baseAQI}`);
  const predictions: PredictionResult[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Create a more variable base AQI similar to the hourly function
  let dynamicBaseAQI = baseAQI;
  try {
    const storedAQI = localStorage.getItem("lastAQIValue");
    if (storedAQI) {
      const parsedAQI = parseInt(storedAQI, 10);
      if (!isNaN(parsedAQI) && parsedAQI > 0) {
        // Ensure AQI is in valid range
        dynamicBaseAQI = parsedAQI + (Math.random() * 30 - 15);
      }
    } else {
      dynamicBaseAQI = baseAQI + (Math.random() * 40 - 20);
    }
  } catch (e) {
    // Ignore storage errors
  }

  // Ensure the base AQI is within realistic bounds
  dynamicBaseAQI = Math.max(25, Math.min(150, dynamicBaseAQI));

  // Create a realistic weekly pattern
  for (let i = 0; i < 7; i++) {
    const timestamp = now + i * dayMs;
    const date = new Date(timestamp);
    const day = date.getDay();

    // Apply weekly patterns - weekdays typically have higher pollution
    let adjustedAQI = dynamicBaseAQI;
    if (day >= 1 && day <= 5) {
      // Weekday
      adjustedAQI *= 1.2; // 20% higher on weekdays
    } else {
      // Weekend
      adjustedAQI *= 0.9; // 10% lower on weekends
    }

    // Add trend and randomness
    const trendFactor = 1 + (i - 3) * 0.05; // Slight trend up or down over the week
    adjustedAQI *= trendFactor;
    adjustedAQI += (Math.random() - 0.5) * 20; // More randomness for weekly predictions

    // Ensure AQI is in valid range
    adjustedAQI = Math.max(0, Math.min(500, adjustedAQI));

    // Decreasing confidence as we predict further into the future
    const confidence = Math.max(0.3, 1 - i * 0.1);

    predictions.push({
      timestamp,
      aqi: Math.round(adjustedAQI),
      confidence,
      components: {
        pm25: adjustedAQI * 0.4 + Math.random() * 5,
        pm10: adjustedAQI * 0.6 + Math.random() * 8,
        o3: adjustedAQI / 3 + Math.random() * 10,
        no2: adjustedAQI / 5 + Math.random() * 6,
      },
    });
  }

  return predictions;
}
