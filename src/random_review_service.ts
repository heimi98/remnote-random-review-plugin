import { type Rem, type RemId, type RNPlugin } from '@remnote/plugin-sdk';

const OPEN_COUNTS_STORAGE_KEY = 'random-review/open-counts/v1';
const DOCUMENT_INDEX_STORAGE_KEY = 'random-review/document-index/v1';
const DOCUMENT_INDEX_TTL_MS = 10 * 60 * 1000;
const DOCUMENT_BATCH_SIZE = 50;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const NO_REVIEWABLE_DOCUMENTS_MESSAGE = 'No reviewable documents found yet. Add some content and roll again.';

type OpenCounts = Record<RemId, number>;

type DocumentIndexEntry = {
  id: RemId;
  updatedAt: number;
};

type DocumentIndexSnapshot = {
  indexedAt: number;
  documents: DocumentIndexEntry[];
};

const randomReviewServices = new WeakMap<RNPlugin, RandomReviewService>();

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

  private documentIndex: DocumentIndexEntry[] = [];
  private documentIndexLoaded = false;
  private documentIndexLoadedAt = 0;
  private documentIndexLoadPromise: Promise<DocumentIndexEntry[]> | undefined;
  private documentIndexRefreshPromise: Promise<DocumentIndexEntry[]> | undefined;

  constructor(private readonly plugin: RNPlugin) {}

  prime() {
    void this.ensureOpenCountsLoaded();
    void this.loadDocumentIndexFromStorage();
    void this.refreshDocumentIndexInBackground();
  }

  async openWeightedRandomDocument() {
    try {
      const document = await this.prepareWeightedRandomDocument();

      if (!document) {
        this.toast(NO_REVIEWABLE_DOCUMENTS_MESSAGE);
        return;
      }

      await this.openPreparedRandomDocument(document);
    } catch (error) {
      console.error('Error opening weighted random document:', error);
      this.toast('Failed to open random document. Please try again.');
    }
  }

  async prepareWeightedRandomDocument() {
    await this.ensureOpenCountsLoaded();
    return this.selectDocumentToOpen();
  }

  async openPreparedRandomDocument(document: Rem) {
    await this.ensureOpenCountsLoaded();
    await document.openRemAsPage();

    const openCount = this.incrementOpenCount(document._id);
    this.toast(this.getSuccessToastMessage(openCount));
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

    return undefined;
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
    if (documents.length === 0) {
      return undefined;
    }

    const now = Date.now();
    let totalWeight = 0;
    const weightedDocuments = documents.map((document) => {
      const updatedAt = document.updatedAt > 0 ? document.updatedAt : now;
      const openCount = this.openCounts[document.id] ?? 0;
      const ageDays = Math.max(0, now - updatedAt) / DAY_IN_MS;
      const recencyFactor = 1 + Math.log1p(ageDays / 7);
      const openPenalty = 1 / Math.pow(openCount + 1, 1.35);
      const weight = 0.1 + recencyFactor * openPenalty;

      totalWeight += weight;

      return {
        document,
        weight,
      };
    });

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

  private incrementOpenCount(documentId: RemId) {
    const nextOpenCount = (this.openCounts[documentId] ?? 0) + 1;
    this.openCounts[documentId] = nextOpenCount;
    void this.enqueueOpenCountsPersist();
    return nextOpenCount;
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

  private toast(message: string) {
    void this.plugin.app.toast(message).catch(() => {});
  }
}
