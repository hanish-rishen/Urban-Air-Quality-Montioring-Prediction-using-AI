/**
 * Utility functions for API requests
 */

/**
 * Make a CORS-friendly API request with proper error handling
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns The response data
 */
export async function fetchWithCORS<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Set default options for better CORS handling
    const fetchOptions: RequestInit = {
      mode: "cors",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      ...options,
    };

    console.log(`Making request to: ${url}`);
    const response = await fetch(url, fetchOptions);

    // Check if the response is ok (status 200-299)
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

/**
 * Checks if the server is accessible and properly configured for CORS
 * @param apiUrl The base API URL to check
 * @returns True if the server is accessible
 */
export async function checkAPIConnection(apiUrl: string): Promise<boolean> {
  try {
    const testUrl = `${apiUrl}/debug-aqi`;
    console.log(`Testing API connection to: ${testUrl}`);

    const response = await fetch(testUrl, {
      method: "GET",
      mode: "cors",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      console.log("API connection successful");
      return true;
    } else {
      console.warn(`API connection failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error("API connection test failed:", error);
    return false;
  }
}
