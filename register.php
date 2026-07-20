<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    session_start();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(['success' => false, 'message' => 'Invalid request method.'], 405);
    }

    $body = read_json_body();
    $username = trim($body['username'] ?? '');
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    $password_confirm = $body['password_confirm'] ?? '';

    if ($username === '' || $email === '' || $password === '') {
        json_response(['success' => false, 'message' => 'All fields are required.'], 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['success' => false, 'message' => 'Enter a valid email address.'], 422);
    }
    if (strlen($password) < 8) {
        json_response(['success' => false, 'message' => 'Password must be at least 8 characters.'], 422);
    }
    if ($password !== $password_confirm) {
        json_response(['success' => false, 'message' => 'Passwords do not match.'], 422);
    }
    if (!preg_match('/^[a-zA-Z0-9_.]{3,50}$/', $username)) {
        json_response(['success' => true, 'message' => 'Username may only contain letters, numbers, dot and underscore.'], 422);
    }

    $pdo = get_pdo();

    $check = $pdo->prepare('SELECT id FROM users WHERE email = :email OR username = :username');
    $check->execute(['email' => $email, 'username' => $username]);
    if ($check->fetch()) {
        json_response(['success' => false, 'message' => 'An account with that username or email already exists.'], 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $insert = $pdo->prepare('INSERT INTO users (username, email, password_hash) VALUES (:username, :email, :hash)');
    $insert->execute(['username' => $username, 'email' => $email, 'hash' => $hash]);

    $_SESSION['user_id'] = (int) $pdo->lastInsertId();
    $_SESSION['username'] = $username;

    json_response(['success' => true, 'message' => 'Account created.', 'username' => $username]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    exit;
}