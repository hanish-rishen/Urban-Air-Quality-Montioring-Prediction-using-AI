# UAQMP Frontend

## Air Quality Monitoring with Real-Time Data

This application displays real-time air quality data with beautiful visualizations including a trend line chart with blinking indicators for the latest readings.

### Data Flow

1. **Data Source**: The application fetches air quality data from our Hono backend API, which in turn gets data from the OpenWeather API.

2. **Data Refresh**:

   - Initial data loads when the page is first opened
   - Auto-refreshes every 5 minutes to keep the trend line updated
   - Manual refresh available via the "Refresh" button

3. **Visualization**:

   - Current AQI display with color-coded indicators
   - Component breakdown showing individual pollutants
   - Trend line chart showing AQI changes over time
   - Blinking dot indicating the latest measurement

4. **Sample Data**:
   - For development and first-load experience, the application includes sample data
   - This is replaced with real data once API calls begin returning results

### Interesting Features

- **Blinking Latest Point**: The most recent data point in the trend chart blinks to highlight new information
- **Color-Coding**: All AQI values are color-coded according to their health impact levels
- **Responsive Design**: All charts and displays adapt to different screen sizes
- **Live Updates**: Data refreshes automatically to provide real-time monitoring
#   U r b a n - A i r - Q u a l i t y - M o n t i o r i n g - P r e d i c t i o n - u s i n g - A I  
 