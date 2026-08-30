import { useNavigate } from 'react-router-dom';
import { Experience, useExperience } from '@/hooks/useExperience';

/**
 * Compact dropdown that lets the user jump between the original site
 * and the redesigned app at any time.
 */
const ExperienceSwitcher = ({ className = '' }: { className?: string }) => {
  const navigate = useNavigate();
  const { experience, setExperience } = useExperience();

  const handleChange = (next: Experience) => {
    setExperience(next);
    navigate(next === 'new' ? '/app' : '/');
  };

  return (
    <select
      value={experience ?? 'classic'}
      onChange={(e) => handleChange(e.target.value as Experience)}
      aria-label="Choose app version"
      className={`px-2 py-1 h-8 rounded-md bg-gray-800 border border-gray-600 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 ${className}`}
    >
      <option value="classic">Original site</option>
      <option value="new">New PIE</option>
    </select>
  );
};

export default ExperienceSwitcher;
