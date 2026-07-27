import type { NextRequest } from 'next/server';
import { isImageBucket, storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Proxy d'image : GET /api/img?b=<bucket>&p=<path>
 *
 * Les deux buckets sont privés et leurs policies sont scopées sur auth.uid()
 * (0009_store_hardening.sql:34-44), donc seul service_role peut lire la photo d'un autre
 * utilisateur. On streame les octets plutôt que de renvoyer une URL signée : rien de partageable
 * ne sort du backoffice, et un simple <img src> suffit côté page.
 *
 * Le bucket est validé par allowlist. Le chemin est une clé d'objet passée telle quelle au SDK
 * Storage (pas un chemin de système de fichiers), et il vient toujours de generations.selfie_path /
 * result_path lus en base, jamais reconstruits.
 */
export async function GET(req: NextRequest) {
  const bucket = req.nextUrl.searchParams.get('b') ?? '';
  const path = req.nextUrl.searchParams.get('p') ?? '';

  if (!isImageBucket(bucket)) {
    return new Response('bucket non autorisé', { status: 400 });
  }
  if (!path) {
    return new Response('chemin manquant', { status: 400 });
  }

  const { data, error } = await storage().from(bucket).download(path);
  if (error || !data) {
    return new Response(`introuvable: ${error?.message ?? 'inconnu'}`, { status: 404 });
  }

  return new Response(await data.arrayBuffer(), {
    headers: {
      'content-type': data.type || 'image/jpeg',
      // Privé : ces images ne doivent jamais atterrir dans un cache partagé.
      'cache-control': 'private, max-age=3600',
      'content-disposition': 'inline',
    },
  });
}
