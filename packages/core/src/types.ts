// Shared domain types — mirror the Postgres schema (supabase/migrations) and the
// B2B↔B2C bridge. Hair/mood string unions match the MPortrait placeholder vocabulary.

export type Lang = 'fr' | 'en';
export type HairShape = 'short' | 'medium' | 'long' | 'curly' | 'pixie' | 'bob';
export type PortraitMood = 'warm' | 'cool' | 'blush' | 'olive' | 'night' | 'sand';

/**
 * Where a feed look comes from — drives the semantic color.
 * `studio` = editorial, `salon` = real salon (green + match%), `user` = community (blue).
 */
export type FeedSource = 'studio' | 'salon' | 'user';

export interface Profile {
  id: string; // = auth.users.id
  displayName: string;
  handle: string;
  lang: Lang;
  role: 'b2c' | 'pro';
  memberSince: string;
}

// ─── B2C ─────────────────────────────────────────────────────────────────────
export interface FeedItem {
  id: string;
  name: Record<Lang, string>;
  tag: Record<Lang, string>;
  hair: HairShape;
  mood: PortraitMood;
  loves: string;
  desc: Record<Lang, string>;
  source: {
    kind: FeedSource;
    label: Record<Lang, string>;
    by: Record<Lang, string>;
    match?: number; // % — only meaningful for salon sources
  };
}

export interface SavedLook {
  id: string;
  name: string;
  hair: HairShape;
  mood: PortraitMood;
  loved: boolean;
  tag: string;
  image_url?: string;
}

export interface CreditPack {
  id: 'taste' | 'star' | 'pro';
  credits: number;
  price: string;
  unit: string;
  badge: 'popular' | 'best' | null;
}

/** The AI try-on brief assembled from feed pick / prompt / manual sliders. */
export interface TryOnBrief {
  lookId?: string;
  prompt?: string;
  length?: number; // 0–1
  color?: string;
  fringe?: number; // 0–1
  mood?: PortraitMood;
}

export interface Generation {
  id: string;
  userId: string;
  selfiePath: string; // Storage path (private)
  brief: TryOnBrief;
  resultPath: string; // Storage path
  match?: number;
  createdAt: string;
}

// ─── Marketplace ───────────────────────────────────────────────────────────
export interface Stylist {
  id: string;
  name: string;
  salonId: string;
  area: string;
  dist: string;
  rating: number;
  reviews: number;
  price: '€' | '€€' | '€€€' | '€€€€';
  open: boolean;
  match: number; // % match to the user's current generation
}

export type SubscriptionPlan = 'solo' | 'salon' | 'maison';

// ─── The bridge: B2C generation → Pro inbox ──────────────────────────────────
export interface RequestDossier {
  currentLength: string;
  baseColor: string;
  targetColor: string;
  estBudget: string;
}

export interface StyleRequest {
  id: string;
  fromUserId: string;
  toStylistId: string;
  generationId: string;
  imagePath: string;
  dossier: RequestDossier;
  confidence: number; // match %
  unread: boolean;
  status: 'new' | 'replied' | 'booked' | 'declined';
  createdAt: string;
}

export type BookingStatus = 'confirmed' | 'live' | 'pending';

export interface Booking {
  id: string;
  stylistId: string;
  requestId?: string;
  status: BookingStatus;
  startsAt: string;
  durationMin: number;
  service: string;
  match?: number; // present on `live`
}
