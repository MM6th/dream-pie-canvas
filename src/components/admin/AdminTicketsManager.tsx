import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, MessageSquare, ChevronDown, ChevronUp, Send, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface TicketReply {
  id: string;
  reply_text: string;
  created_at: string;
  admin_id: string;
}

interface Ticket {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string | null;
    email: string;
  };
}

const AdminTicketsManager = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketReplies, setTicketReplies] = useState<Record<string, TicketReply[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchTickets = async () => {
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data || []);

      // Fetch replies for all tickets
      if (data && data.length > 0) {
        const ticketIds = data.map(t => t.id);
        const { data: replies, error: repliesError } = await supabase
          .from('ticket_replies')
          .select('*')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: true });

        if (!repliesError && replies) {
          const repliesByTicket: Record<string, TicketReply[]> = {};
          replies.forEach(reply => {
            if (!repliesByTicket[reply.ticket_id]) {
              repliesByTicket[reply.ticket_id] = [];
            }
            repliesByTicket[reply.ticket_id].push(reply);
          });
          setTicketReplies(repliesByTicket);
        }
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const toggleExpand = (ticketId: string) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedTickets(newExpanded);
  };

  const handleReplySubmit = async (ticketId: string) => {
    const replyText = replyTexts[ticketId]?.trim();
    if (!replyText || !user) return;

    setSubmittingReply(ticketId);
    try {
      const { error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: ticketId,
          admin_id: user.id,
          reply_text: replyText
        });

      if (error) throw error;

      toast.success("Reply sent successfully");
      setReplyTexts(prev => ({ ...prev, [ticketId]: "" }));
      fetchTickets();
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error("Failed to send reply");
    } finally {
      setSubmittingReply(null);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success(`Ticket status updated to ${newStatus}`);
      fetchTickets();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket? This action cannot be undone.")) {
      return;
    }

    setDeletingTicket(ticketId);
    try {
      // First delete the replies
      await supabase
        .from('ticket_replies')
        .delete()
        .eq('ticket_id', ticketId);

      // Then delete the ticket
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast.success("Ticket deleted successfully");
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error("Failed to delete ticket");
    } finally {
      setDeletingTicket(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-600 text-white">Pending</Badge>;
      case 'replied':
        return <Badge className="bg-green-600 text-white">Replied</Badge>;
      case 'closed':
        return <Badge className="bg-gray-600 text-white">Closed</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">{status}</Badge>;
    }
  };

  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">Support Tickets</h3>
          {pendingCount > 0 && (
            <Badge className="bg-red-600 text-white animate-pulse">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all" className="text-white">All Tickets</SelectItem>
            <SelectItem value="pending" className="text-white">Pending</SelectItem>
            <SelectItem value="replied" className="text-white">Replied</SelectItem>
            <SelectItem value="closed" className="text-white">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tickets.length === 0 ? (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="py-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No tickets found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const isExpanded = expandedTickets.has(ticket.id);
            const replies = ticketReplies[ticket.id] || [];
            const userName = ticket.profiles?.display_name || ticket.profiles?.email || 'Unknown User';

            return (
              <Card key={ticket.id} className="bg-gray-700/50 border-gray-600">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-700/30 transition-colors"
                  onClick={() => toggleExpand(ticket.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-white text-base">{ticket.title}</CardTitle>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                        <User className="w-3 h-3" />
                        <span>{userName}</span>
                        <span>•</span>
                        <span>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">User's message:</p>
                      <p className="text-white whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                    
                    {replies.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-400">Previous Replies:</p>
                        {replies.map((reply) => (
                          <div key={reply.id} className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-4">
                            <p className="text-white whitespace-pre-wrap">{reply.reply_text}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              Admin reply • {format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3 pt-2 border-t border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-400">Update Status:</span>
                          <Select 
                            value={ticket.status} 
                            onValueChange={(value) => handleStatusChange(ticket.id, value)}
                          >
                            <SelectTrigger className="w-[130px] bg-gray-700 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="pending" className="text-white">Pending</SelectItem>
                              <SelectItem value="replied" className="text-white">Replied</SelectItem>
                              <SelectItem value="closed" className="text-white">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTicket(ticket.id)}
                          disabled={deletingTicket === ticket.id}
                        >
                          {deletingTicket === ticket.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      <Textarea
                        placeholder="Type your reply..."
                        value={replyTexts[ticket.id] || ""}
                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                      />
                      <Button
                        onClick={() => handleReplySubmit(ticket.id)}
                        disabled={!replyTexts[ticket.id]?.trim() || submittingReply === ticket.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {submittingReply === ticket.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTicketsManager;
