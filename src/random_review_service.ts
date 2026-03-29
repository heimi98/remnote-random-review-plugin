import { type Rem, type RemId, type RNPlugin } from '@remnote/plugin-sdk';

const OPEN_COUNTS_STORAGE_KEY = 'random-review/open-counts/v1';
const DOCUMENT_INDEX_STORAGE_KEY = 'random-review/document-index/v1';
const SCHEDULER_STATE_STORAGE_KEY = 'random-review/scheduler-state/v1';
const PENDING_REVIEW_STORAGE_KEY = 'random-review/pending-review/v1';
const RESET_MEMORY_LAST_VALUE_STORAGE_KEY = 'random-review/reset-memory-last-value/v1';

const DOCUMENT_INDEX_TTL_MS = 10 * 60 * 1000;
const DOCUMENT_BATCH_SIZE = 50;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RESET_MEMORY_SETTING_ID = 'reset_review_memory';

const DEFAULT_DIFFICULTY = 0.35;
const DEFAULT_STABILITY_DAYS = 2;
const DEFAULT_RETRIEVABILITY = 0.35;

export const NO_REVIEWABLE_DOCUMENTS_MESSAGE = 'No reviewable documents found yet. Add some content and roll again.';
export const NO_PENDING_REVIEW_MESSAGE = 'No pending review found. Roll to open a document first.';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type PrepareRandomDocumentResult = {
  document?: Rem;
  reason: 'ready' | 'no-reviewable';
};

export type PendingReviewState = {
  documentId: RemId;
  openedAt: number;
};

export type PendingReviewStatus = {
  pendingReview?: PendingReviewState;
};

type OpenCounts = Record<RemId, number>;

type DocumentIndexEntry = {
  id: RemId;
  updatedAt: number;
};

type DocumentIndexSnapshot = {
  indexedAt: number;
  documents: DocumentIndexEntry[];
};

type DocumentSchedulerState = {
  difficulty: number;
  stabilityDays: number;
  lastReviewAt: number;
  dueAt: number;
  reviewCount: number;
  lapseCount: number;
  lastRating?: ReviewRating;
};

type SchedulerState = Record<RemId, DocumentSchedulerState>;

const REVIEW_RATING_SET = new Set<ReviewRating>(['again', 'hard', 'good', 'easy']);

const randomReviewServices = new WeakMap<RNPlugin, RandomReviewService>();

export async function registerRandomReviewSettings(plugin: RNPlugin) {
  await plugin.settings.registerBooleanSetting({
    id: RESET_MEMORY_SETTING_ID,
    title: 'Reset Review Memory',
    description:
      'Toggle ON once to clear all random-review memory (open counts, scheduler state, and pending review).',
    defaultValue: false,
  });
}

export function primeRandomReviewCache(plugin: RNPlugin) {
  getRandomReviewService(plugin).prime();
}

export async function openWeightedRandomDocument(plugin: RNPlugin) {
  await getRandomReviewService(plugin).openWeightedRandomDocument();
}

export async function prepareWeightedRandomDocument(plugin: RNPlugin) {
  return getRandomReviewService(plugin).prepareWeightedRandomDocument();
}

export async function openPreparedRandomDocument(plugin: RNPlugin, document: Rem) {
  await getRandomReviewService(plugin).openPreparedRandomDocument(document);
}

export async function getPendingReviewStatus(plugin: RNPlugin) {
  return getRandomReviewService(plugin).getPendingReviewStatus();
}

export async function ratePendingReview(plugin: RNPlugin, rating: ReviewRating) {
  return getRandomReviewService(plugin).ratePendingReview(rating);
}

export async function skipPendingReview(plugin: RNPlugin) {
  return getRandomReviewService(plugin).skipPendingReview();
}

function getRandomReviewService(plugin: RNPlugin) {
  let service = randomReviewServices.get(plugin);

  if (!service) {
    service = new RandomReviewService(plugin);
    randomReviewServices.set(plugin, service);
  }

  return service;
}

