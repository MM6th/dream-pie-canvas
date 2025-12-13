import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import SupportTicketModal from "./SupportTicketModal";

interface TicketReply {
  id: string;
  reply_text: string;
  created_at: string;
  read_at: string | null;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const UserTicketsTab = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketReplies, setTicketReplies] = useState<Record<string, TicketReply[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);

  const fetchTickets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
  }, [user]);

  const toggleExpand = async (ticketId: string) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
      // Mark replies as read when expanded
      const replies = ticketReplies[ticketId] || [];
      const unreadReplies = replies.filter(r => !r.read_at);
      if (unreadReplies.length > 0) {
        await supabase
          .from('ticket_replies')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadReplies.map(r => r.id));
      }
    }
    setExpandedTickets(newExpanded);
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

  const getUnreadCount = (ticketId: string) => {
    const replies = ticketReplies[ticketId] || [];
    return replies.filter(r => !r.read_at).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">My Support Tickets</h3>
        <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="py-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No tickets yet. Submit a ticket if you need help!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const isExpanded = expandedTickets.has(ticket.id);
            const replies = ticketReplies[ticket.id] || [];
            const unreadCount = getUnreadCount(ticket.id);

            return (
              <Card key={ticket.id} className="bg-gray-700/50 border-gray-600">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-700/30 transition-colors"
                  onClick={() => toggleExpand(ticket.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-white text-base">{ticket.title}</CardTitle>
                        {getStatusBadge(ticket.status)}
                        {unreadCount > 0 && (
                          <Badge className="bg-red-600 text-white animate-pulse">
                            {unreadCount} new
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        Submitted {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
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
                      <p className="text-sm text-gray-400 mb-1">Your message:</p>
                      <p className="text-white whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                    
                    {replies.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-400">Admin Replies:</p>
                        {replies.map((reply) => (
                          <div key={reply.id} className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-4">
                            <p className="text-white whitespace-pre-wrap">{reply.reply_text}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <SupportTicketModal 
        open={showModal} 
        onOpenChange={setShowModal} 
        onSuccess={fetchTickets}
      />
    </div>
  );
};

export default UserTicketsTab;
