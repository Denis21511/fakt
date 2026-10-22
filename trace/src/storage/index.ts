import { createLocalRepository } from './localRepository';
import type { TraceRepository } from './repository';

/** Единственная точка выбора хранилища. Для сервера — заменить на createRemoteRepository(). */
export const repository: TraceRepository = createLocalRepository();

export { RepositoryError } from './repository';
export type { TraceRepository } from './repository';
export type { StoredFile, StorageUsage } from './fileStore';
