# Vanilla PHP Weather App

A simple, functional weather application built from scratch using HTML, CSS, Vanilla JavaScript, and a PHP backend proxy with file-based caching. This project does not use any frontend or backend frameworks.

## Features

- **Search:** Look up current weather data by city name.
- **Data Display:** Shows temperature, feels like, humidity, wind speed, condition description, and OpenWeatherMap icons.
- **Recent Searches:** Stores the last 5 distinct cities in your browser's `localStorage` for quick access.
- **Caching:** The PHP backend caches API responses for 10 minutes in the `/cache` directory to prevent rate-limiting and improve speed.
- **Error Handling:** Gracefully handles invalid city names or network issues, displaying clear UI error messages.
- **Responsive Design:** Mobile-friendly, clean CSS layout using CSS flexbox.

## Prerequisites

- A local web server with PHP installed (e.g., PHP built-in server, XAMPP, MAMP).
- An API key from [OpenWeatherMap](https://openweathermap.org/api) (Current Weather Data API).

## Installation & Setup

1. **Clone or download** this repository.
2. **Configure API Key:**
    - Create your local env file from the example:
       ```bash
       cp .env.example .env
       ```
    - Open `.env` and set your key:
       ```env
       OPENWEATHERMAP_API_KEY=your_actual_api_key_here
       ```

3. **Start a local PHP server:**
   - Open your terminal or command prompt.
   - Navigate to the `weather-app` directory.
   - Run the following command:
     ```bash
     php -S localhost:8000
     ```

4. **Run the App:**
   - Open a web browser and navigate to `http://localhost:8000`.

## Directory Structure

```text
weather-app/
├── index.html       # The main application UI
├── style.css        # Stylesheet for layout and clean design
├── script.js        # Vanilla JS for DOM manipulation, fetching, and local storage
├── api.php          # PHP backend routing requests to OpenWeatherMap and handling caching
├── .env.example     # Example environment variables (safe to commit)
├── cache/           # Directory where JSON cache files are stored
└── README.md        # This documentation file
```

## How It Works

1. **Frontend Request:** When a user submits a city, `script.js` makes a GET request to `api.php?city=CityName`.
2. **Backend Processing:**
   - `api.php` sanitizes the input.
   - It checks the `cache/` directory to see if a valid JSON file (less than 10 minutes old) exists for that city.
   - If a valid cache exists, it serves the data from the file (cache hit), adding a `source: cache` flag to the response padding.
   - If no cache exists or it has expired, PHP requests the data from `api.openweathermap.org`.
   - The fresh data is returned to the frontend and saved to the `/cache` folder for future requests.
3. **Frontend Rendering:** `script.js` parses the JSON, updates the DOM with the new weather information, and saves the successful search to `localStorage`.