function sanitizeOpenCounts(value: unknown): OpenCounts {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const sanitizedCounts: OpenCounts = {};

  for (const [id, count] of Object.entries(value)) {
    if (typeof count !== 'number' || !Number.isFinite(count)) {
      continue;
    }

    const normalizedCount = Math.max(0, Math.floor(count));

    if (normalizedCount > 0) {
      sanitizedCounts[id] = normalizedCount;
    }
  }

  return sanitizedCounts;
}

function sanitizeDocumentIndexSnapshot(value: unknown): DocumentIndexSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const snapshot = value as Partial<DocumentIndexSnapshot>;
  const indexedAt = typeof snapshot.indexedAt === 'number' && Number.isFinite(snapshot.indexedAt)
    ? snapshot.indexedAt
    : 0;
  const documents = Array.isArray(snapshot.documents)
    ? snapshot.documents
        .map((document): DocumentIndexEntry | undefined => {
          if (!document || typeof document !== 'object') {
            return undefined;
          }

          const candidate = document as Partial<DocumentIndexEntry>;

          if (typeof candidate.id !== 'string') {
            return undefined;
          }

          const updatedAt = typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
            ? candidate.updatedAt
            : 0;

          return {
            id: candidate.id,
            updatedAt,
          };
        })
        .filter((document): document is DocumentIndexEntry => Boolean(document))
    : [];

  return {
    indexedAt,
    documents,
  };
}

function sanitizeReviewRating(value: unknown): ReviewRating | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return REVIEW_RATING_SET.has(value as ReviewRating) ? (value as ReviewRating) : undefined;
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.min(maxValue, Math.max(minValue, value));
}

function sanitizeSchedulerState(value: unknown): SchedulerState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const sanitizedState: SchedulerState = {};

  for (const [id, state] of Object.entries(value)) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      continue;
    }

    const candidate = state as Partial<DocumentSchedulerState>;

    const difficulty =
      typeof candidate.difficulty === 'number' && Number.isFinite(candidate.difficulty)
        ? clamp(candidate.difficulty, 0, 1)
        : DEFAULT_DIFFICULTY;
    const stabilityDays =
      typeof candidate.stabilityDays === 'number' && Number.isFinite(candidate.stabilityDays)
        ? Math.max(0.1, candidate.stabilityDays)
        : DEFAULT_STABILITY_DAYS;
    const lastReviewAt =
      typeof candidate.lastReviewAt === 'number' && Number.isFinite(candidate.lastReviewAt)
        ? Math.max(0, candidate.lastReviewAt)
        : 0;
    const dueAt = typeof candidate.dueAt === 'number' && Number.isFinite(candidate.dueAt)
      ? Math.max(0, candidate.dueAt)
      : 0;
    const reviewCount =
      typeof candidate.reviewCount === 'number' && Number.isFinite(candidate.reviewCount)
        ? Math.max(0, Math.floor(candidate.reviewCount))
        : 0;
    const lapseCount =
      typeof candidate.lapseCount === 'number' && Number.isFinite(candidate.lapseCount)
        ? Math.max(0, Math.floor(candidate.lapseCount))
        : 0;

    sanitizedState[id] = {
      difficulty,
      stabilityDays,
      lastReviewAt,
      dueAt,
      reviewCount,
      lapseCount,
      lastRating: sanitizeReviewRating(candidate.lastRating),
    };
  }

  return sanitizedState;
}

function sanitizePendingReviewState(value: unknown): PendingReviewState | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Partial<PendingReviewState>;

  if (typeof candidate.documentId !== 'string') {
    return undefined;
  }

  const openedAt = typeof candidate.openedAt === 'number' && Number.isFinite(candidate.openedAt)
    ? candidate.openedAt
    : 0;

  return {
    documentId: candidate.documentId,
    openedAt: Math.max(0, openedAt),
  };
}

