'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { withParams } from '@/lib/qs';

/**
 * Recherche debouncée. Toute frappe remet la pagination à 1, sinon on se retrouve sur une page
 * vide dès que le résultat rétrécit.
 */
export function SearchBox({
  params,
  initial,
}: {
  params: Record<string, string>;
  initial: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initial);
  const submitted = useRef(initial);

  useEffect(() => {
    if (value === submitted.current) return;
    const t = setTimeout(() => {
      submitted.current = value;
      router.push(`${pathname}${withParams(params, { q: value.trim(), page: undefined })}`);
    }, 320);
    return () => clearTimeout(t);
  }, [value, params, pathname, router]);

  return (
    <div className="search">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Email, nom, handle ou UUID…"
        aria-label="Rechercher un utilisateur"
      />
    </div>
  );
}
