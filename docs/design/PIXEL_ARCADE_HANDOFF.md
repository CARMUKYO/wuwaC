# Pixel Arcade restyle — handoff prompt for Claude Code

Design reference (private canvas, boards "D · Pixel Arcade" and
"D · Pixel Arcade (dark)"): https://claude.ai/artifact/TzDxsJa6NcNwj17iKDqSKx

Paste everything under **Prompt** into a Claude Code session opened on this
repo. The sections after it are the spec the prompt points at.

---

## Prompt

> Restyle the WuWa Optimizer UI from the current "Paper & Seal" look to the
> "Pixel Arcade" design specified in `docs/design/PIXEL_ARCADE_HANDOFF.md`.
> Read `AGENTS.md` first and keep its rules: no raw hex in components (add
> tokens in `src/index.css` instead), UI files only render, no domain math in
> `.tsx`, no new dependencies unless asked.
>
> Goal: an arcade / pixel-art feel that stays calm and easy to read. Pixel
> type and pixel frames on chrome (nav, headings, window title bars, buttons,
> big numbers, meters); readable rounded sans (Nunito) for body text, table
> values and forms. No scanlines, no neon, no CRT effects.
>
> Work in this order and keep the app building and tests green after each
> step (`npm run lint`, `npm run test`, `npm run build`):
>
> 1. **Tokens + fonts.** Replace the `@theme` palette and the
>    `[data-theme="ink"]` overrides in `src/index.css` with the Light and
>    Dark tables below (keep existing token names where the mapping says so,
>    add the new ones). Swap the Google Fonts link in `index.html` to
>    Pixelify Sans (500/600/700) + Nunito (500/700/800); set
>    `--font-display` to Pixelify Sans and `--font-sans` to Nunito; keep a
>    mono only if something truly needs it. Use tabular numerals for all
>    stat values. Every place that uses the accent as *text* (`text-seal`,
>    ~37 usages) must move to `text-accent-text`, because the new pink
>    accent is a fill colour and fails contrast as text.
> 2. **Pixel primitives** in `src/index.css` (utility classes) and
>    `src/ui/components/ui.tsx`: `px-frame` (stepped-corner outline + hard
>    drop shadow), `px-button` (primary / secondary / danger), `Window`
>    (panel with coloured title bar — replaces `Panel`), `SegmentMeter`
>    (N blocks, filled count), `CostPips`. Specs below. Remove the uppercase
>    letter-spaced mono "eyebrow" pattern everywhere; a heading alone is
>    enough.
> 3. **Pixel icons.** Add `src/ui/components/PixelIcon.tsx`: renders a
>    12×12 bitmap (strings below) as an inline SVG with
>    `shape-rendering="crispEdges"`, one `<path>` per colour index, colours
>    from tokens. Use it in the sidebar/top nav for the six sections. Write a
>    unit test that every bitmap is 12 rows × 12 columns and only uses
>    `.1234`.
> 4. **Shell.** Replace the left sidebar with the top bar from the design:
>    mascot + "WuWa**Opt**" wordmark, six pixel-icon tabs (active tab = pink
>    fill + outline + drop shadow), search / Ctrl K button on the right,
>    wraps on small screens. Remove `terminal-ground`, `FrequencyStrip`,
>    seal stamps, section numbers and blurbs.
> 5. **Mascot.** Add `src/ui/components/Mascot.tsx`: the sprite with the
>    sticker outline and the hop animation (CSS below), a ground shadow that
>    shrinks mid-jump, faster hop on hover, a 2-frame idle bob variant for
>    the small logo, and no animation under `prefers-reduced-motion`. The
>    image URL comes from one constant (`MASCOT_URL`). **Do not commit the
>    sprite file** — it is user-supplied character art, and AGENTS.md
>    forbids bundling copyrighted character art. Ask me where to load it
>    from; until then fall back to a pixel placeholder.
> 6. **Inventory page** to match the board: speech-bubble summary next to
>    the mascot (text computed from existing store data, no invented
>    numbers), cost-count tiles, an "Echo Box" window with filters and a
>    table where substats are aligned columns (CR / CD / ATK% / ER), a
>    10-block roll-value meter, and a "Status" window for the selected echo
>    with 4-block roll tiers per substat. If roll value / roll tier isn't
>    computed in the domain layer yet, add it there as a pure tested
>    function — or leave the column out and tell me; do not compute it in
>    the component.
> 7. **Remaining pages** (Roster, Calculator, Teams, Builds, Database):
>    apply the same primitives; no layout redesigns beyond swapping chrome.
> 8. Keep the theme toggle: light = default, dark = `[data-theme="ink"]`.
>    Update the Code Map section of `AGENTS.md` to describe the new system.
>
> Check: text contrast ≥ 4.5:1 in both themes, touch targets ≥ 36 px,
> keyboard focus visible (2 px accent-text outline), layout works at 390 px
> wide (nav wraps, tables scroll horizontally inside their window).
> Commit in logical steps; summarise anything you skipped.

