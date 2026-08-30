import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Experience } from '@/hooks/useExperience';

/**
 * Shown right after login so the user picks which version of PIE to enter.
 * The choice is remembered locally and can be changed at any time.
 */
const ExperienceChooser = ({
  onChoose,
  onSignOut,
}: {
  onChoose: (e: Experience) => void;
  onSignOut?: () => void;
}) => {
  const [selected, setSelected] = useState<Experience>('new');

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900/70 border border-gray-700 rounded-2xl p-6 backdrop-blur">
        <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
        <p className="text-sm text-gray-400 mb-5">Choose which version of PIE you want to use.</p>

        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
          Version
        </label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as Experience)}
          className="w-full px-3 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="new">New PIE (redesigned experience)</option>
          <option value="classic">Original site (full dashboard)</option>
        </select>

        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          {selected === 'new'
            ? 'The redesigned mobile-first app. Everything you do here is live, not a test sandbox.'
            : 'The original dashboard with all existing features: store, contests, live, tokens and admin tools.'}
        </p>

        <Button
          onClick={() => onChoose(selected)}
          className="w-full mt-5 bg-sky-500 hover:bg-sky-400 text-white"
        >
          Continue
        </Button>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
};

export default ExperienceChooser;
