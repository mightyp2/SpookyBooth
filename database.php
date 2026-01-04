<?php
// Lightweight DB helper using SQLite for local development

function ensure_data_dir()
{
    $dir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

function json_store_path()
{
    return ensure_data_dir() . DIRECTORY_SEPARATOR . 'store.json';
}

function load_json_store()
{
    $file = json_store_path();
    if (!file_exists($file)) {
        return ['users' => [], 'photos' => []];
    }
    $data = json_decode(file_get_contents($file), true);
    if (!is_array($data)) {
        return ['users' => [], 'photos' => []];
    }
    if (!isset($data['users']) || !is_array($data['users'])) {
        $data['users'] = [];
    }
    if (!isset($data['photos']) || !is_array($data['photos'])) {
        $data['photos'] = [];
    }
    foreach ($data['users'] as &$user) {
        if (!isset($user['is_admin'])) {
            $user['is_admin'] = 0;
        }
        if (isset($user['username']) && strtolower($user['username']) === 'rafa') {
            $user['is_admin'] = 1;
        }
    }
    unset($user);
    return $data;
}

function save_json_store($data)
{
    file_put_contents(
        json_store_path(),
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

function has_sqlite_pdo()
{
    return class_exists('PDO') && in_array('sqlite', PDO::getAvailableDrivers(), true);
}

function sqlite_db()
{
    $path = ensure_data_dir() . DIRECTORY_SEPARATOR . 'spooky_booth.sqlite';
    $db = new PDO('sqlite:' . $path);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        timestamp INTEGER NOT NULL
    )');

    try {
        $cols = $db->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_ASSOC);
        $hasAdmin = false;
        foreach ($cols as $col) {
            if ($col['name'] === 'is_admin') {
                $hasAdmin = true;
                break;
            }
        }
        if (!$hasAdmin) {
            $db->exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
        }
    } catch (Exception $e) {
        // ignore migration issues
    }

    try {
        $db->exec("UPDATE users SET is_admin = 1 WHERE LOWER(username) = 'rafa'");
    } catch (Exception $e) {
        // ignore seeding issues
    }

    return $db;
}

function db_create_user($username, $password_hash, $is_admin = false)
{
    $isAdminFlag = $is_admin ? 1 : 0;
    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $stmt = $db->prepare('INSERT INTO users (username, password, created_at, is_admin) VALUES (:u, :p, :t, :a)');
        $stmt->execute([
            ':u' => $username,
            ':p' => $password_hash,
            ':t' => time(),
            ':a' => $isAdminFlag
        ]);
        return (int)$db->lastInsertId();
    }

    $data = load_json_store();
    foreach ($data['users'] as $user) {
        if ($user['username'] === $username) {
            throw new Exception('User exists');
        }
    }
    $id = count($data['users']) + 1;
    $data['users'][] = [
        'id' => $id,
        'username' => $username,
        'password' => $password_hash,
        'created_at' => time(),
        'is_admin' => $isAdminFlag
    ];
    save_json_store($data);
    return $id;
}

function db_find_user_by_username($username)
{
    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $stmt = $db->prepare('SELECT id, username, password, is_admin FROM users WHERE username = :u LIMIT 1');
        $stmt->execute([':u' => $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            $user['is_admin'] = (int)$user['is_admin'];
        }
        return $user ?: null;
    }

    $data = load_json_store();
    foreach ($data['users'] as $user) {
        if ($user['username'] === $username) {
            if (!isset($user['is_admin'])) {
                $user['is_admin'] = 0;
            }
            return $user;
        }
    }
    return null;
}

function db_insert_photo($userId, $url, $timestamp)
{
    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $stmt = $db->prepare('INSERT INTO photos (user_id, url, timestamp) VALUES (:u, :url, :t)');
        $stmt->execute([
            ':u' => $userId,
            ':url' => $url,
            ':t' => $timestamp
        ]);
        return (int)$db->lastInsertId();
    }

    $data = load_json_store();
    $id = count($data['photos']) + 1;
    $data['photos'][] = [
        'id' => $id,
        'user_id' => $userId,
        'url' => $url,
        'timestamp' => $timestamp
    ];
    save_json_store($data);
    return $id;
}

