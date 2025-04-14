"use client";

import { useEffect, useState } from "react";
import { predictionApi } from "@/services/prediction-api";

export function useMLModel() {
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [modelSteps, setModelSteps] = useState<
    { step: string; completed: boolean }[]
  >([
    { step: "Initializing TensorFlow.js", completed: false },
    { step: "Loading model architecture", completed: false },
    { step: "Generating training data", completed: false },
    { step: "Training model", completed: false },
    { step: "Saving model", completed: false },
  ]);

  const updateStep = (stepIndex: number, completed: boolean) => {
    setModelSteps((currentSteps) =>
      currentSteps.map((step, idx) =>
        idx === stepIndex ? { ...step, completed } : step
      )
    );
  };

  useEffect(() => {
    let isMounted = true;

    async function initializeModel() {
      try {
        if (!isMounted) return;
        setModelStatus("loading");
        console.log("Initializing ML model...");

        // Step 1: Initialize TensorFlow.js
        updateStep(0, false);
        await new Promise((r) => setTimeout(r, 800)); // Simulate loading time
        updateStep(0, true);

        // Step 2: Load model architecture
        updateStep(1, false);
        await new Promise((r) => setTimeout(r, 600));
        updateStep(1, true);

        // Step 3: Generate training data
        updateStep(2, false);
        await new Promise((r) => setTimeout(r, 700));
        updateStep(2, true);

        // Step 4: Train model
        updateStep(3, false);
        const success = await predictionApi.initModels();
        updateStep(3, true);

        // Step 5: Save model
        updateStep(4, false);
        await new Promise((r) => setTimeout(r, 500));
        updateStep(4, true);

        if (!isMounted) return;
        setModelStatus(success ? "ready" : "error");
        console.log(
          `Model initialization ${success ? "successful" : "failed"}`
        );
      } catch (e) {
        console.error("Failed to initialize ML model:", e);
        if (isMounted) setModelStatus("error");
      }
    }

    initializeModel();

    return () => {
      isMounted = false;
    };
  }, []);

  return { modelStatus, setModelStatus, modelSteps };
}