function formatOrdinal(count: number) {
  const remainderHundred = count % 100;

  if (remainderHundred >= 11 && remainderHundred <= 13) {
    return `${count}th`;
  }

  switch (count % 10) {
    case 1:
      return `${count}st`;
    case 2:
      return `${count}nd`;
    case 3:
      return `${count}rd`;
    default:
      return `${count}th`;
  }
}

class RandomReviewService {
  private openCounts: OpenCounts = {};
  private openCountsLoaded = false;
  private openCountsLoadPromise: Promise<OpenCounts> | undefined;
  private openCountsPersistQueue: Promise<void> = Promise.resolve();

  private schedulerState: SchedulerState = {};
  private schedulerStateLoaded = false;
  private schedulerStateLoadPromise: Promise<SchedulerState> | undefined;
  private schedulerStatePersistQueue: Promise<void> = Promise.resolve();

  private pendingReview: PendingReviewState | undefined;
  private pendingReviewLoaded = false;
  private pendingReviewLoadPromise: Promise<PendingReviewState | undefined> | undefined;
  private pendingReviewPersistQueue: Promise<void> = Promise.resolve();
  private resetCheckQueue: Promise<void> = Promise.resolve();
  private resetWatcherIntervalId: number | undefined;

  private documentIndex: DocumentIndexEntry[] = [];
  private documentIndexLoaded = false;
  private documentIndexLoadedAt = 0;
  private documentIndexLoadPromise: Promise<DocumentIndexEntry[]> | undefined;
  private documentIndexRefreshPromise: Promise<DocumentIndexEntry[]> | undefined;

  constructor(private readonly plugin: RNPlugin) {}

  prime() {
    this.startResetWatcher();
    void this.ensureResetAppliedFromSettings();
    void this.ensureOpenCountsLoaded();
    void this.ensureSchedulerStateLoaded();
    void this.ensurePendingReviewLoaded();
    void this.loadDocumentIndexFromStorage();
    void this.refreshDocumentIndexInBackground();
  }

  async openWeightedRandomDocument() {
    try {
      const result = await this.prepareWeightedRandomDocument();

      if (!result.document) {
        this.toast(NO_REVIEWABLE_DOCUMENTS_MESSAGE);
        return;
      }

      await this.openPreparedRandomDocument(result.document);
    } catch (error) {
      console.error('Error opening weighted random document:', error);
      this.toast('Failed to open random document. Please try again.');
    }
  }

  async prepareWeightedRandomDocument(): Promise<PrepareRandomDocumentResult> {
    await this.ensureResetAppliedFromSettings();
    await Promise.all([
      this.ensureOpenCountsLoaded(),
      this.ensureSchedulerStateLoaded(),
      this.ensurePendingReviewLoaded(),
    ]);

    const document = await this.selectDocumentToOpen();

    if (!document) {
      return { reason: 'no-reviewable' };
    }

    return {
      reason: 'ready',
      document,
    };
  }

  async openPreparedRandomDocument(document: Rem) {
    await this.ensureResetAppliedFromSettings();
    await Promise.all([
      this.ensureOpenCountsLoaded(),
      this.ensureSchedulerStateLoaded(),
      this.ensurePendingReviewLoaded(),
    ]);

    await document.openRemAsPage();

    const openCount = this.incrementOpenCount(document._id);
    this.setPendingReview({
      documentId: document._id,
      openedAt: Date.now(),
    });
    this.toast(this.getSuccessToastMessage(openCount));
  }

  async getPendingReviewStatus(): Promise<PendingReviewStatus> {
    await this.ensureResetAppliedFromSettings();
    const pendingReview = await this.ensurePendingReviewLoaded();

    return {
      pendingReview,
    };
  }

  async ratePendingReview(rating: ReviewRating) {
    await this.ensureResetAppliedFromSettings();
    await Promise.all([
      this.ensureSchedulerStateLoaded(),
      this.ensurePendingReviewLoaded(),
    ]);

    if (!this.pendingReview) {
      this.toast(NO_PENDING_REVIEW_MESSAGE);
      return false;
    }

    const now = Date.now();
    const currentState = this.getDocumentSchedulerState(this.pendingReview.documentId, now);
    const nextState = this.getNextSchedulerState(currentState, rating, now);

    this.schedulerState[this.pendingReview.documentId] = nextState;
    await Promise.all([
      this.enqueueSchedulerStatePersist(),
      this.clearPendingReview(),
    ]);

    this.toast(this.getRatingToastMessage(rating, nextState.stabilityDays));
    return true;
  }

