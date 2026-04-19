import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      className={styles.toggleBtn} 
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <div className={`${styles.iconContainer} ${theme === 'light' ? styles.isLight : ''}`}>
        <Sun className={styles.sunIcon} size={16} />
        <Moon className={styles.moonIcon} size={16} />
      </div>
      <span className={styles.toggleText}>
        {theme === 'light' ? 'Light' : 'Dark'}
      </span>
    </button>
  );
}
