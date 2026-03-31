import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Bell, Calendar, Eye, Reply, ChevronDown, ChevronUp } from "lucide-react";
import beeperIcon from '@/assets/beeper-message.png';
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AstrologyBirthInfoModal } from "./AstrologyBirthInfoModal";
import { BirthInfoDetailModal } from "./BirthInfoDetailModal";
import { MessageComposer } from "./messaging/MessageComposer";
import { useMessagingCredits } from "@/hooks/useMessagingCredits";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  related_delivery_id?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  attachment_url: string | null;
  sender?: { display_name: string; avatar_url: string | null; user_type?: string };
  recipient?: { display_name: string; avatar_url: string | null };
}

interface UnifiedInboxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userType: string;
}

export const UnifiedInboxModal = ({ open, onOpenChange, userId, userType }: UnifiedInboxModalProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [messageTab, setMessageTab] = useState<"received" | "sent">("received");
  
  // Birth info modals
  const [birthInfoModalOpen, setBirthInfoModalOpen] = useState(false);
  const [birthInfoDetailModalOpen, setBirthInfoDetailModalOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>("");
  const [productType, setProductType] = useState<string>("other");
  const [deliveryBuyerIds, setDeliveryBuyerIds] = useState<Record<string, string>>({});
  
  // Reply composer
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  
  const { balance, refetch: refetchCredits } = useMessagingCredits(userId);

  useEffect(() => {
    if (open && userId) {
      fetchNotifications();
      fetchMessages();
    }
  }, [open, userId]);

  useEffect(() => {
    if (!userId) return;
    
    const notificationChannel = supabase
      .channel("unified-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => fetchNotifications()
      )
      .subscribe();

    const messageChannel = supabase
      .channel("unified-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      // Force fresh data by using a cache-bust approach
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      console.log("Fetched notifications:", data?.map(n => ({ id: n.id, title: n.title, read: n.read })));
      
      setNotifications(data || []);
      setUnreadNotificationsCount(data?.filter(n => !n.read).length || 0);

      // Fetch buyer IDs for purchase notifications
      const purchaseNotifications = data?.filter(n => n.type === 'purchase' && n.related_delivery_id) || [];
      if (purchaseNotifications.length > 0) {
        const deliveryIds = purchaseNotifications.map(n => n.related_delivery_id!);
        const { data: deliveries } = await supabase
          .from('astrology_deliveries')
          .select('id, buyer_id')
          .in('id', deliveryIds);

        if (deliveries) {
          const buyerMap: Record<string, string> = {};
          deliveries.forEach(d => {
            buyerMap[d.id] = d.buyer_id;
          });
          setDeliveryBuyerIds(buyerMap);
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchMessages = async () => {
    if (!userId) return;

    try {
      const { data: sent, error: sentError } = await supabase
        .from('messages')
        .select(`*, recipient:profiles!messages_recipient_id_fkey(display_name, avatar_url)`)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (sentError) throw sentError;
      setSentMessages(sent || []);

      const { data: received, error: receivedError } = await supabase
        .from('messages')
        .select(`*, sender:profiles!messages_sender_id_fkey(display_name, avatar_url, user_type)`)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (receivedError) throw receivedError;
      setReceivedMessages(received || []);
      setUnreadMessagesCount(received?.filter(m => !m.read_at).length || 0);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;
      fetchNotifications();
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
      fetchMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleSubmitBirthInfo = async (deliveryId: string) => {
    try {
      const { data: delivery } = await supabase
        .from('astrology_deliveries')
        .select('astrology_product_id')
        .eq('id', deliveryId)
        .single();

      if (delivery) {
        const { data: product } = await supabase
          .from('astrology_products')
          .select('product_type')
          .eq('id', delivery.astrology_product_id)
          .single();

        setProductType(product?.product_type || 'other');
      }

      setSelectedDeliveryId(deliveryId);
      setBirthInfoModalOpen(true);
    } catch (error) {
      console.error('Error fetching product type:', error);
      setSelectedDeliveryId(deliveryId);
      setBirthInfoModalOpen(true);
    }
  };

  const handleReply = (message: Message) => {
    setSelectedMessage(message);
    setShowReplyComposer(true);
  };

  const handleMessageSent = () => {
    setShowReplyComposer(false);
    fetchMessages();
    refetchCredits();
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "purchase": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      case "ready": return "bg-green-500";
      case "overdue": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Inbox
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="notifications" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                Notifications
                {unreadNotificationsCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{unreadNotificationsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2">
                Messages
                {unreadMessagesCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{unreadMessagesCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="flex-1 mt-4 min-h-0">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No notifications</p>
                  ) : (
                    notifications.map((notification) => (
                      <Card
                        key={notification.id}
                        className={`cursor-pointer transition-colors ${!notification.read ? 'border-primary bg-primary/5' : ''}`}
                        onClick={() => {
                          setExpandedNotificationId(expandedNotificationId === notification.id ? null : notification.id);
                          if (!notification.read) markNotificationAsRead(notification.id);
                        }}
                      >
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                                {expandedNotificationId === notification.id ? (
                                  <ChevronUp className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                              
                              {expandedNotificationId === notification.id && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                                  {notification.type === 'purchase' && 
                                   notification.related_delivery_id && 
                                   deliveryBuyerIds[notification.related_delivery_id] === userId && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSubmitBirthInfo(notification.related_delivery_id!);
                                      }}
                                    >
                                      <Calendar className="w-4 h-4 mr-2" />
                                      Submit Birth Info
                                    </Button>
                                  )}
                                  {notification.type === 'birth_info_submitted' && 
                                   notification.related_delivery_id && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDeliveryId(notification.related_delivery_id!);
                                        setBirthInfoDetailModalOpen(true);
                                      }}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
              {unreadNotificationsCount > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <Button variant="ghost" size="sm" onClick={markAllNotificationsAsRead} className="w-full">
                    <Check className="w-4 h-4 mr-2" />
                    Mark all as read
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="messages" className="flex-1 mt-4 min-h-0">
              <div className="flex gap-2 mb-3">
                <Button
                  variant={messageTab === "received" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMessageTab("received")}
                  className="flex-1"
                >
                  Received
                  {unreadMessagesCount > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">{unreadMessagesCount}</Badge>
                  )}
                </Button>
                <Button
                  variant={messageTab === "sent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMessageTab("sent")}
                  className="flex-1"
                >
                  Sent
                </Button>
              </div>

              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-2">
                  {messageTab === "received" ? (
                    receivedMessages.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No received messages</p>
                    ) : (
                      receivedMessages.map((message) => (
                        <Card
                          key={message.id}
                          className={`cursor-pointer transition-colors ${!message.read_at ? 'border-primary bg-primary/5' : ''}`}
                          onClick={() => {
                            setExpandedMessageId(expandedMessageId === message.id ? null : message.id);
                            if (!message.read_at) markMessageAsRead(message.id);
                          }}
                        >
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start gap-3">
                              <img src={beeperIcon} alt="Message" className={`w-8 h-8 object-contain flex-shrink-0 mt-0.5 ${message.read_at ? 'opacity-50' : ''}`} />
...
                              <img src={beeperIcon} alt="Read" className="w-8 h-8 object-contain flex-shrink-0 mt-0.5 opacity-50" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-medium text-sm truncate">{message.subject}</h4>
                                  {expandedMessageId === message.id ? (
                                    <ChevronUp className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  To: {message.recipient?.display_name || 'Unknown'} • {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                </p>
                                
                                {expandedMessageId === message.id && (
                                  <div className="mt-3 space-y-3">
                                    <div className="text-sm whitespace-pre-wrap">
                                      {message.body.split(/(https?:\/\/[^\s]+|tel:[^\s]+)/g).map((part, index) => {
                                        if (part.match(/^https?:\/\/[^\s]+$/)) {
                                          return (
                                            <a
                                              key={index}
                                              href={part}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="!text-blue-500 underline hover:!text-blue-400 break-all"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {part}
                                            </a>
                                          );
                                        }
                                        if (part.match(/^tel:[^\s]+$/)) {
                                          return (
                                            <a
                                              key={index}
                                              href={part}
                                              className="!text-blue-500 underline hover:!text-blue-400"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              Click to Call
                                            </a>
                                          );
                                        }
                                        return <span key={index}>{part}</span>;
                                      })}
                                    </div>
                                    {message.attachment_url && (
                                      <img 
                                        src={message.attachment_url} 
                                        alt="Attachment" 
                                        className="max-w-full h-auto rounded-lg border"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AstrologyBirthInfoModal
        open={birthInfoModalOpen}
        onOpenChange={setBirthInfoModalOpen}
        deliveryId={selectedDeliveryId}
        userId={userId}
        productType={productType}
      />

      <BirthInfoDetailModal
        open={birthInfoDetailModalOpen}
        onOpenChange={setBirthInfoDetailModalOpen}
        deliveryId={selectedDeliveryId}
      />

      {selectedMessage && (
        <MessageComposer
          open={showReplyComposer}
          onOpenChange={setShowReplyComposer}
          recipientId={selectedMessage.sender_id}
          recipientName={selectedMessage.sender?.display_name}
          currentBalance={balance}
          onMessageSent={handleMessageSent}
          replyToMessageId={selectedMessage.id}
          originalSubject={selectedMessage.subject}
          originalBody={selectedMessage.body}
        />
      )}
    </>
  );
};