  async skipPendingReview() {
    await this.ensureResetAppliedFromSettings();
    await this.ensurePendingReviewLoaded();

    if (!this.pendingReview) {
      this.toast(NO_PENDING_REVIEW_MESSAGE);
      return false;
    }

    await this.clearPendingReview();
    this.toast('Skipped rating for the last opened document.');
    return true;
  }

  private async selectDocumentToOpen(): Promise<Rem | undefined> {
    const invalidDocumentIds = new Set<RemId>();

    while (true) {
      const candidateDocuments = (await this.getDocumentIndex()).filter(
        (document) => !invalidDocumentIds.has(document.id)
      );

      if (candidateDocuments.length === 0) {
        return undefined;
      }

      const selectedDocument = this.selectWeightedDocument(candidateDocuments);

      if (!selectedDocument) {
        return undefined;
      }

      const resolvedDocument = await this.resolveReviewableDocument(selectedDocument.id);

      if (resolvedDocument) {
        return resolvedDocument;
      }

      invalidDocumentIds.add(selectedDocument.id);
      this.removeDocumentFromCache(selectedDocument.id);
    }
  }

  private async resolveReviewableDocument(documentId: RemId) {
    try {
      const document = await this.plugin.rem.findOne(documentId);

      if (!document) {
        return undefined;
      }

      const isDocument = await document.isDocument().catch(() => false);

      if (!isDocument) {
        return undefined;
      }

      const isReviewable = await this.hasReviewableContent(document);
      return isReviewable ? document : undefined;
    } catch (error) {
      console.error('Error resolving document:', error);
      return undefined;
    }
  }

  private async getDocumentIndex() {
    await this.loadDocumentIndexFromStorage();

    if (this.documentIndex.length > 0) {
      if (this.isDocumentIndexStale()) {
        void this.refreshDocumentIndexInBackground();
      }

      return this.documentIndex;
    }

    return this.refreshDocumentIndex();
  }

  private async loadDocumentIndexFromStorage() {
    if (this.documentIndexLoaded) {
      return this.documentIndex;
    }

    if (!this.documentIndexLoadPromise) {
      this.documentIndexLoadPromise = (async () => {
        try {
          const snapshot = sanitizeDocumentIndexSnapshot(
            await this.plugin.storage.getLocal<DocumentIndexSnapshot>(DOCUMENT_INDEX_STORAGE_KEY)
          );

          if (snapshot) {
            this.documentIndex = snapshot.documents;
            this.documentIndexLoadedAt = snapshot.indexedAt;
          } else {
            this.documentIndex = [];
            this.documentIndexLoadedAt = 0;
          }
        } catch (error) {
          console.error('Error loading document index cache:', error);
          this.documentIndex = [];
          this.documentIndexLoadedAt = 0;
        } finally {
          this.documentIndexLoaded = true;
          this.documentIndexLoadPromise = undefined;
        }

        return this.documentIndex;
      })();
    }

    return this.documentIndexLoadPromise;
  }

  private isDocumentIndexStale() {
    return Date.now() - this.documentIndexLoadedAt > DOCUMENT_INDEX_TTL_MS;
  }

  private async refreshDocumentIndexInBackground() {
    await this.loadDocumentIndexFromStorage();

    if (!this.documentIndex.length || this.isDocumentIndexStale()) {
      void this.refreshDocumentIndex();
    }
  }

