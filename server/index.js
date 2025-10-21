import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
  addStatus,
  createUser,
  findUserByEmail,
  findUserById,
  getLatestStatusForUser,
  getLearningStateForUser,
  getStatusesForUser,
  listUsersWithLatestStatus,
  repositoryMode,
  upsertLearningState
} from './repositories/userRepository.js';
import { requireAuth } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ALLOWED_ORIGINS = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173'];

const formatProgressResponse = (state) => ({
  leitnerBoxes: state?.leitnerBoxes || {},
  flashcardIndex: Number.isFinite(state?.flashcardIndex) ? state.flashcardIndex : 0,
  quizScore: {
    correct: Number.isFinite(state?.quizScore?.correct) ? state.quizScore.correct : 0,
    total: Number.isFinite(state?.quizScore?.total) ? state.quizScore.total : 0
  },
  updatedAt: state?.updatedAt || null
});

const normaliseBoxValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.min(5, Math.max(1, Math.round(numeric)));
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', storage: repositoryMode });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, status } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalisedEmail = String(email).toLowerCase().trim();

  try {
    const existing = await findUserByEmail(normalisedEmail);
    if (existing) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }
  } catch (error) {
    console.error('Error checking for existing user', error);
    return res.status(500).json({ message: 'Unable to create user.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser(normalisedEmail, passwordHash, status || 'pending');
    const latestStatus = await getLatestStatusForUser(user.id);
    const progress = await getLearningStateForUser(user.id);
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        status: latestStatus?.status || null,
        statusUpdatedAt: latestStatus?.created_at || latestStatus?.createdAt || null
      },
      progress: formatProgressResponse(progress)
    });
  } catch (error) {
    console.error('Error creating user', error);
    res.status(500).json({ message: 'Unable to create user.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  let user;
  try {
    user = await findUserByEmail(String(email).toLowerCase().trim());
  } catch (error) {
    console.error('Error retrieving user during login', error);
    return res.status(500).json({ message: 'Unable to login.' });
  }

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '2h'
  });
  const latestStatus = await getLatestStatusForUser(user.id);
  const progress = await getLearningStateForUser(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      status: latestStatus?.status || null,
      statusUpdatedAt: latestStatus?.created_at || latestStatus?.createdAt || null
    },
    progress: formatProgressResponse(progress)
  });
});

app.get('/api/users', requireAuth, async (req, res, next) => {
  try {
    const users = (await listUsersWithLatestStatus()).map((user) => ({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      status: user.latest_status,
      statusUpdatedAt: user.latest_status_at
    }));
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users/me', requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    const latestStatus = await getLatestStatusForUser(req.user.id);
    const progress = await getLearningStateForUser(req.user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        status: latestStatus?.status || null,
        statusUpdatedAt: latestStatus?.created_at || latestStatus?.createdAt || null
      },
      progress: formatProgressResponse(progress)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users/me/statuses', requireAuth, async (req, res, next) => {
  try {
    const statuses = (await getStatusesForUser(req.user.id)).map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.created_at || row.createdAt
    }));
    res.json({ statuses });
  } catch (error) {
    next(error);
  }
});

app.post('/api/users/me/statuses', requireAuth, async (req, res, next) => {
  const { status } = req.body || {};
  if (!status) {
    return res.status(400).json({ message: 'Status is required.' });
  }

  try {
    const latest = await addStatus(req.user.id, status);
    res.status(201).json({
      status: {
        status: latest.status,
        createdAt: latest.created_at || latest.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users/me/progress', requireAuth, async (req, res, next) => {
  try {
    const state = (await getLearningStateForUser(req.user.id)) ||
      (await upsertLearningState(req.user.id, {
        leitnerBoxes: {},
        flashcardIndex: 0,
        quizScore: { correct: 0, total: 0 }
      }));
    res.json({ progress: formatProgressResponse(state) });
  } catch (error) {
    next(error);
  }
});

app.put('/api/users/me/progress', requireAuth, async (req, res, next) => {
  const { leitnerBoxes, flashcardIndex, quizScore } = req.body || {};

  let existingState = await getLearningStateForUser(req.user.id);
  if (!existingState) {
    existingState = {
      leitnerBoxes: {},
      flashcardIndex: 0,
      quizScore: { correct: 0, total: 0 }
    };
  }

  let boxesToPersist = { ...existingState.leitnerBoxes };
  if (leitnerBoxes !== undefined) {
    if (leitnerBoxes === null) {
      boxesToPersist = {};
    } else if (typeof leitnerBoxes === 'object' && !Array.isArray(leitnerBoxes)) {
      const sanitised = {};
      for (const [diagnosis, value] of Object.entries(leitnerBoxes)) {
        sanitised[diagnosis] = normaliseBoxValue(value);
      }
      boxesToPersist = sanitised;
    } else {
      return res.status(400).json({ message: 'leitnerBoxes must be an object.' });
    }
  }

  let flashcardIndexToPersist = existingState.flashcardIndex;
  if (flashcardIndex !== undefined) {
    if (Number.isFinite(flashcardIndex) && flashcardIndex >= 0) {
      flashcardIndexToPersist = Math.floor(flashcardIndex);
    } else {
      return res.status(400).json({ message: 'flashcardIndex must be a positive number.' });
    }
  }

  const existingQuiz = existingState.quizScore || { correct: 0, total: 0 };
  let quizScoreToPersist = { ...existingQuiz };
  if (quizScore !== undefined) {
    if (quizScore && typeof quizScore === 'object' && !Array.isArray(quizScore)) {
      const correct = Number.isFinite(quizScore.correct) && quizScore.correct >= 0
        ? Math.floor(quizScore.correct)
        : 0;
      const total = Number.isFinite(quizScore.total) && quizScore.total >= 0
        ? Math.max(Math.floor(quizScore.total), correct)
        : correct;
      quizScoreToPersist = { correct, total };
    } else {
      return res.status(400).json({ message: 'quizScore must be an object.' });
    }
  }

  const nextState = {
    leitnerBoxes: boxesToPersist,
    flashcardIndex: flashcardIndexToPersist,
    quizScore: quizScoreToPersist
  };

  try {
    const saved = await upsertLearningState(req.user.id, nextState);
    res.json({ progress: formatProgressResponse(saved) });
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  console.log(`User service listening on port ${port} using ${repositoryMode} storage`);
});
