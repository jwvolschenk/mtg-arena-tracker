import { access, mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from './api';
import { canonicalizeColors } from './colors';
import { UPLOAD_DIR } from './uploads';

/**
 * Minimal Scryfall client used when importing a deck: card details via
 * POST /cards/collection (batched, max 75 identifiers per call) and
 * artwork download (art_crop) into the local uploads directory.
 *
 * Scryfall terms: non-commercial fan tools are fine, with attribution —
 * same basis as the banner art in public/art (see README).
 */

const COLLECTION_URL = 'https://api.scryfall.com/cards/collection';
const REQUEST_HEADERS = {
  'User-Agent': 'mtg-arena-tracker/0.1',
  'Content-Type': 'application/json',
} as const;
const BATCH_SIZE = 75;
const MS_BETWEEN_BATCHES = 120;
const MAX_ART_BYTES = 10 * 1024 * 1024;

const ART_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Card details as we store them on deck entries. */
export interface ScryfallCard {
  scryfallId: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  manaCost: string | null;
  typeLine: string | null;
  /** Canonical WUBRG letters, e.g. "BG" — null for colorless. */
  colors: string | null;
  cmc: number | null;
  rarity: string | null;
  artUrl: string | null;
}

export interface ArenaCardRef {
  name: string;
  setCode: string;
  collectorNumber: string;
}

interface RawScryfallCard {
  object?: string;
  id?: string;
  name?: string;
  set?: string;
  collector_number?: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  colors?: string[];
  rarity?: string;
  image_uris?: { art_crop?: string };
  card_faces?: { mana_cost?: string; type_line?: string; image_uris?: { art_crop?: string } }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const setCollectorKey = (ref: { setCode: string; collectorNumber: string }) =>
  `${ref.setCode.toLowerCase()}|${ref.collectorNumber.toLowerCase()}`;

const nameKey = (name: string) => name.trim().toLowerCase();

function toScryfallCard(card: RawScryfallCard): ScryfallCard | null {
  if (!card.id || !card.name) return null;
  const frontFace = card.card_faces?.[0];
  const manaCost = card.mana_cost || frontFace?.mana_cost || null;
  const typeLine = card.type_line || frontFace?.type_line || null;
  const artUrl = card.image_uris?.art_crop ?? frontFace?.image_uris?.art_crop ?? null;

  return {
    scryfallId: card.id,
    name: card.name,
    setCode: (card.set ?? '').toUpperCase(),
    collectorNumber: card.collector_number ?? '',
    manaCost: manaCost === '' ? null : manaCost,
    typeLine,
    colors: canonicalizeColors(card.colors ?? []),
    cmc: card.cmc ?? null,
    rarity: card.rarity ?? null,
    artUrl,
  };
}

async function postCollection(
  identifiers: { set?: string; collector_number?: string; name?: string }[],
): Promise<RawScryfallCard[]> {
  let response: Response;
  try {
    response = await fetch(COLLECTION_URL, {
      method: 'POST',
      headers: REQUEST_HEADERS,
      body: JSON.stringify({ identifiers }),
    });
  } catch (err) {
    throw new ApiError(502, `Could not reach Scryfall: ${err instanceof Error ? err.message : 'network error'}`);
  }

  if (!response.ok) {
    throw new ApiError(502, `Scryfall lookup failed (${response.status})`);
  }

  const body = (await response.json()) as { data?: RawScryfallCard[] };
  return body.data ?? [];
}

/**
 * Fetches details for every ref. Refs are deduped by set/collector number
 * (the same card can appear on multiple boards). Cards the set/collector
 * lookup misses are retried by name; refs still missing come back in
 * `notFound` so the importer can warn instead of failing the whole deck.
 */
export async function fetchCards(refs: ArenaCardRef[]): Promise<{
  byRef: Map<string, ScryfallCard>;
  notFound: ArenaCardRef[];
}> {
  const uniqueRefs = new Map<string, ArenaCardRef>();
  for (const ref of refs) uniqueRefs.set(setCollectorKey(ref), ref);

  const byRef = new Map<string, ScryfallCard>();
  const notFound: ArenaCardRef[] = [];

  // Pass 1: set + collector number (exact printing).
  const batch = [...uniqueRefs.values()];
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    if (i > 0) await sleep(MS_BETWEEN_BATCHES);
    const chunk = batch.slice(i, i + BATCH_SIZE);
    const cards = await postCollection(
      chunk.map((ref) => ({ set: ref.setCode.toLowerCase(), collector_number: ref.collectorNumber })),
    );
    for (const raw of cards) {
      const card = toScryfallCard(raw);
      if (card) byRef.set(setCollectorKey(card), card);
    }
  }
  for (const ref of batch) {
    if (!byRef.has(setCollectorKey(ref))) notFound.push(ref);
  }

  // Pass 2: retry misses by name — Arena occasionally exports set codes or
  // collector numbers Scryfall doesn't index the same way.
  if (notFound.length > 0) {
    const byName = new Map<string, ScryfallCard>();
    const retry = [...notFound];
    notFound.length = 0;
    for (let i = 0; i < retry.length; i += BATCH_SIZE) {
      if (i > 0) await sleep(MS_BETWEEN_BATCHES);
      const chunk = retry.slice(i, i + BATCH_SIZE);
      const cards = await postCollection(chunk.map((ref) => ({ name: ref.name })));
      for (const raw of cards) {
        const card = toScryfallCard(raw);
        if (card) byName.set(nameKey(card.name), card);
      }
    }
    for (const ref of retry) {
      const card = byName.get(nameKey(ref.name));
      if (card) {
        // Keep the Arena printing's set/collector number for display.
        byRef.set(setCollectorKey(ref), { ...card, setCode: ref.setCode, collectorNumber: ref.collectorNumber });
      } else {
        notFound.push(ref);
      }
    }
  }

  return { byRef, notFound };
}

/** True if the filename has the exact shape we generate for card art. */
export function isValidCardArtFilename(filename: string): boolean {
  return /^card-[a-f0-9-]+\.(jpg|jpeg|png|webp)$/.test(filename);
}

/**
 * Downloads the card's artwork into UPLOAD_DIR and returns the filename.
 * Files are named after the Scryfall id, so art is shared across decks and
 * repeat imports. Returns null (never throws) when there is no art URL or
 * the download fails — the deck entry then simply renders without art.
 */
export async function downloadCardArt(card: ScryfallCard): Promise<string | null> {
  if (!card.artUrl) return null;

  const filename = `card-${card.scryfallId}`;
  const existing = await findExistingArt(filename);
  if (existing) return existing;

  try {
    const response = await fetch(card.artUrl, { headers: { 'User-Agent': REQUEST_HEADERS['User-Agent'] } });
    if (!response.ok) return null;

    const ext = ART_EXT_BY_MIME[response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''];
    if (!ext) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_ART_BYTES) return null;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const finalPath = path.join(UPLOAD_DIR, `${filename}.${ext}`);
    // Write-then-rename so a failed download never leaves a truncated file.
    await writeFile(`${finalPath}.tmp`, bytes);
    await rename(`${finalPath}.tmp`, finalPath);
    return `${filename}.${ext}`;
  } catch {
    return null;
  }
}

async function findExistingArt(baseName: string): Promise<string | null> {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    if (await access(path.join(UPLOAD_DIR, `${baseName}.${ext}`)).then(() => true, () => false)) {
      return `${baseName}.${ext}`;
    }
  }
  return null;
}