---

## Tokens

Keep the token *names* the codebase already uses so most classes keep
working; values change. New tokens are marked **new**.

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | `#FBF4F1` | `#1A1726` | page ground |
| `panel` | `#FFFFFF` | `#24203A` | windows, header |
| `panel-2` | `#F6EEF0` | `#2E2948` | soft fills, inputs, secondary buttons |
| `panel-3` | `#E8DCE0` | `#3A3554` | empty meter blocks, off pips |
| `line` | `#E2D4D9` | `#3A3554` | dashed row dividers |
| `line-strong` | `#D8C6CD` | `#4A4168` | inactive chip/input borders |
| `ink` | `#2B2540` | `#F3EAF0` | body text |
| `fog` | `#6B6380` | `#B3A9C4` | secondary text |
| `dim` | `#B9AFBF` | `#6E6688` | empty-cell dash only (decorative) |
| `outline` **new** | `#2B2540` | `#5B4F80` | pixel frame outline |
| `outline-on-accent` **new** | `#2B2540` | `#14111F` | outline around pink/cyan buttons |
| `drop` **new** | `#EAD7DE` | `#0E0C16` | hard drop shadow under windows |
| `seal` (accent fill) | `#F7A8BC` | `#F7A8BC` | primary buttons, active tab |
| `seal-ink` | `#2B2540` | `#2B2540` | text on accent fill |
| `seal-wash` | `#FFF0F4` | `#3A2740` | selected table row |
| `accent-text` **new** | `#B4365A` | `#FF9DB6` | accent used as text / links / focus ring |
| `bar-a` **new** | `#BFEAF2` / text `#2B2540` | `#1F4A57` / text `#E6FBFF` | "Echo Box"-style title bar |
| `bar-b` **new** | `#FFD3DE` / text `#2B2540` | `#5A2C45` / text `#FFE6EE` | "Status"-style title bar |
| `meter` **new** | `#5FC6D8` | `#5FC6D8` | filled meter blocks |
| `pip` **new** | `#D9557A` | `#FF8FAB` | filled cost pips |
| `ember` (danger text) | `#A3253F` | `#FF9AAA` | delete buttons |
| `secondary-btn` **new** | `#BFEAF2` | `#8FDCEA` | Edit-style button fill (text `#2B2540`) |

Sonata tints for echo tiles (light / dark): Molten Rift `#FFE3D6`/`#4D3036`,
Void Thunder `#E7DEFA`/`#3A3160`, Celestial Light `#FFF2C2`/`#4A4226`,
Freezing Frost `#D9F0FA`/`#233F52`, Sierra Gale `#DDF3E2`/`#26453A`.
Other sets: pick a pastel / deep pair the same way.

Keep the existing attribute colours (`glacio`…`havoc`) but check their
contrast on the new grounds.

## Typography

- Display: **Pixelify Sans** 600/700 — nav tabs (16px), window titles
  (20px), buttons (15–16px), big numbers (28–32px), table headers (14px).
- Body: **Nunito** 500/700/800 — everything else, 14px base;
  `font-variant-numeric: tabular-nums` on all stat values.
- No letter-spaced uppercase labels.

## Primitives

**Pixel frame** (stepped corners — four offset shadows, no border-radius):

```css
.px-frame {
  box-shadow:
    0 -3px 0 0 var(--color-outline), 0 3px 0 0 var(--color-outline),
    -3px 0 0 0 var(--color-outline), 3px 0 0 0 var(--color-outline),
    0 9px 0 0 var(--color-drop);
}
```

Leave ≥ 12px of space around framed elements so the shadow isn't clipped.

**Buttons**: 2px stepped outline (same trick at 2px, `outline-on-accent`
on pink/cyan fills) plus `0 6px 0 0` hard shadow; on `:active` translate
down 4px and drop the shadow to `0 2px`. Primary = `seal` fill +
`seal-ink` text; secondary = `panel` fill; danger = `panel` fill +
`ember` text. Min height 40px (44px in the Status window).

**Window**: `px-frame` + title bar (`bar-a` or `bar-b`), 3px bottom
border in `outline`, Pixelify title left, actions right.

