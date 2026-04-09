import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Calendar, Eye, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AstrologyBirthInfoModal } from "./AstrologyBirthInfoModal";
import { BirthInfoDetailModal } from "./BirthInfoDetailModal";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  related_delivery_id?: string | null;
  related_contest_invitation_id?: string | null;
}

export const NotificationsList = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [birthInfoModalOpen, setBirthInfoModalOpen] = useState(false);
  const [birthInfoDetailModalOpen, setBirthInfoDetailModalOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [productType, setProductType] = useState<string>("other");
  const [deliveryBuyerIds, setDeliveryBuyerIds] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchNotifications();
    
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);

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

  const handleSubmitBirthInfo = async (deliveryId: string) => {
    try {
      // Fetch product type for this delivery
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

  const handleViewBirthInfo = (deliveryId: string) => {
    setSelectedDeliveryId(deliveryId);
    setBirthInfoDetailModalOpen(true);
  };

  const handleAcceptContestInvite = async (notification: Notification) => {
    if (!notification.related_contest_invitation_id) return;
    try {
      const { error } = await supabase
        .from("contest_invitations")
        .update({ status: "accepted" })
        .eq("id", notification.related_contest_invitation_id);
      if (error) throw error;

      // Get invitation details to notify inviter
      const { data: invite } = await supabase
        .from("contest_invitations")
        .select("inviter_id, bulletin_post_id")
        .eq("id", notification.related_contest_invitation_id)
        .single();

      if (invite) {
        const { data: accepterProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .single();
        const accepterName = accepterProfile?.display_name || "A user";

        await supabase.from("notifications").insert({
          user_id: invite.inviter_id,
          type: "contest_invite_accepted",
          title: "Invite Accepted!",
          message: `${accepterName} accepted your contest invitation! They'll be redirected when the stream goes live.`,
        });
      }

      // Mark notification as read
      await markAsRead(notification.id);
      toast.success("Contest invitation accepted! You'll be redirected when it goes live.");
      fetchNotifications();
    } catch (err) {
      console.error("Error accepting contest invite:", err);
      toast.error("Failed to accept invitation");
    }
  };

  const handleDeclineContestInvite = async (notification: Notification) => {
    if (!notification.related_contest_invitation_id) return;
    try {
      const { error } = await supabase
        .from("contest_invitations")
        .update({ status: "declined" })
        .eq("id", notification.related_contest_invitation_id);
      if (error) throw error;

      await markAsRead(notification.id);
      toast.success("Contest invitation declined");
      fetchNotifications();
    } catch (err) {
      console.error("Error declining contest invite:", err);
      toast.error("Failed to decline invitation");
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      fetchNotifications();
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "purchase":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      case "ready":
        return "bg-green-500";
      case "overdue":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No notifications yet
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={!notification.read ? "border-primary" : ""}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                        {notification.type === 'purchase' && 
                         notification.related_delivery_id && 
                         deliveryBuyerIds[notification.related_delivery_id] === userId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => handleSubmitBirthInfo(notification.related_delivery_id!)}
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Submit Birth Information
                          </Button>
                        )}
                        {notification.type === 'birth_info_submitted' && 
                         notification.related_delivery_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => handleViewBirthInfo(notification.related_delivery_id!)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        )}
                        {notification.type === 'contest_invite' && 
                         notification.related_contest_invitation_id &&
                         !notification.read && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAcceptContestInvite(notification)}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeclineContestInvite(notification)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
    </div>
  );
};
