import 'dotenv/config';

const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const repositoryModule = useSupabase
  ? await import('./supabaseUserRepository.js')
  : await import('./sqliteUserRepository.js');

export const {
  createUser,
  findUserByEmail,
  findUserById,
  addStatus,
  getStatusesForUser,
  getLatestStatusForUser,
  listUsersWithLatestStatus,
  getLearningStateForUser,
  upsertLearningState,
  repositoryMode
} = repositoryModule;