**Inputs / filter chips**: square corners, 2px border (`outline` when
active/focused, `line-strong` otherwise), 36px min height.

**Meters**: blocks with 2px gaps inside a 2px `outline` border. Roll value
= 10 blocks of 6×10px (filled = round(score/10)); substat tier = 4 blocks
of 8×8px; cost = 4 pips of 5×5px.

**Speech bubble**: `px-frame` without drop shadow, a 9px square "tail" in
`outline` colour on the side facing the mascot.

## Mascot animation

```css
.sticker { filter: drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff)
                   drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff); }
.hop { transform-origin: 50% 100%;
       animation: hop 1.8s cubic-bezier(.3,.7,.4,1) infinite; }
.hop:hover { animation-duration: .7s; }
.hop-shadow { animation: hop-shadow 1.8s cubic-bezier(.3,.7,.4,1) infinite; }
.bob { animation: bob 1s steps(2, jump-none) infinite; }

@keyframes hop {
  0%,100% { transform: translateY(0) scale(1,1); }
  8%  { transform: translateY(0) scale(1.1,.88); }      /* crouch */
  24% { transform: translateY(-34px) scale(.93,1.09); } /* stretch up */
  34% { transform: translateY(-38px) scale(1,1); }      /* apex */
  48% { transform: translateY(0) scale(1.12,.86); }     /* land squash */
  56% { transform: translateY(0) scale(.96,1.04); }
  64% { transform: translateY(0) scale(1,1); }          /* rest */
}
@keyframes hop-shadow {
  0%,8%,48%,100% { transform: scaleX(1);   opacity: .28; } /* dark: .5 */
  34%            { transform: scaleX(.55); opacity: .12; } /* dark: .2 */
}
@keyframes bob { 0%,100% { transform: translateY(0); }
                 50%     { transform: translateY(-2px); } }

@media (prefers-reduced-motion: reduce) {
  .hop, .hop-shadow, .bob { animation: none; }
}
```

Sprite always rendered with `image-rendering: pixelated`; banner size
132px inside a 140×176 box (room for the jump), logo 44px with `.bob`.
Shadow: 84×10px ellipse in `ink` (light) / black (dark), `margin-top: -6px`.
Put these keyframes in the Motion section of `src/index.css`.

## Pixel icons (12×12)

`.` transparent · `1` outline (`#2B2540` light / `#14111F` dark) ·
`2` base · `3` shade · `4` highlight. Colours per icon are the same in both
themes.

| Icon | Section | 2 | 3 | 4 |
|---|---|---|---|---|
| chest | Inventory | `#E9A15B` | `#F6C98A` | `#FFE58A` |
| head | Roster | `#F4A6B8` | `#FFE3D6` | `#E46B86` |
| sword | Calculator | `#F4A6B8` | `#9BA3C4` | `#E6F2FF` |
| heart | Teams | `#F07C98` | — | `#FFFFFF` |
| book | Builds | `#7FD3E2` | `#4BA8BA` | `#FFFFFF` |
| disk | Database | `#A9B2E6` | `#E6F2FF` | `#FFFFFF` |

(These colours go in tokens too, e.g. `--color-icon-chest-2`.)

```
chest          head           sword          heart          book           disk
............   ...111111...   ..........11   ............   .1111111111.   11111111111.
.1111111111.   ..12222221..   .........141   .111....111.   133222222221   122333332211
122222222221   .1222222221.   ........1431   14221..12221   132222222221   122313332221
123333333321   .1233333321.   .......1431.   142221122221   132244442221   122313332221
122222222221   .1313333131.   ......1431..   122222222221   132222222221   122333332221
111111111111   .1333333331.   ..1..1431...   122222222221   132244422221   122222222221
122211112221   .1334114331.   ..11.431....   .1222222221.   132222222221   122222222221
122214412221   ..13333331..   ...1131.....   ..12222221..   132222222221   121111111121
122211112221   ...111111...   ...1211.....   ...122221...   132222222221   121444444121
122222222221   ..12222221..   ..121.11....   ....1221....   134444444441   121411114121
111111111111   .1222222221.   .121........   .....11.....   131111111111   121444444121
............   .1111111111.   .11.........   ............   .1..........   111111111111
```

Render each colour index as one `<path>` built from horizontal runs
(`M{x} {y}h{len}v1h-{len}z`) with `viewBox="0 0 12 12"`; draw the outline
path last. Display at 24px (2× scale); keep sizes to whole multiples of 12.
