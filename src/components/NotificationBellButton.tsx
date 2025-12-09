import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { UnifiedInboxModal } from "./UnifiedInboxModal";

interface NotificationBellButtonProps {
  userId: string;
  userType: string;
}

export const NotificationBellButton = ({ userId, userType }: NotificationBellButtonProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchUnreadCounts = async () => {
    if (!userId) return;

    try {
      // Fetch unread notifications count
      const { count: notificationCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      // Fetch unread messages count
      const { count: messageCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .is("read_at", null);

      setUnreadCount((notificationCount || 0) + (messageCount || 0));
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUnreadCounts();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const notificationChannel = supabase
      .channel("bell-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => fetchUnreadCounts()
      )
      .subscribe();

    const messageChannel = supabase
      .channel("bell-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchUnreadCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [userId]);

  // Refetch when modal closes to ensure count is updated
  const handleModalChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Refetch counts when modal closes
      fetchUnreadCounts();
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative text-gray-300 hover:text-white hover:bg-gray-700/50"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center text-xs px-1"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      <UnifiedInboxModal
        open={isOpen}
        onOpenChange={handleModalChange}
        userId={userId}
        userType={userType}
      />
    </>
  );
};
