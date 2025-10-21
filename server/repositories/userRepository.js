import db from '../db.js';

const insertUserStmt = db.prepare(
  'INSERT INTO users (email, password_hash) VALUES (@email, @password_hash)'
);
const getUserByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const getUserByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const insertStatusStmt = db.prepare(
  'INSERT INTO user_statuses (user_id, status) VALUES (?, ?)'
);
const getStatusesStmt = db.prepare(
  'SELECT id, status, created_at FROM user_statuses WHERE user_id = ? ORDER BY created_at DESC, id DESC'
);
const getLatestStatusStmt = db.prepare(
  'SELECT status, created_at FROM user_statuses WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1'
);
const getAllUsersStmt = db.prepare(`
  SELECT u.id, u.email, u.created_at, u.updated_at,
         (SELECT status FROM user_statuses WHERE user_id = u.id ORDER BY created_at DESC, id DESC LIMIT 1) AS latest_status,
         (SELECT created_at FROM user_statuses WHERE user_id = u.id ORDER BY created_at DESC, id DESC LIMIT 1) AS latest_status_at
  FROM users u
  ORDER BY u.created_at DESC
`);

const createUserWithStatus = db.transaction((email, passwordHash, initialStatus) => {
  const result = insertUserStmt.run({ email, password_hash: passwordHash });
  const userId = Number(result.lastInsertRowid);
  insertStatusStmt.run(userId, initialStatus);
  return getUserByIdStmt.get(userId);
});

export function createUser(email, passwordHash, initialStatus = 'pending') {
  return createUserWithStatus(email, passwordHash, initialStatus);
}

export function findUserByEmail(email) {
  return getUserByEmailStmt.get(email);
}

export function findUserById(id) {
  return getUserByIdStmt.get(id);
}

export function addStatus(userId, status) {
  insertStatusStmt.run(userId, status);
  return getLatestStatusStmt.get(userId);
}

export function getStatusesForUser(userId) {
  return getStatusesStmt.all(userId);
}

export function getLatestStatusForUser(userId) {
  return getLatestStatusStmt.get(userId);
}

export function listUsersWithLatestStatus() {
  return getAllUsersStmt.all();
}
