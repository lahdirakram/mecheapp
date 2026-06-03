# Menu Icon Distinction

_Started 2026-05-29 21:28 UTC_

---

## User

b2c menu change decouvrir picto as its diff from essayer

## Assistant

_[tool: grep]_

_[tool: list_files]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

I can see the issue — the **Découvrir** tab and the central **Essayer** button both use the `sparkle` picto, so they read as the same action. Sparkle belongs to the AI "Essayer" magic; Découvrir (browsing the feed) needs its own distinct mark. I'll add a compass icon and assign it to Découvrir.

_[tool: str_replace_edit]_

Done. The Découvrir tab now uses a distinct compass picto, while the sparkle stays reserved for the central Essayer button.

_[tool: done]_

Compass picto now distinguishes **Découvrir** from the sparkle on **Essayer**.

## User

when selected the compass becomes black or white circle

## Assistant

_[tool: str_replace_edit]_

Right — the compass is an outline icon, so when active (`fill` on, `stroke:0`) it floods to a solid disk and the needle disappears. I'll rebuild it as a single path with an even-odd needle cutout, so the filled state reads as a compass (disk with needle punched out) instead of a blob.

_[tool: done]_

_[tool: fork_verifier_agent]_

Fixed. The compass is now a single even-odd path: inactive it draws as a circle with a needle outline, and when selected the needle is punched out of the filled disk so it stays recognizable instead of becoming a solid circle. The verifier is confirming both states.

## User

Verifier agent check completed

## Assistant

Verified — the compass renders correctly in both selected and unselected states. Découvrir now has its own distinct picto, separate from the sparkle on Essayer.

