import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Edit, Trash2, Users, Save, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import ScriptInviteModal from "@/components/ScriptInviteModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Script {
  id: string;
  title: string;
  script_content: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ScriptWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScriptWriterModal = ({ isOpen, onClose }: ScriptWriterModalProps) => {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingScriptId, setDeletingScriptId] = useState<string | null>(null);
  const [invitingScript, setInvitingScript] = useState<Script | null>(null);

  const fetchScripts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('film_scripts')
        .select('*')
        .eq('merchant_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setScripts(data || []);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScripts();
      setView('list');
    }
  }, [isOpen, user]);

  const handleNewScript = () => {
    setEditingScript(null);
    setTitle("");
    setContent("");
    setView('edit');
  };

  const handleEditScript = (script: Script) => {
    setEditingScript(script);
    setTitle(script.title);
    setContent(script.script_content || "");
    setView('edit');
  };

  const handleSave = async () => {
    if (!user) return;

    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a script title.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      if (editingScript) {
        // Update existing script
        const { error } = await supabase
          .from('film_scripts')
          .update({
            title: title.trim(),
            script_content: content
          })
          .eq('id', editingScript.id);

        if (error) throw error;
        toast({ title: "Success", description: "Script saved successfully!" });
      } else {
        // Create new script
        const { error } = await supabase
          .from('film_scripts')
          .insert({
            merchant_id: user.id,
            title: title.trim(),
            script_content: content,
            status: 'draft'
          });

        if (error) throw error;
        toast({ title: "Success", description: "New script created!" });
      }

      fetchScripts();
      setView('list');
    } catch (error: any) {
      console.error('Error saving script:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save script.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingScriptId) return;

    try {
      const { error } = await supabase
        .from('film_scripts')
        .delete()
        .eq('id', deletingScriptId);

      if (error) throw error;

      toast({ title: "Success", description: "Script deleted successfully." });
      fetchScripts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete script.",
        variant: "destructive"
      });
    } finally {
      setDeletingScriptId(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {view === 'list' ? 'My Scripts' : editingScript ? 'Edit Script' : 'New Script'}
            </DialogTitle>
            <DialogDescription>
              {view === 'list' 
                ? 'Manage your film scripts and invite collaborators.'
                : 'Write your script content below. Auto-saves are not enabled, remember to save!'}
            </DialogDescription>
          </DialogHeader>

          {view === 'list' ? (
            <div className="space-y-4">
              <Button onClick={handleNewScript} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create New Script
              </Button>

              <ScrollArea className="max-h-[60vh]">
                {isLoading ? (
                  <p className="text-gray-400 text-center py-4">Loading scripts...</p>
                ) : scripts.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">No scripts yet. Start writing!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scripts.map((script) => (
                      <div
                        key={script.id}
                        className="bg-gray-700/50 border border-gray-600 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-medium">{script.title}</h3>
                            <p className="text-gray-400 text-sm mt-1">
                              Last updated: {new Date(script.updated_at).toLocaleDateString()}
                            </p>
                            <Badge variant="secondary" className="mt-2">
                              {script.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInvitingScript(script)}
                              title="Invite readers"
                            >
                              <Users className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditScript(script)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeletingScriptId(script.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => setView('list')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Scripts
              </Button>

              <div>
                <Label htmlFor="script-title" className="text-white">Script Title *</Label>
                <Input
                  id="script-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter script title"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="script-content" className="text-white">Script Content</Label>
                <ScrollArea className="h-[400px] w-full rounded-md border border-gray-600">
                  <Textarea
                    id="script-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing your script here...

INT. LOCATION - DAY

Character enters the scene...

CHARACTER
(emotion)
Dialogue goes here."
                    className="bg-gray-700 border-0 text-white min-h-[400px] font-mono text-sm resize-none"
                  />
                </ScrollArea>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setView('list')} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Script"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {invitingScript && (
        <ScriptInviteModal
          isOpen={!!invitingScript}
          onClose={() => setInvitingScript(null)}
          script={invitingScript}
        />
      )}

      <AlertDialog open={!!deletingScriptId} onOpenChange={() => setDeletingScriptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Script</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this script? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ScriptWriterModal;