function db_get_photos_by_user($userId)
{
    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $stmt = $db->prepare('SELECT id, url, timestamp FROM photos WHERE user_id = :u ORDER BY id DESC');
        $stmt->execute([':u' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    $data = load_json_store();
    $items = [];
    foreach ($data['photos'] as $photo) {
        if ((int)$photo['user_id'] === (int)$userId) {
            $items[] = $photo;
        }
    }
    return array_reverse($items);
}

function db_delete_photo($userId, $id)
{
    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $stmt = $db->prepare('DELETE FROM photos WHERE id = :id AND user_id = :u');
        return $stmt->execute([':id' => $id, ':u' => $userId]);
    }

    $data = load_json_store();
    $changed = false;
    foreach ($data['photos'] as $index => $photo) {
        if ((int)$photo['id'] === (int)$id && (int)$photo['user_id'] === (int)$userId) {
            array_splice($data['photos'], $index, 1);
            $changed = true;
            break;
        }
    }
    if ($changed) {
        save_json_store($data);
    }
    return $changed;
}

function db_delete_user($userId)
{
    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $db->beginTransaction();
        try {
            $stmtPhotos = $db->prepare('DELETE FROM photos WHERE user_id = :u');
            $stmtPhotos->execute([':u' => $userId]);
            $stmtUser = $db->prepare('DELETE FROM users WHERE id = :u');
            $stmtUser->execute([':u' => $userId]);
            $db->commit();
            return $stmtUser->rowCount() > 0;
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    $data = load_json_store();
    $originalCount = count($data['users']);
    $data['users'] = array_values(array_filter($data['users'], function ($user) use ($userId) {
        return (int)$user['id'] !== (int)$userId;
    }));
    if (count($data['users']) === $originalCount) {
        return false;
    }
    $data['photos'] = array_values(array_filter($data['photos'], function ($photo) use ($userId) {
        return (int)$photo['user_id'] !== (int)$userId;
    }));
    save_json_store($data);
    return true;
}

function db_set_user_admin($userId, $isAdmin)
{
    $flag = $isAdmin ? 1 : 0;
    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $stmt = $db->prepare('UPDATE users SET is_admin = :a WHERE id = :u');
        $stmt->execute([':a' => $flag, ':u' => $userId]);
        return $stmt->rowCount() > 0;
    }

    $data = load_json_store();
    $updated = false;
    foreach ($data['users'] as &$user) {
        if ((int)$user['id'] === (int)$userId) {
            $user['is_admin'] = $flag;
            $updated = true;
            break;
        }
    }
    unset($user);
    if ($updated) {
        save_json_store($data);
    }
    return $updated;
}

function db_get_users_summary()
{
    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $stmt = $db->query('SELECT u.id, u.username, u.created_at, u.is_admin, COUNT(p.id) AS photo_count, MAX(p.timestamp) AS last_photo_at
            FROM users u
            LEFT JOIN photos p ON p.user_id = u.id
            GROUP BY u.id
            ORDER BY u.created_at DESC');
        $users = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $users[] = [
                'id' => (int)$row['id'],
                'username' => $row['username'],
                'created_at' => (int)$row['created_at'],
                'is_admin' => (int)$row['is_admin'],
                'photo_count' => (int)$row['photo_count'],
                'last_photo_at' => $row['last_photo_at'] ? (int)$row['last_photo_at'] : null
            ];
        }
        return $users;
    }

    $data = load_json_store();
    $users = [];
    foreach ($data['users'] as $user) {
        $photoCount = 0;
        $lastPhoto = null;
        foreach ($data['photos'] as $photo) {
            if ((int)$photo['user_id'] === (int)$user['id']) {
                $photoCount++;
                if ($lastPhoto === null || $photo['timestamp'] > $lastPhoto) {
                    $lastPhoto = $photo['timestamp'];
                }
            }
        }
        $users[] = [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'created_at' => (int)$user['created_at'],
            'is_admin' => isset($user['is_admin']) ? (int)$user['is_admin'] : 0,
            'photo_count' => $photoCount,
            'last_photo_at' => $lastPhoto
        ];
    }
    usort($users, function ($a, $b) {
        return $b['created_at'] <=> $a['created_at'];
    });
    return $users;
}

function db_get_recent_photos($limit = 8)
{
    $limit = max(1, (int)$limit);
    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $stmt = $db->prepare('SELECT p.id, p.url, p.timestamp, p.user_id, u.username
            FROM photos p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.timestamp DESC
            LIMIT :limit');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $items = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $items[] = [
                'id' => (int)$row['id'],
                'url' => $row['url'],
                'timestamp' => (int)$row['timestamp'],
                'user_id' => (int)$row['user_id'],
                'username' => $row['username'] ?? 'Unknown'
            ];
        }
        return $items;
    }

    $data = load_json_store();
    $photos = $data['photos'];
    usort($photos, function ($a, $b) {
        return $b['timestamp'] <=> $a['timestamp'];
    });
    $slice = array_slice($photos, 0, $limit);
    $userMap = [];
    foreach ($data['users'] as $user) {
        $userMap[$user['id']] = $user['username'];
    }
    return array_map(function ($photo) use ($userMap) {
        return [
            'id' => (int)$photo['id'],
            'url' => $photo['url'],
            'timestamp' => (int)$photo['timestamp'],
            'user_id' => (int)$photo['user_id'],
            'username' => $userMap[$photo['user_id']] ?? 'Unknown'
        ];
    }, $slice);
}

