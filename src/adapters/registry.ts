import type { PortalAdapter } from './types';
import { idealistaAdapter } from './idealista';
import {
  fotocasaAdapter,
  habitacliaAdapter,
  milanunciosAdapter,
  pisosComAdapter,
  yaencontreAdapter,
} from './portals';

// All Phase-1 portals. Idealista has a bespoke adapter (energy-icon decoding);
// the rest are config-driven. The pipeline after extraction is adapter-agnostic.
export const ADAPTERS: readonly PortalAdapter[] = [
  idealistaAdapter,
  fotocasaAdapter,
  habitacliaAdapter,
  pisosComAdapter,
  yaencontreAdapter,
  milanunciosAdapter,
];

export function adapterForUrl(url: string): PortalAdapter | undefined {
  return ADAPTERS.find((a) => a.matches(url));
}
