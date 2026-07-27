/** URL du proxy local — voir src/app/api/img/route.ts (buckets privés, lecture service_role). */
const imgUrl = (bucket: 'selfies' | 'generated', path: string) =>
  `/api/img?b=${bucket}&p=${encodeURIComponent(path)}`;

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
  return (
    <div className="ba__cell">
      <div className="ba__cap">{caption}</div>
      {path ? (
        // Pas de next/image : ces octets viennent d'un bucket privé via notre propre proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ba__img" src={imgUrl(bucket, path)} alt={caption} loading="lazy" />
      ) : (
        <div className="ba__none">{missing}</div>
      )}
    </div>
  );
}

export function BeforeAfter({
  selfiePath,
  resultPath,
  brief,
  error,
}: {
  selfiePath: string | null;
  resultPath: string | null;
  brief: string | null;
  error: string | null;
}) {
  return (
    <div className="ba">
      <div className="ba__pair">
        <Cell caption="Avant" bucket="selfies" path={selfiePath} missing="pas de selfie" />
        <Cell caption="Après" bucket="generated" path={resultPath} missing="pas de résultat" />
      </div>
      {error && <p className="ba__err">Erreur de génération : {error}</p>}
      {brief && <pre className="ba__brief">{brief}</pre>}
    </div>
  );
}
