import type { ListingCheck } from './types';

// What we know about a tab, as cached by the service worker.
export type TabState = { kind: 'result'; result: ListingCheck };

// Messages exchanged between content script, service worker and side panel.
export type Message =
  | { type: 'CHECK_RESULT'; result: ListingCheck }
  | { type: 'NO_LISTING' } // not a listing page / extraction failed
  | { type: 'OPEN_PANEL' }
  | { type: 'GET_RESULT'; tabId: number }
  | { type: 'RESULT_UPDATED'; tabId: number }
  // Panel -> content script: re-run analysis (worker lost its cache after an MV3
  // restart, or the panel opened before the first run).
  | { type: 'REANALYZE' };

export type GetResultResponse = { state: TabState | null };