  private async refreshDocumentIndex() {
    if (!this.documentIndexRefreshPromise) {
      this.documentIndexRefreshPromise = (async () => {
        try {
          const nextDocumentIndex = await this.buildDocumentIndex();

          this.documentIndex = nextDocumentIndex;
          this.documentIndexLoaded = true;
          this.documentIndexLoadedAt = Date.now();

          await this.persistDocumentIndex();
          await this.pruneOpenCounts(nextDocumentIndex);
          await this.pruneSchedulerState(nextDocumentIndex);
          await this.prunePendingReview(nextDocumentIndex);
        } catch (error) {
          console.error('Error refreshing document index:', error);
        } finally {
          this.documentIndexRefreshPromise = undefined;
        }

        return this.documentIndex;
      })();
    }

    return this.documentIndexRefreshPromise;
  }

  private async buildDocumentIndex() {
    const allNotes = await this.plugin.rem.getAll().catch((error) => {
      console.error('Error getting notes:', error);
      return [];
    });

    if (!Array.isArray(allNotes) || allNotes.length === 0) {
      return [];
    }

    const allDocuments: DocumentIndexEntry[] = [];

    for (let index = 0; index < allNotes.length; index += DOCUMENT_BATCH_SIZE) {
      const batch = allNotes.slice(index, index + DOCUMENT_BATCH_SIZE);
      const batchDocuments = await Promise.all(
        batch.map(async (note): Promise<DocumentIndexEntry | undefined> => {
          try {
            const isDocument = await note.isDocument().catch(() => false);

            if (!isDocument) {
              return undefined;
            }

            const isReviewable = await this.hasReviewableContent(note);

            if (!isReviewable) {
              return undefined;
            }

            return {
              id: note._id,
              updatedAt: typeof note.updatedAt === 'number' && Number.isFinite(note.updatedAt) ? note.updatedAt : 0,
            };
          } catch (error) {
            console.error('Error checking note type:', error);
            return undefined;
          }
        })
      );

      for (const document of batchDocuments) {
        if (document) {
          allDocuments.push(document);
        }
      }
    }

    return allDocuments;
  }

  private async persistDocumentIndex() {
    const snapshot: DocumentIndexSnapshot = {
      indexedAt: this.documentIndexLoadedAt,
      documents: this.documentIndex,
    };

    try {
      await this.plugin.storage.setLocal(DOCUMENT_INDEX_STORAGE_KEY, snapshot);
    } catch (error) {
      console.error('Error persisting document index cache:', error);
    }
  }

  private selectWeightedDocument(documents: DocumentIndexEntry[]) {
    return this.selectFsrsLiteWeightedDocument(documents);
  }

  private selectFsrsLiteWeightedDocument(documents: DocumentIndexEntry[]) {
    if (documents.length === 0) {
      return undefined;
    }

    const now = Date.now();
    let totalWeight = 0;
    const weightedDocuments = documents.map((document) => {
      const schedulerState = this.getDocumentSchedulerState(document.id, now);
      const stabilityMs = Math.max(0.1, schedulerState.stabilityDays) * DAY_IN_MS;
      const elapsedMs = Math.max(0, now - schedulerState.lastReviewAt);
      const retrievability = schedulerState.reviewCount > 0
        ? Math.exp(-(elapsedMs / stabilityMs))
        : DEFAULT_RETRIEVABILITY;
      const urgency = clamp(1 - retrievability, 0, 1);
      const overdueBoost = schedulerState.dueAt <= now
        ? 1 + Math.min(1.5, (now - schedulerState.dueAt) / (stabilityMs + 1))
        : 0.35;
      const noveltyBoost = schedulerState.reviewCount === 0 ? 0.25 : 0;
      const weight = 0.05 + urgency * 1.8 + overdueBoost + noveltyBoost;

      totalWeight += weight;

      return {
        document,
        weight,
      };
    });

    return this.pickDocumentByWeight(documents, weightedDocuments, totalWeight);
  }

