import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

/**
 * Sandbox page for prototyping a new user dashboard UI.
 * This page is intentionally isolated — nothing here should import from
 * or mutate the existing dashboards. Build freely inside this file (or
 * new files under src/components/new-user-ui/) without touching the
 * current production dashboards.
 */
const NewUserUITestPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-foreground">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-purple-600/50 text-purple-300 hover:bg-purple-900/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-sm text-muted-foreground">
            Admin sandbox · New User UI
          </div>
        </div>

        <div className="rounded-xl border border-purple-600/30 bg-black/40 backdrop-blur-sm p-8">
          <h1 className="text-2xl font-bold mb-2">New User UI — Sandbox</h1>
          <p className="text-muted-foreground mb-6">
            This is an isolated space to prototype the next-generation user
            dashboard. Nothing built here affects the live dashboards.
          </p>

          <div className="rounded-lg border border-dashed border-purple-500/40 p-10 text-center text-muted-foreground">
            Start building the new dashboard here.
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUserUITestPage;
