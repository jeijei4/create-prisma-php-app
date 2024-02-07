<?php

require_once "../../bootstrap.php";
includeIndexFileFromUri();

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Generated by create Prisma PHP App">
    <title>Create Prisma PHP App</title>
    <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">
</head>

<body>
    <?php
    function includeIndexFileFromUri()
    {
        $subject = $_SERVER["SCRIPT_NAME"];
        preg_match("/^(.*)\/src\/app\//", $subject, $matches);
        // Normalize the request URI by removing the query string
        $requestUri = explode('?', $_SERVER['REQUEST_URI'], 2)[0];
        // Replace the base part of the URI
        $requestUri = str_replace($matches[1], '', $requestUri);
        $uri = trim($requestUri, '/');
        $baseDir = __DIR__;
        // Check if the request is for a specific file or directory
        if ($uri) {
            // Inside includeIndexFileFromUri function
            $path = $baseDir . '/' . $uri . '.php'; // Resolve to a specific PHP file
            if (file_exists($path)) {
                error_log("Including path: " . $path); // Add logging
                require_once $path;
                return;
            }
            $path = $baseDir . '/' . $uri . '/index.php'; // Fallback to index.php in the directory
            if (file_exists($path)) {
                require_once $path;
                return;
            }
        } else {
            // Default route handling, e.g., when the URI is empty
            require_once $baseDir . '/index.php';
            return;
        }
        // If none of the above, show 404 Not Found
        echo "404 Not Found or redirect to a default page.";
    }
    ?>
</body>

</html>