  private pickDocumentByWeight(
    documents: DocumentIndexEntry[],
    weightedDocuments: { document: DocumentIndexEntry; weight: number }[],
    totalWeight: number
  ) {
    if (totalWeight <= 0) {
      const randomIndex = Math.floor(Math.random() * documents.length);
      return documents[randomIndex];
    }

    let threshold = Math.random() * totalWeight;

    for (const weightedDocument of weightedDocuments) {
      threshold -= weightedDocument.weight;

      if (threshold <= 0) {
        return weightedDocument.document;
      }
    }

    return weightedDocuments[weightedDocuments.length - 1]?.document;
  }

  private getDocumentSchedulerState(documentId: RemId, now: number): DocumentSchedulerState {
    const state = this.schedulerState[documentId];

    if (state) {
      return state;
    }

    return {
      difficulty: DEFAULT_DIFFICULTY,
      stabilityDays: DEFAULT_STABILITY_DAYS,
      lastReviewAt: 0,
      dueAt: now,
      reviewCount: 0,
      lapseCount: 0,
      lastRating: undefined,
    };
  }

  private getNextSchedulerState(currentState: DocumentSchedulerState, rating: ReviewRating, now: number): DocumentSchedulerState {
    let difficulty = currentState.difficulty;
    let stabilityDays = currentState.stabilityDays;
    let lapseCount = currentState.lapseCount;

    if (rating === 'again') {
      difficulty = clamp(difficulty + 0.15, 0, 1);
      stabilityDays = Math.max(0.5, stabilityDays * 0.45);
      lapseCount += 1;
    } else if (rating === 'hard') {
      difficulty = clamp(difficulty + 0.06, 0.1, 1);
      stabilityDays = Math.max(1, stabilityDays * (1.2 - 0.3 * difficulty));
    } else if (rating === 'good') {
      difficulty = clamp(difficulty - 0.04, 0.1, 1);
      stabilityDays = stabilityDays * (1.9 - 0.5 * difficulty);
    } else {
      difficulty = clamp(difficulty - 0.08, 0.1, 1);
      stabilityDays = stabilityDays * (2.6 - 0.6 * difficulty);
    }

    return {
      difficulty,
      stabilityDays,
      lastReviewAt: now,
      dueAt: now + stabilityDays * DAY_IN_MS,
      reviewCount: currentState.reviewCount + 1,
      lapseCount,
      lastRating: rating,
    };
  }

  private async ensureResetAppliedFromSettings() {
    this.resetCheckQueue = this.resetCheckQueue
      .catch(() => {})
      .then(async () => {
        const [isResetEnabled, lastResetFlag] = await Promise.all([
          this.getResetMemorySettingEnabled(),
          this.getLastResetSettingValue(),
        ]);

        if (isResetEnabled && !lastResetFlag) {
          await this.resetReviewMemory();
          await this.setLastResetSettingValue(true);
          return;
        }

        if (!isResetEnabled && lastResetFlag) {
          await this.setLastResetSettingValue(false);
        }
      });

    return this.resetCheckQueue;
  }

  private startResetWatcher() {
    if (this.resetWatcherIntervalId !== undefined || typeof window === 'undefined') {
      return;
    }

    this.resetWatcherIntervalId = window.setInterval(() => {
      void this.ensureResetAppliedFromSettings();
    }, 1200);
  }

  private async getResetMemorySettingEnabled() {
    try {
      const value = await this.plugin.settings.getSetting<boolean>(RESET_MEMORY_SETTING_ID);
      return value === true;
    } catch (error) {
      console.error('Error loading reset-memory setting:', error);
      return false;
    }
  }

  private async getLastResetSettingValue() {
    try {
      const value = await this.plugin.storage.getSynced<boolean>(RESET_MEMORY_LAST_VALUE_STORAGE_KEY);
      return value === true;
    } catch (error) {
      console.error('Error loading reset-memory setting state:', error);
      return false;
    }
  }

  private async setLastResetSettingValue(value: boolean) {
    try {
      await this.plugin.storage.setSynced(RESET_MEMORY_LAST_VALUE_STORAGE_KEY, value);
    } catch (error) {
      console.error('Error persisting reset-memory setting state:', error);
    }
  }

