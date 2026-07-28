'use client';

import { useState } from 'react';

/** URL du proxy local — voir src/app/api/img/route.ts (buckets privés, lecture service_role). */
const imgUrl = (bucket: 'selfies' | 'generated', path: string) =>
  `/api/img?b=${bucket}&p=${encodeURIComponent(path)}`;

/**
 * Une cellule avant/après.
 *
 * Le chemin en base n'est PAS une garantie que le fichier existe : la suppression d'un look retire
 * les fichiers du storage puis annule les chemins, et ces deux étapes ne sont pas atomiques. Une
 * requête interrompue laisse donc un chemin qui ne pointe sur rien. Le backoffice est un outil de
 * diagnostic : il doit rapporter cet état, pas afficher une image cassée.
 */
function Cell({
  caption,
  bucket,
  path,
  missing,
}: {
  caption: string;
  bucket: 'selfies' | 'generated';
  path: string | null;
  missing: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="ba__cell">
      <div className="ba__cap">{caption}</div>
      {path && !failed ? (
        // Pas de next/image : ces octets viennent d'un bucket privé via notre propre proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="ba__img"
          src={imgUrl(bucket, path)}
          alt={caption}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="ba__none">
          {failed ? (
            <>
              <span>fichier absent du storage</span>
              <code className="ba__path">{path}</code>
            </>
          ) : (
            missing
          )}
        </div>
      )}
    </div>
  );
}

export function BeforeAfter({
  selfiePath,
  resultPath,
  brief,
  error,
  photosDeleted,
}: {
  selfiePath: string | null;
  resultPath: string | null;
  brief: string | null;
  error: string | null;
  /** Essai réussi dont les deux chemins sont nuls : l'utilisateur a supprimé son look. */
  photosDeleted: boolean;
}) {
  const missing = photosDeleted ? 'supprimée par l’utilisateur' : null;
  return (
    <div className="ba">
      <div className="ba__pair">
        <Cell
          caption="Avant"
          bucket="selfies"
          path={selfiePath}
          missing={missing ?? 'pas de selfie'}
        />
        <Cell
          caption="Après"
          bucket="generated"
          path={resultPath}
          missing={missing ?? 'pas de résultat'}
        />
      </div>
      {error && <p className="ba__err">Erreur de génération : {error}</p>}
      {brief && <pre className="ba__brief">{brief}</pre>}
    </div>
  );
}
