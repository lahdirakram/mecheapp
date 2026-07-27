export function MetricCard({
  label,
  value,
  hint,
  accent,
  estimate,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  /** Marque les chiffres dérivés d'un prix catalogue plutôt que d'un montant réellement encaissé. */
  estimate?: boolean;
}) {
  return (
    <div className="card">
      <div className="card__label">
        {label}
        {estimate && (
          <span className="flag" title="Estimation : prix catalogue EUR, brut avant commission store et TVA">
            EST
          </span>
        )}
      </div>
      <div className={`card__value${accent ? ' card__value--accent' : ''}`}>{value}</div>
      {hint && <div className="card__hint">{hint}</div>}
    </div>
  );
}
