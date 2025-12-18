import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ScriptWriterModal from "@/components/ScriptWriterModal";

const ScriptWriterCard = () => {
  const { user } = useAuth();
  const [scriptCount, setScriptCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const fetchScriptCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('film_scripts')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', user.id);

      if (!error && count !== null) {
        setScriptCount(count);
      }
    } catch (error) {
      console.error('Error fetching script count:', error);
    }
  };

  useEffect(() => {
    fetchScriptCount();
  }, [user]);

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm" data-tutorial="script-writer">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Script Writer
            </div>
            {scriptCount > 0 && (
              <Badge variant="secondary">{scriptCount} script{scriptCount !== 1 ? 's' : ''}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm mb-4">
            Write and manage your film scripts. Invite other users to read and collaborate on your scripts (messaging credits required for invitations).
          </p>
          <Button onClick={() => setShowModal(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {scriptCount > 0 ? 'Manage Scripts' : 'Write Your First Script'}
          </Button>
        </CardContent>
      </Card>

      <ScriptWriterModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          fetchScriptCount();
        }}
      />
    </>
  );
};

export default ScriptWriterCard;
