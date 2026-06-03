// Demo data ported from design_handoff_meche/meche-shared.jsx.
// Used for dev/UI work and as the basis for supabase/seed.sql — replace with API at runtime.

import type { CreditPack, FeedItem, SavedLook, Stylist } from '../types';

export const MFEED: FeedItem[] = [
  {
    id: 'f1',
    name: { fr: 'Carré flou caramel', en: 'Caramel soft bob' },
    tag: { fr: 'TENDANCE', en: 'TRENDING' },
    hair: 'bob',
    mood: 'warm',
    loves: '12.4k',
    desc: { fr: 'Doux aux épaules, reflets miel', en: 'Shoulder-soft, honey highlights' },
    source: {
      kind: 'studio',
      label: { fr: 'STUDIO MÈCHE', en: 'MÈCHE STUDIO' },
      by: { fr: 'Édition Été 26', en: 'Summer 26 edit' },
    },
  },
  {
    id: 'f2',
    name: { fr: 'Wolf cut', en: 'Wolf cut' },
    tag: { fr: 'NOUVEAU', en: 'NEW' },
    hair: 'long',
    mood: 'cool',
    loves: '8.1k',
    desc: { fr: 'Dégradé prononcé, énergie rock', en: 'Sharp layers, rock energy' },
    source: {
      kind: 'salon',
      label: { fr: 'CHEZ ATELIER BONAPARTE', en: 'AT ATELIER BONAPARTE' },
      by: { fr: 'Saint-Germain · Paris 6', en: 'Saint-Germain · Paris 6' },
      match: 96,
    },
  },
  {
    id: 'f3',
    name: { fr: 'Pixie texturé', en: 'Textured pixie' },
    tag: { fr: 'OSÉ', en: 'BOLD' },
    hair: 'pixie',
    mood: 'night',
    loves: '4.7k',
    desc: { fr: 'Très court, mouvement aérien', en: 'Very short, airy movement' },
    source: {
      kind: 'user',
      label: { fr: '@léa.dpt', en: '@lea.dpt' },
      by: { fr: 'A essayé · gardé en mèche', en: 'Tried · kept' },
    },
  },
  {
    id: 'f4',
    name: { fr: 'Boucles définies', en: 'Defined curls' },
    tag: { fr: 'POUR TOI', en: 'FOR YOU' },
    hair: 'curly',
    mood: 'blush',
    loves: '19.3k',
    desc: { fr: 'Boucles serrées, volume haut', en: 'Tight curls, high volume' },
    source: {
      kind: 'studio',
      label: { fr: 'STUDIO MÈCHE', en: 'MÈCHE STUDIO' },
      by: { fr: 'Référence éditoriale', en: 'Editorial reference' },
    },
  },
  {
    id: 'f5',
    name: { fr: 'Long lisse cendré', en: 'Sleek ash long' },
    tag: { fr: 'CLASSIQUE', en: 'CLASSIC' },
    hair: 'long',
    mood: 'sand',
    loves: '6.0k',
    desc: { fr: 'Cascade brillante, raie centrale', en: 'Glossy fall, center part' },
    source: {
      kind: 'salon',
      label: { fr: 'CHEZ STUDIO MARAIS', en: 'AT STUDIO MARAIS' },
      by: { fr: 'Marais · Paris 4', en: 'Marais · Paris 4' },
      match: 92,
    },
  },
];

export const MSALONS: Stylist[] = [
  { id: 's1', name: 'Atelier Bonaparte', salonId: 'sal1', area: 'Saint-Germain · Paris 6', dist: '0.4 km', rating: 4.8, reviews: 312, price: '€€€', open: true, match: 96 },
  { id: 's2', name: 'Studio Marais', salonId: 'sal2', area: 'Marais · Paris 4', dist: '1.1 km', rating: 4.7, reviews: 198, price: '€€', open: true, match: 92 },
  { id: 's3', name: 'République Coiff', salonId: 'sal3', area: 'République · Paris 11', dist: '2.3 km', rating: 4.5, reviews: 84, price: '€€', open: false, match: 88 },
  { id: 's4', name: 'La Maison Olive', salonId: 'sal4', area: 'Batignolles · Paris 17', dist: '3.0 km', rating: 4.9, reviews: 421, price: '€€€€', open: true, match: 81 },
];

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&h=800&fit=crop`;
export const MWARDROBE: SavedLook[] = [
  { id: 'w1', name: 'Carré flou caramel', hair: 'bob', mood: 'warm', loved: true, tag: 'été', image_url: U('1438761681033-6461ffad8d80') },
  { id: 'w2', name: 'Lob blond ondulé', hair: 'long', mood: 'sand', loved: false, tag: 'audace', image_url: U('1524250502761-1ac6f2e30d43') },
  { id: 'w3', name: 'Pixie texturé', hair: 'pixie', mood: 'night', loved: true, tag: 'pro', image_url: U('1506863530036-1efeddceb993') },
  { id: 'w4', name: 'Boucles volume', hair: 'curly', mood: 'blush', loved: false, tag: 'été', image_url: U('1519699047748-de8e457a634e') },
  { id: 'w5', name: 'Coupe courte', hair: 'short', mood: 'cool', loved: true, tag: 'classique', image_url: U('1535713875002-d1d0cf377fde') },
  { id: 'w6', name: 'Carré caramel', hair: 'bob', mood: 'olive', loved: false, tag: 'audace', image_url: U('1438761681033-6461ffad8d80') },
];

export const MUSER = {
  name: 'Camille',
  handle: '@camille.r',
  email: 'camille.r@gmail.com',
  since: '2026',
  credits: 7,
  total_purchased: 30,
  last_pack: 'Pack Star',
} as const;

export const MPACKS: CreditPack[] = [
  { id: 'taste', credits: 10, price: '4,99 €', unit: '0,50 €', badge: null },
  { id: 'star', credits: 25, price: '9,99 €', unit: '0,40 €', badge: 'popular' },
  { id: 'pro', credits: 60, price: '19,99 €', unit: '0,33 €', badge: 'best' },
];
