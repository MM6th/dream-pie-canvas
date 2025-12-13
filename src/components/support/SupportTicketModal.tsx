import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface SupportTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const SupportTicketModal = ({ open, onOpenChange, onSuccess }: SupportTicketModalProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to submit a ticket");
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      // Get admin ID for notification
      const ADMIN_ID = 'cedd3262-be80-4af4-9675-c081107cecb5';
      
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          status: 'pending'
        });

      if (error) throw error;

      // Create notification for admin
      await supabase
        .from('notifications')
        .insert({
          user_id: ADMIN_ID,
          type: 'support_ticket',
          title: 'New Support Ticket',
          message: `New support ticket submitted: "${title.trim()}"`
        });

      toast.success("Ticket submitted! Admin will reply at their earliest convenience.");
      setTitle("");
      setDescription("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      toast.error("Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-white">Submit a Support Ticket</DialogTitle>
          <DialogDescription className="text-gray-400">
            Describe your issue or question. Our admin team will respond at their earliest convenience.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">Title</Label>
            <Input
              id="title"
              placeholder="Brief summary of your issue..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              placeholder="Please describe your issue or question in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 min-h-[150px]"
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Ticket
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupportTicketModal;
