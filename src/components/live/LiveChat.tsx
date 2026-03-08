import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send } from "lucide-react";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
}

interface LiveChatProps {
  streamId: string;
}

const LiveChat = ({ streamId }: LiveChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const profileCacheRef = useRef<Map<string, { display_name: string; avatar_url: string | null }>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchProfile = async (userId: string) => {
    if (profileCacheRef.current.has(userId)) return profileCacheRef.current.get(userId)!;
    const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).single();
    const profile = { display_name: data?.display_name || "User", avatar_url: data?.avatar_url || null };
    profileCacheRef.current.set(userId, profile);
    return profile;
  };

  // Fetch existing messages & subscribe to new ones
  useEffect(() => {
    if (!streamId) return;

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const fetchMessages = async () => {
      try {
        const { data, error } = await (supabase
          .from("live_chat_messages") as any)
          .select("*")
          .eq("stream_id", streamId)
          .order("created_at", { ascending: true })
          .limit(100);

        if (error) {
          console.error("Chat fetch error:", error);
          return;
        }

        if (data) {
          const enriched = await Promise.all(
            data.map(async (msg: any) => {
              const profile = await fetchProfile(msg.user_id);
              return { ...msg, display_name: profile.display_name, avatar_url: profile.avatar_url };
            })
          );
          setMessages(enriched);
        }
      } catch (err) {
        console.error("Chat fetch exception:", err);
      }
    };

    fetchMessages();

    // Subscribe to new messages via Realtime
    const channel = supabase
      .channel(`chat-${streamId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_chat_messages",
        filter: `stream_id=eq.${streamId}`,
      }, async (payload: any) => {
        const msg = payload.new;
        const profile = await fetchProfile(msg.user_id);
        const enrichedMsg = { ...msg, display_name: profile.display_name, avatar_url: profile.avatar_url };
        setMessages((prev) => {
          if (prev.some((m) => m.id === enrichedMsg.id)) return prev;
          return [...prev, enrichedMsg];
        });
      })
      .subscribe((status) => {
        console.log("Chat realtime status:", status);
      });

    // Polling fallback every 5s to catch messages Realtime may miss
    pollTimer = setInterval(fetchMessages, 5000);

    return () => {
      supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [streamId]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);

    await (supabase.from("live_chat_messages") as any).insert({
      stream_id: streamId,
      user_id: user.id,
      message: newMessage.trim(),
    });

    setNewMessage("");
    setSending(false);
  };

  return (
    <Card className="bg-card border-border h-[32vh] min-h-[200px] max-h-[500px] lg:h-[500px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Live Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-3 pt-0 overflow-hidden">
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-2">
                {msg.avatar_url ? (
                  <img src={msg.avatar_url} className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" alt="" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] text-primary font-bold">
                      {(msg.display_name || "U")[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-primary">{msg.display_name}</span>
                  <p className="text-sm text-foreground break-words">{msg.message}</p>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {user ? (
          <div className="flex gap-2 mt-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Say something..."
              className="text-sm"
            />
            <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim() || sending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-3 text-center">Log in to chat</p>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveChat;
