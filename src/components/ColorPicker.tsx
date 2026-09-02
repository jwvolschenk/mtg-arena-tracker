import { MTG_COLOR_LETTERS, MTG_COLORS, splitColors } from '@/lib/colors';
import ManaSymbol from './ManaSymbol';

/**
 * Uncontrolled checkbox row of mana pips for picking deck colors.
 * Checked boxes submit as repeat `name` entries in FormData; the DOM
 * checkbox is the source of truth, so no React state is needed.
 * `withMarker` adds a hidden input so PATCH can tell "all unticked"
 * apart from "field not sent at all".
 */
export default function ColorPicker({
  name = 'colors',
  selected = null,
  withMarker = false,
}: {
  name?: string;
  selected?: string | null;
  withMarker?: boolean;
}) {
  const chosen = splitColors(selected);
  return (
    <div role="group" aria-label="Deck colors" className="flex items-center gap-1.5">
      {withMarker && <input type="hidden" name="colors_set" value="1" />}
      {MTG_COLOR_LETTERS.map((letter) => (
        <label key={letter} title={MTG_COLORS[letter].name} className="cursor-pointer">
          <input
            type="checkbox"
            name={name}
            value={letter}
            defaultChecked={chosen.includes(letter)}
            className="peer sr-only"
          />
          <span className="block rounded-full opacity-45 transition hover:opacity-80 peer-checked:opacity-100 peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60">
            <ManaSymbol color={letter} size={26} />
          </span>
        </label>
      ))}
    </div>
  );
}