function db_get_all_photos_with_users()
{
    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $stmt = $db->query('SELECT p.id, p.url, p.timestamp, p.user_id, u.username
            FROM photos p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.timestamp DESC');
        $items = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $items[] = [
                'id' => (int)$row['id'],
                'url' => $row['url'],
                'timestamp' => (int)$row['timestamp'],
                'user_id' => (int)$row['user_id'],
                'username' => $row['username'] ?? 'Unknown'
            ];
        }
        return $items;
    }

    $data = load_json_store();
    $photos = $data['photos'];
    usort($photos, function ($a, $b) {
        return $b['timestamp'] <=> $a['timestamp'];
    });
    $userMap = [];
    foreach ($data['users'] as $user) {
        $userMap[$user['id']] = $user['username'];
    }
    return array_map(function ($photo) use ($userMap) {
        return [
            'id' => (int)$photo['id'],
            'url' => $photo['url'],
            'timestamp' => (int)$photo['timestamp'],
            'user_id' => (int)$photo['user_id'],
            'username' => $userMap[$photo['user_id']] ?? 'Unknown'
        ];
    }, $photos);
}

function db_get_stats_snapshot()
{
    $now = time();
    $dayAgo = $now - 86400;
    $weekAgo = $now - (86400 * 7);

    if (has_sqlite_pdo()) {
        $db = sqlite_db();
        $totalUsers = (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $totalPhotos = (int)$db->query('SELECT COUNT(*) FROM photos')->fetchColumn();

        $stmtPhotos24 = $db->prepare('SELECT COUNT(*) FROM photos WHERE timestamp >= :t');
        $stmtPhotos24->execute([':t' => $dayAgo]);
        $photos24 = (int)$stmtPhotos24->fetchColumn();

        $stmtActive24 = $db->prepare('SELECT COUNT(DISTINCT user_id) FROM photos WHERE timestamp >= :t');
        $stmtActive24->execute([':t' => $dayAgo]);
        $active24 = (int)$stmtActive24->fetchColumn();

        $stmtNewUsers = $db->prepare('SELECT COUNT(*) FROM users WHERE created_at >= :t');
        $stmtNewUsers->execute([':t' => $weekAgo]);
        $newUsers = (int)$stmtNewUsers->fetchColumn();

        $stmtTop = $db->query('SELECT u.username, u.id AS user_id, COUNT(p.id) AS total
            FROM users u
            LEFT JOIN photos p ON p.user_id = u.id
            GROUP BY u.id
            ORDER BY total DESC
            LIMIT 3');
        $topCreators = [];
        while ($row = $stmtTop->fetch(PDO::FETCH_ASSOC)) {
            $topCreators[] = [
                'username' => $row['username'],
                'user_id' => (int)$row['user_id'],
                'photo_count' => (int)$row['total']
            ];
        }

        return [
            'total_users' => $totalUsers,
            'total_photos' => $totalPhotos,
            'photos_last_24h' => $photos24,
            'active_users_last_24h' => $active24,
            'new_users_last_7d' => $newUsers,
            'top_creators' => $topCreators
        ];
    }

    $data = load_json_store();
    $totalUsers = count($data['users']);
    $totalPhotos = count($data['photos']);
    $photos24 = 0;
    $activeUsers = [];
    foreach ($data['photos'] as $photo) {
        if ($photo['timestamp'] >= $dayAgo) {
            $photos24++;
            $activeUsers[$photo['user_id']] = true;
        }
    }
    $active24 = count($activeUsers);
    $newUsers = 0;
    foreach ($data['users'] as $user) {
        if ($user['created_at'] >= $weekAgo) {
            $newUsers++;
        }
    }

    $counts = [];
    foreach ($data['photos'] as $photo) {
        $uid = $photo['user_id'];
        if (!isset($counts[$uid])) {
            $counts[$uid] = 0;
        }
        $counts[$uid]++;
    }
    arsort($counts);
    $userMap = [];
    foreach ($data['users'] as $user) {
        $userMap[$user['id']] = $user['username'];
    }
    $topCreators = [];
    foreach ($counts as $uid => $total) {
        $topCreators[] = [
            'username' => $userMap[$uid] ?? 'Unknown',
            'user_id' => (int)$uid,
            'photo_count' => (int)$total
        ];
        if (count($topCreators) >= 3) {
            break;
        }
    }

    return [
        'total_users' => $totalUsers,
        'total_photos' => $totalPhotos,
        'photos_last_24h' => $photos24,
        'active_users_last_24h' => $active24,
        'new_users_last_7d' => $newUsers,
        'top_creators' => $topCreators
    ];
}
?>