  private async resetReviewMemory() {
    await Promise.all([
      this.ensureOpenCountsLoaded(),
      this.ensureSchedulerStateLoaded(),
      this.ensurePendingReviewLoaded(),
    ]);

    this.openCounts = {};
    this.schedulerState = {};
    this.pendingReview = undefined;

    await Promise.all([
      this.enqueueOpenCountsPersist(),
      this.enqueueSchedulerStatePersist(),
      this.enqueuePendingReviewPersist(),
    ]);

    this.toast('Memory cleared successfully. Start reviewing again.');
  }

  private async ensureOpenCountsLoaded() {
    if (this.openCountsLoaded) {
      return this.openCounts;
    }

    if (!this.openCountsLoadPromise) {
      this.openCountsLoadPromise = (async () => {
        try {
          this.openCounts = sanitizeOpenCounts(
            await this.plugin.storage.getSynced<OpenCounts>(OPEN_COUNTS_STORAGE_KEY)
          );
        } catch (error) {
          console.error('Error loading synced open counts:', error);
          this.openCounts = {};
        } finally {
          this.openCountsLoaded = true;
          this.openCountsLoadPromise = undefined;
        }

        return this.openCounts;
      })();
    }

    return this.openCountsLoadPromise;
  }

  private async ensureSchedulerStateLoaded() {
    if (this.schedulerStateLoaded) {
      return this.schedulerState;
    }

    if (!this.schedulerStateLoadPromise) {
      this.schedulerStateLoadPromise = (async () => {
        try {
          this.schedulerState = sanitizeSchedulerState(
            await this.plugin.storage.getSynced<SchedulerState>(SCHEDULER_STATE_STORAGE_KEY)
          );
        } catch (error) {
          console.error('Error loading scheduler state:', error);
          this.schedulerState = {};
        } finally {
          this.schedulerStateLoaded = true;
          this.schedulerStateLoadPromise = undefined;
        }

        return this.schedulerState;
      })();
    }

    return this.schedulerStateLoadPromise;
  }

  private async ensurePendingReviewLoaded() {
    if (this.pendingReviewLoaded) {
      return this.pendingReview;
    }

    if (!this.pendingReviewLoadPromise) {
      this.pendingReviewLoadPromise = (async () => {
        try {
          this.pendingReview = sanitizePendingReviewState(
            await this.plugin.storage.getSynced<PendingReviewState>(PENDING_REVIEW_STORAGE_KEY)
          );
        } catch (error) {
          console.error('Error loading pending review:', error);
          this.pendingReview = undefined;
        } finally {
          this.pendingReviewLoaded = true;
          this.pendingReviewLoadPromise = undefined;
        }

        return this.pendingReview;
      })();
    }

    return this.pendingReviewLoadPromise;
  }

  private incrementOpenCount(documentId: RemId) {
    const nextOpenCount = (this.openCounts[documentId] ?? 0) + 1;
    this.openCounts[documentId] = nextOpenCount;
    void this.enqueueOpenCountsPersist();
    return nextOpenCount;
  }

  private setPendingReview(pendingReview: PendingReviewState) {
    this.pendingReview = pendingReview;
    void this.enqueuePendingReviewPersist();
  }

  private async clearPendingReview() {
    this.pendingReview = undefined;
    await this.enqueuePendingReviewPersist();
  }

  private async pruneOpenCounts(documentIndex: DocumentIndexEntry[]) {
    await this.ensureOpenCountsLoaded();

    const validDocumentIds = new Set(documentIndex.map((document) => document.id));
    let removedCount = 0;

    for (const documentId of Object.keys(this.openCounts)) {
      if (!validDocumentIds.has(documentId)) {
        delete this.openCounts[documentId];
        removedCount += 1;
      }
    }

    if (removedCount > 0) {
      await this.enqueueOpenCountsPersist();
    }
  }

