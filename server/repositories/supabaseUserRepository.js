import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase configuration missing. Provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const USERS_TABLE = process.env.SUPABASE_USERS_TABLE || 'app_users';
const STATUSES_TABLE = process.env.SUPABASE_USER_STATUSES_TABLE || 'user_statuses';
const PROGRESS_TABLE = process.env.SUPABASE_USER_PROGRESS_TABLE || 'user_learning_states';

const mapUser = (row) => {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
};

const mapStatus = (row) => {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    status: row.status,
    created_at: row.created_at
  };
};

const mapLearningState = (row) => {
  if (!row) {
    return null;
  }

  const boxes = row.leitner_boxes && typeof row.leitner_boxes === 'object'
    ? row.leitner_boxes
    : {};

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
  const { data: user, error } = await supabase
    .from(USERS_TABLE)
    .insert({ email, password_hash: passwordHash })
    .select()
    .single();

  if (error) {
    throw new Error(`Supabase createUser failed: ${error.message}`);
  }

  const userId = user.id;

  const { error: statusError } = await supabase
    .from(STATUSES_TABLE)
    .insert({ user_id: userId, status: initialStatus });

  if (statusError) {
    await supabase.from(USERS_TABLE).delete().eq('id', userId);
    throw new Error(`Supabase initial status failed: ${statusError.message}`);
  }

  const { error: progressError } = await supabase
    .from(PROGRESS_TABLE)
    .upsert({
      user_id: userId,
      leitner_boxes: {},
      flashcard_index: 0,
      quiz_correct: 0,
      quiz_total: 0,
      updated_at: new Date().toISOString()
    });

  if (progressError) {
    throw new Error(`Supabase initial progress failed: ${progressError.message}`);
  }

  return mapUser(user);
}

export async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase findUserByEmail failed: ${error.message}`);
  }

  return mapUser(data);
}

export async function findUserById(id) {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase findUserById failed: ${error.message}`);
  }

  return mapUser(data);
}

export async function addStatus(userId, status) {
  const { data, error } = await supabase
    .from(STATUSES_TABLE)
    .insert({ user_id: userId, status })
    .select('id, status, created_at')
    .single();

  if (error) {
    throw new Error(`Supabase addStatus failed: ${error.message}`);
  }

  return mapStatus(data);
}

export async function getStatusesForUser(userId) {
  const { data, error } = await supabase
    .from(STATUSES_TABLE)
    .select('id, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    throw new Error(`Supabase getStatusesForUser failed: ${error.message}`);
  }

  return (data || []).map(mapStatus);
}

export async function getLatestStatusForUser(userId) {
  const { data, error } = await supabase
    .from(STATUSES_TABLE)
    .select('id, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Supabase getLatestStatusForUser failed: ${error.message}`);
  }

  return mapStatus(data);
}

export async function listUsersWithLatestStatus() {
  const { data: users, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Supabase listUsersWithLatestStatus failed: ${error.message}`);
  }

  const results = [];
  for (const user of users || []) {
    const latest = await getLatestStatusForUser(user.id);
    results.push({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
      latest_status: latest?.status || null,
      latest_status_at: latest?.created_at || null
    });
  }

  return results;
}

export async function getLearningStateForUser(userId) {
  const { data, error } = await supabase
    .from(PROGRESS_TABLE)
    .select('user_id, leitner_boxes, flashcard_index, quiz_correct, quiz_total, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Supabase getLearningStateForUser failed: ${error.message}`);
  }

  return mapLearningState(data);
}

export async function upsertLearningState(userId, state) {
  const payload = {
    user_id: userId,
    leitner_boxes: state?.leitnerBoxes || {},
    flashcard_index: Number.isFinite(state?.flashcardIndex) ? state.flashcardIndex : 0,
    quiz_correct: Number.isFinite(state?.quizScore?.correct) ? state.quizScore.correct : 0,
    quiz_total: Number.isFinite(state?.quizScore?.total) ? state.quizScore.total : 0,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from(PROGRESS_TABLE)
    .upsert(payload, { onConflict: 'user_id' })
    .select('user_id, leitner_boxes, flashcard_index, quiz_correct, quiz_total, updated_at')
    .single();

  if (error) {
    throw new Error(`Supabase upsertLearningState failed: ${error.message}`);
  }

  return mapLearningState(data);
}

export const repositoryMode = 'supabase';
