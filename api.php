<?php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

function loadEnvFile($path)
{
    if (!file_exists($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $trimmed = trim($line);

        if ($trimmed === '' || $trimmed[0] === '#') {
            continue;
        }

        if (strpos($trimmed, '=') === false) {
            continue;
        }

        list($name, $value) = explode('=', $trimmed, 2);
        $name = trim($name);
        $value = trim($value);

        // Strip wrapping quotes for standard .env formats.
        $value = trim($value, "\"'");

        if ($name !== '' && getenv($name) === false) {
            putenv("$name=$value");
            $_ENV[$name] = $value;
        }
    }
}

loadEnvFile(__DIR__ . '/.env');

define('API_KEY', getenv('OPENWEATHERMAP_API_KEY') ?: '');
define('CACHE_DIR', __DIR__ . '/cache/');
define('CACHE_EXPIRY', 600);

if (!is_dir(CACHE_DIR)) {
    mkdir(CACHE_DIR, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed. Use GET."]);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : 'weather';

if (!isset($_GET['city']) || empty(trim($_GET['city']))) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing or empty 'city' parameter."]);
    exit;
}

$city = htmlspecialchars(strip_tags(trim($_GET['city'])));

if ($action === 'geocode') {
    $geoUrl = sprintf(
        "http://api.openweathermap.org/geo/1.0/direct?q=%s&limit=5&appid=%s",
        urlencode($city),
        API_KEY
    );

    $context = stream_context_create(["http" => ["ignore_errors" => true]]);
    $response = @file_get_contents($geoUrl, false, $context);

    if ($response === false) {
        http_response_code(500);
        echo json_encode([]);
        exit;
    }

    // Pass geocoding directly to frontend
    echo $response;
    exit;
}

$city = htmlspecialchars(strip_tags(trim($_GET['city'])));
$safeCityForCache = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($city));
$cacheFile = CACHE_DIR . $safeCityForCache . '.json';

if (file_exists($cacheFile)) {
    $filemtime = filemtime($cacheFile);
    if (time() - $filemtime < CACHE_EXPIRY) {
        $cachedData = file_get_contents($cacheFile);

        $decoded = json_decode($cachedData, true);
        $decoded['source'] = 'cache';

        echo json_encode($decoded);
        exit;
    }
}

if (API_KEY === '') {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "OPENWEATHERMAP_API_KEY is missing. Set it in .env."]);
    exit;
}

$apiUrl = sprintf(
    "https://api.openweathermap.org/data/2.5/weather?q=%s&appid=%s&units=metric",
    urlencode($city),
    API_KEY
);

$context = stream_context_create([
    "http" => [
        "ignore_errors" => true
    ]
]);

$response = @file_get_contents($apiUrl, false, $context);

if ($response === false) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to connect to OpenWeatherMap API."]);
    exit;
}

$statusLine = $http_response_header[0];
$isHttpOk = strpos($statusLine, "200 OK") !== false;

$decodedResponse = json_decode($response, true);

if ($isHttpOk) {
    $decodedResponse['source'] = 'api';
    file_put_contents($cacheFile, json_encode($decodedResponse));
    echo json_encode($decodedResponse);
} else {
    $statusCode = isset($decodedResponse['cod']) ? $decodedResponse['cod'] : 500;
    http_response_code((int) $statusCode);

    $errorMessage = isset($decodedResponse['message']) ? $decodedResponse['message'] : "Unknown API error.";
    echo json_encode(["status" => "error", "message" => ucfirst($errorMessage)]);
}
?>