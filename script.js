document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const cityInput = document.getElementById('city-input');
    const autocompleteList = document.getElementById('autocomplete-list');
    const searchBtn = document.getElementById('search-btn');
    const recentChipsContainer = document.getElementById('recent-chips');

    const weatherCard = document.getElementById('weather-card');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const loadingContainer = document.getElementById('loading-container');

    const cityNameEl = document.getElementById('city-name');
    const weatherDescEl = document.getElementById('weather-desc');
    const weatherIconEl = document.getElementById('weather-icon');
    const temperatureEl = document.getElementById('temperature');
    const feelsLikeEl = document.getElementById('feels-like');
    const humidityEl = document.getElementById('humidity');
    const windSpeedEl = document.getElementById('wind-speed');

    const RECENT_SEARCHES_KEY = 'weatherApp_recentSearches';

    renderRecentSearches();

    let debounceTimer;

    cityInput.addEventListener('input', function () {
        const val = this.value.trim();
        closeAllLists();
        if (!val) { return false; }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchCitySuggestions(val);
        }, 300); // 300ms debounce
    });

    async function fetchCitySuggestions(query) {
        try {
            const response = await fetch(`api.php?action=geocode&city=${encodeURIComponent(query)}`);
            if (!response.ok) return;
            const data = await response.json();

            if (data && data.length > 0) {
                renderAutocomplete(data, query);
            }
        } catch (error) {
            console.error("Geocoding error:", error);
        }
    }

    function renderAutocomplete(cities, query) {
        autocompleteList.innerHTML = '';
        cities.forEach(cityData => {
            const div = document.createElement('div');

            const cityName = cityData.name;
            const state = cityData.state ? `${cityData.state}, ` : '';
            const country = cityData.country;

            const regex = new RegExp(`(${query})`, "gi");
            div.innerHTML = cityName.replace(regex, "<strong>$1</strong>");
            div.innerHTML += `<span class="state-country">${state}${country}</span>`;

            // Hidden input to hold absolute value
            div.innerHTML += `<input type='hidden' value='${cityName}'>`;

            div.addEventListener('click', function (e) {
                cityInput.value = this.getElementsByTagName("input")[0].value;
                closeAllLists();
                fetchWeather(cityInput.value);
            });

            autocompleteList.appendChild(div);
        });
        autocompleteList.classList.remove('hidden');
    }

    function closeAllLists() {
        autocompleteList.classList.add('hidden');
        autocompleteList.innerHTML = '';
    }

    // Close on click outside
    document.addEventListener("click", function (e) {
        if (e.target !== cityInput && e.target !== autocompleteList) {
            closeAllLists();
        }
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = cityInput.value.trim();
        if (city) {
            closeAllLists();
            fetchWeather(city);
        }
    });

    /**
     * Fetch weather data from the PHP backend API
     * @param {string} city - The city name to search for
     */
    async function fetchWeather(city) {
        showLoading();

        try {
            const response = await fetch(`api.php?city=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error fetching weather data.');
            }

            displayWeather(data);
            saveRecentSearch(data.name);
            renderRecentSearches();

        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    }

    /**
     * Update the DOM with weather data
     * @param {Object} data - The JSON response from OpenWeatherMap
     */
    function displayWeather(data) {
        errorContainer.classList.add('hidden');

        cityNameEl.textContent = `${data.name}, ${data.sys.country}`;

        const weather = data.weather[0];
        weatherDescEl.textContent = weather.description;
        weatherIconEl.src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
        weatherIconEl.alt = weather.description;

        temperatureEl.textContent = `${Math.round(data.main.temp * 10) / 10}°C`;
        feelsLikeEl.textContent = `Feels like ${Math.round(data.main.feels_like * 10) / 10}°C`;

        humidityEl.textContent = `${data.main.humidity}% `;
        windSpeedEl.textContent = `${data.wind.speed} m/s`;

        weatherCard.classList.remove('hidden');
    }

    /**
     * Show loading state and disable inputs
     */
    function showLoading() {
        loadingContainer.classList.remove('hidden');
        weatherCard.classList.add('hidden');
        errorContainer.classList.add('hidden');
        searchBtn.disabled = true;
        searchBtn.textContent = 'Loading...';
    }

    /**
     * Revert loading state
     */
    function hideLoading() {
        loadingContainer.classList.add('hidden');
        searchBtn.disabled = false;
        searchBtn.textContent = 'Search';
        cityInput.value = '';
        cityInput.blur();
    }

    /**
     * Show Error UI
     * @param {string} message - Error message to display
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.classList.remove('hidden');
        weatherCard.classList.add('hidden');
    }

    /**
     * Save a city to localStorage (keeping only the last 5 unique cities)
     * @param {string} city - The city name
     */
    function saveRecentSearch(city) {
        let recent = getRecentSearches();

        recent = recent.filter(c => c.toLowerCase() !== city.toLowerCase());

        recent.unshift(city);

        if (recent.length > 5) {
            recent.pop();
        }

        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
    }

    /**
     * Get recent searches from localStorage
     * @returns {Array<string>} List of cities
     */
    function getRecentSearches() {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Render the recent search chips
     */
    function renderRecentSearches() {
        const recent = getRecentSearches();
        recentChipsContainer.innerHTML = '';

        if (recent.length === 0) {
            recentChipsContainer.innerHTML = '<span class="detail-label" style="text-transform: none;">No recent searches</span>';
            return;
        }

        recent.forEach(city => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.textContent = city;
            chip.addEventListener('click', () => {
                cityInput.value = city;
                fetchWeather(city);
            });
            recentChipsContainer.appendChild(chip);
        });
    }
});
