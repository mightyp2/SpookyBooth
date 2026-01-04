<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/database.php';

$action = isset($_GET['action']) ? $_GET['action'] : null;
$body = json_decode(file_get_contents('php://input'), true) ?: [];

function json_response($data)
{
    $s = json_encode($data);
    header('Content-Length: ' . strlen($s));
    echo $s;
    exit;
}

try {
    switch ($action) {
        case 'register':
            $username = trim($body['username'] ?? '');
            $password = trim($body['password'] ?? '');
            if (!$username || !$password) json_response(['success' => false, 'error' => 'Username and password required']);

            $hash = password_hash($password, PASSWORD_DEFAULT);
            try {
                $existingUsers = db_get_users_summary();
                $grantAdmin = strtolower($username) === 'rafa' || count($existingUsers) === 0;
                db_create_user($username, $hash, $grantAdmin);
                json_response(['success' => true, 'is_admin' => $grantAdmin]);
            } catch (Exception $e) {
                json_response(['success' => false, 'error' => $e->getMessage()]);
            }
            break;

        case 'login':
            $username = trim($body['username'] ?? '');
            $password = trim($body['password'] ?? '');
            if (!$username || !$password) json_response(['success' => false, 'error' => 'Missing credentials']);

            $user = db_find_user_by_username($username);
            if ($user && password_verify($password, $user['password'])) {
                json_response(['success' => true, 'user' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'isAdmin' => !empty($user['is_admin'])
                ]]);
            } else {
                json_response(['success' => false, 'error' => 'Invalid username or password']);
            }
            break;

        case 'save_photo':
            $userId = (int)($body['user_id'] ?? 0);
            $url = $body['url'] ?? '';
            $timestamp = (int)($body['timestamp'] ?? time());
            if (!$userId || !$url) json_response(['success' => false, 'error' => 'Missing data']);

            db_insert_photo($userId, $url, $timestamp);
            json_response(['success' => true]);
            break;
        case 'save_public_photo':
            $userId = (int)($body['user_id'] ?? 0);
            $url = $body['url'] ?? '';
            $timestamp = (int)($body['timestamp'] ?? time());
            if (!$url) json_response(['success' => false, 'error' => 'Missing data']);

            db_insert_photo($userId, $url, $timestamp);
            json_response(['success' => true]);
            break;

        case 'get_photos':
            $userId = (int)($_GET['user_id'] ?? 0);
            if (!$userId) json_response(['success' => false, 'photos' => []]);

            $items = db_get_photos_by_user($userId);
            $photos = array_map(function ($p) {
                return ['id' => (string)$p['id'], 'url' => $p['url'], 'timestamp' => (int)$p['timestamp']];
            }, $items);
            json_response(['success' => true, 'photos' => $photos]);
            break;

        case 'delete_photo':
            $userId = (int)($body['user_id'] ?? 0);
            $id = (int)($body['id'] ?? 0);
            if (!$userId || !$id) json_response(['success' => false, 'error' => 'Missing data']);

            $ok = db_delete_photo($userId, $id);
            json_response(['success' => (bool)$ok]);
            break;

        case 'admin_snapshot':
            $stats = db_get_stats_snapshot();
            $users = db_get_users_summary();
            $recent = db_get_recent_photos(12);
            json_response(['success' => true, 'stats' => $stats, 'users' => $users, 'recent' => $recent]);
            break;

        case 'admin_all_photos':
            $all = db_get_all_photos_with_users();
            json_response(['success' => true, 'photos' => $all]);
            break;

        case 'admin_delete_user':
            $targetId = (int)($body['user_id'] ?? 0);
            if (!$targetId) json_response(['success' => false, 'error' => 'Missing user id']);
            $ok = db_delete_user($targetId);
            json_response(['success' => (bool)$ok]);
            break;

        case 'admin_set_role':
            $targetId = (int)($body['user_id'] ?? 0);
            $isAdmin = (bool)($body['is_admin'] ?? false);
            if (!$targetId) json_response(['success' => false, 'error' => 'Missing user id']);
            $ok = db_set_user_admin($targetId, $isAdmin);
            json_response(['success' => (bool)$ok]);
            break;

        default:
            json_response(['success' => false, 'error' => 'Unknown action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    json_response(['success' => false, 'error' => $e->getMessage()]);
}

?>
