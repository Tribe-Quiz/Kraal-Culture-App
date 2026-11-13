import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme';

export default function ThemeToggle({ floating = false }) {
  const [theme, toggle] = useTheme();
  const toLight = theme === 'dark';
  const label = toLight ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button
      type="button"
      className={`theme-toggle${floating ? ' theme-toggle--floating' : ''}`}
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {toLight ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