  private async pruneSchedulerState(documentIndex: DocumentIndexEntry[]) {
    await this.ensureSchedulerStateLoaded();

    const validDocumentIds = new Set(documentIndex.map((document) => document.id));
    let removedCount = 0;

    for (const documentId of Object.keys(this.schedulerState)) {
      if (!validDocumentIds.has(documentId)) {
        delete this.schedulerState[documentId];
        removedCount += 1;
      }
    }

    if (removedCount > 0) {
      await this.enqueueSchedulerStatePersist();
    }
  }

  private async prunePendingReview(documentIndex: DocumentIndexEntry[]) {
    await this.ensurePendingReviewLoaded();

    if (!this.pendingReview) {
      return;
    }

    const validDocumentIds = new Set(documentIndex.map((document) => document.id));

    if (!validDocumentIds.has(this.pendingReview.documentId)) {
      await this.clearPendingReview();
    }
  }

  private enqueueOpenCountsPersist() {
    const openCountsSnapshot = { ...this.openCounts };

    this.openCountsPersistQueue = this.openCountsPersistQueue
      .catch(() => {})
      .then(async () => {
        try {
          await this.plugin.storage.setSynced(OPEN_COUNTS_STORAGE_KEY, openCountsSnapshot);
        } catch (error) {
          console.error('Error persisting synced open counts:', error);
        }
      });

    return this.openCountsPersistQueue;
  }

  private enqueueSchedulerStatePersist() {
    const schedulerStateSnapshot = { ...this.schedulerState };

    this.schedulerStatePersistQueue = this.schedulerStatePersistQueue
      .catch(() => {})
      .then(async () => {
        try {
          await this.plugin.storage.setSynced(SCHEDULER_STATE_STORAGE_KEY, schedulerStateSnapshot);
        } catch (error) {
          console.error('Error persisting scheduler state:', error);
        }
      });

    return this.schedulerStatePersistQueue;
  }

  private enqueuePendingReviewPersist() {
    const pendingReviewSnapshot = this.pendingReview ? { ...this.pendingReview } : undefined;

    this.pendingReviewPersistQueue = this.pendingReviewPersistQueue
      .catch(() => {})
      .then(async () => {
        try {
          await this.plugin.storage.setSynced(PENDING_REVIEW_STORAGE_KEY, pendingReviewSnapshot);
        } catch (error) {
          console.error('Error persisting pending review:', error);
        }
      });

    return this.pendingReviewPersistQueue;
  }

  private removeDocumentFromCache(documentId: RemId) {
    const nextDocumentIndex = this.documentIndex.filter((document) => document.id !== documentId);

    if (nextDocumentIndex.length === this.documentIndex.length) {
      return;
    }

    this.documentIndex = nextDocumentIndex;
    void this.persistDocumentIndex();
  }

  private async hasReviewableContent(document: Rem) {
    if (document.children.length > 0) {
      return true;
    }

    if (!document.backText) {
      return false;
    }

    try {
      return !(await this.plugin.richText.empty(document.backText));
    } catch (error) {
      console.error('Error checking document content:', error);
      return false;
    }
  }

  private getSuccessToastMessage(openCount: number) {
    const ordinal = formatOrdinal(openCount);
    const messages = [
      `Lucky roll! That's your ${ordinal} visit to this document.`,
      `Fresh roll! This is your ${ordinal} time opening this document.`,
      `Nice pull! You've landed on this document for the ${ordinal} time.`,
    ];

    return messages[Math.floor(Math.random() * messages.length)] ?? messages[0];
  }

  private getRatingToastMessage(rating: ReviewRating, nextIntervalDays: number) {
    const roundedDays = Math.max(0.5, Math.round(nextIntervalDays * 10) / 10);

    if (rating === 'again') {
      return `Marked as Again. We'll bring this back soon (~${roundedDays} days).`;
    }

    if (rating === 'hard') {
      return `Marked as Hard. Next review in about ${roundedDays} days.`;
    }

    if (rating === 'good') {
      return `Marked as Good. Next review in about ${roundedDays} days.`;
    }

    return `Marked as Easy. Next review in about ${roundedDays} days.`;
  }

  private toast(message: string) {
    void this.plugin.app.toast(message).catch(() => {});
  }
}
