import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MessageSquare, Link as LinkIcon } from 'lucide-react';
import PurchasedContentPicker from './PurchasedContentPicker';

interface SupporterCurrentAffirmationsModalProps {
  onSuccess?: () => void;
}

export default function SupporterCurrentAffirmationsModal({ onSuccess }: SupporterCurrentAffirmationsModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    link_url: '',
    linkedContentTitle: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to share affirmations');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please provide both title and content');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bulletin_posts')
        .insert({
          merchant_id: user.id,
          title: formData.title,
          content: formData.content,
          link_url: formData.link_url || null,
          post_type: 'current_affirmations'
        });

      if (error) throw error;

      toast.success('Your affirmation has been shared!');
      setFormData({ title: '', content: '', link_url: '', linkedContentTitle: '' });
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error creating affirmation:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      toast.error(`Failed to share affirmation: ${error?.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContent = (link: string, title: string) => {
    setFormData(prev => ({
      ...prev,
      link_url: link,
      linkedContentTitle: title
    }));
    toast.success(`Linked to: ${title}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MessageSquare className="mr-2 h-4 w-4" />
          Share Current Affirmations
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Your Current Affirmations</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Affirmation Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Share your thoughts and affirmations..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
              required
            />
          </div>
          <div className="space-y-2">
            <PurchasedContentPicker
              onSelectContent={handleSelectContent}
              selectedLink={formData.link_url}
            />
            {formData.linkedContentTitle && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-accent rounded">
                <LinkIcon className="h-4 w-4" />
                <span>Linked to: {formData.linkedContentTitle}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sharing...' : 'Share Affirmation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
