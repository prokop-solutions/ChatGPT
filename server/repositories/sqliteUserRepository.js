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

const getLearningStateStmt = db.prepare(
  `SELECT user_id, leitner_boxes, flashcard_index, quiz_correct, quiz_total, updated_at
     FROM user_learning_states
    WHERE user_id = ?`
);
const insertLearningStateStmt = db.prepare(
  `INSERT INTO user_learning_states (user_id, leitner_boxes, flashcard_index, quiz_correct, quiz_total)
   VALUES (@user_id, @leitner_boxes, @flashcard_index, @quiz_correct, @quiz_total)`
);
const updateLearningStateStmt = db.prepare(
  `UPDATE user_learning_states
      SET leitner_boxes = @leitner_boxes,
          flashcard_index = @flashcard_index,
          quiz_correct = @quiz_correct,
          quiz_total = @quiz_total,
          updated_at = CURRENT_TIMESTAMP
    WHERE user_id = @user_id`
);

const createUserWithStatus = db.transaction((email, passwordHash, initialStatus) => {
  const result = insertUserStmt.run({ email, password_hash: passwordHash });
  const userId = Number(result.lastInsertRowid);
  insertStatusStmt.run(userId, initialStatus);
  insertLearningStateStmt.run({
    user_id: userId,
    leitner_boxes: '{}',
    flashcard_index: 0,
    quiz_correct: 0,
    quiz_total: 0
  });
  return getUserByIdStmt.get(userId);
});

const mapLearningState = (row) => {
  if (!row) {
    return null;
  }

  let boxes;
  try {
    boxes = row.leitner_boxes ? JSON.parse(row.leitner_boxes) : {};
  } catch (error) {
    boxes = {};
  }

  return {
    userId: row.user_id,
    leitnerBoxes: boxes,
    flashcardIndex: Number.isFinite(row.flashcard_index) ? row.flashcard_index : 0,
    quizScore: {
      correct: Number.isFinite(row.quiz_correct) ? row.quiz_correct : 0,
      total: Number.isFinite(row.quiz_total) ? row.quiz_total : 0
    },
    updatedAt: row.updated_at
  };
};

export async function createUser(email, passwordHash, initialStatus = 'pending') {
  return createUserWithStatus(email, passwordHash, initialStatus);
}

export async function findUserByEmail(email) {
  return getUserByEmailStmt.get(email) || null;
}

export async function findUserById(id) {
  return getUserByIdStmt.get(id) || null;
}

export async function addStatus(userId, status) {
  insertStatusStmt.run(userId, status);
  return getLatestStatusStmt.get(userId);
}

export async function getStatusesForUser(userId) {
  return getStatusesStmt.all(userId);
}

export async function getLatestStatusForUser(userId) {
  return getLatestStatusStmt.get(userId);
}

export async function listUsersWithLatestStatus() {
  return getAllUsersStmt.all();
}

export async function getLearningStateForUser(userId) {
  return mapLearningState(getLearningStateStmt.get(userId));
}

export async function upsertLearningState(userId, state) {
  const payload = {
    user_id: userId,
    leitner_boxes: JSON.stringify(state?.leitnerBoxes || {}),
    flashcard_index: Number.isFinite(state?.flashcardIndex) ? state.flashcardIndex : 0,
    quiz_correct: Number.isFinite(state?.quizScore?.correct) ? state.quizScore.correct : 0,
    quiz_total: Number.isFinite(state?.quizScore?.total) ? state.quizScore.total : 0
  };

  const existing = getLearningStateStmt.get(userId);
  if (existing) {
    updateLearningStateStmt.run(payload);
  } else {
    insertLearningStateStmt.run(payload);
  }

  return getLearningStateForUser(userId);
}

export const repositoryMode = 'sqlite';
