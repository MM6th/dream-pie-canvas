import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Camera, Mic, MicOff, Video, VideoOff, PhoneOff, Send, Trophy, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const ContestTestPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Floating timer header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black/80 border border-red-600/50 rounded-full px-6 py-2 flex items-center gap-2">
          <Timer className="w-4 h-4 text-red-500" />
          <span className="text-white font-mono text-lg font-bold">05:00</span>
        </div>
      </div>

      {/* Back button */}
      <div className="absolute top-4 left-4 z-50">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white bg-black/50 hover:bg-black/70">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Button>
      </div>

      {/* Challenge label overlay — exact replica */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <span className="text-2xl sm:text-3xl font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide">
          Twerk Off
        </span>
      </div>

      {/* Split screen layout */}
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Champion side */}
        <div className="flex-1 flex flex-col border-r border-border/30">
          {/* Video panel */}
          <div className="flex-1 bg-gradient-to-br from-blue-950 to-blue-900 relative flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-full bg-blue-800/60 border-2 border-blue-400/40 mx-auto flex items-center justify-center">
                <Video className="w-8 h-8 text-blue-300/60" />
              </div>
              <p className="text-blue-300/80 font-semibold text-sm">Champion</p>
              <p className="text-blue-400/50 text-xs">@champion_user</p>
            </div>
            {/* Status indicator */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">LIVE</span>
            </div>
            {/* Tip meter */}
            <div className="absolute bottom-3 left-3 right-3">
              <div className="bg-black/60 rounded-lg p-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-yellow-400">💰 Tips</span>
                  <span className="text-white font-bold">$42.00</span>
                </div>
                <Progress value={42} className="h-2" />
              </div>
            </div>
          </div>
          {/* Champion chat */}
          <Card className="rounded-none border-x-0 border-b-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Champion Chat</p>
              <div className="h-28 overflow-y-auto space-y-1.5 text-xs">
                <div className="bg-muted/50 rounded px-2 py-1"><span className="text-blue-400 font-medium">Fan1:</span> <span className="text-foreground">Go champion! 🔥</span></div>
                <div className="bg-muted/50 rounded px-2 py-1"><span className="text-blue-400 font-medium">Fan2:</span> <span className="text-foreground">You got this!</span></div>
                <div className="bg-muted/50 rounded px-2 py-1"><span className="text-blue-400 font-medium">Fan3:</span> <span className="text-foreground">💪💪💪</span></div>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Type a message..." className="text-xs h-8" readOnly />
                <Button size="sm" className="h-8 px-3"><Send className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Challenger side */}
        <div className="flex-1 flex flex-col">
          {/* Video panel */}
          <div className="flex-1 bg-gradient-to-br from-red-950 to-red-900 relative flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-full bg-red-800/60 border-2 border-red-400/40 mx-auto flex items-center justify-center">
                <Video className="w-8 h-8 text-red-300/60" />
              </div>
              <p className="text-red-300/80 font-semibold text-sm">Challenger</p>
              <p className="text-red-400/50 text-xs">@challenger_user</p>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">LIVE</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <div className="bg-black/60 rounded-lg p-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-yellow-400">💰 Tips</span>
                  <span className="text-white font-bold">$27.00</span>
                </div>
                <Progress value={27} className="h-2" />
              </div>
            </div>
          </div>
          {/* Challenger chat */}
          <Card className="rounded-none border-x-0 border-b-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Challenger Chat</p>
              <div className="h-28 overflow-y-auto space-y-1.5 text-xs">
                <div className="bg-muted/50 rounded px-2 py-1"><span className="text-red-400 font-medium">Viewer1:</span> <span className="text-foreground">Let's go! 🎉</span></div>
                <div className="bg-muted/50 rounded px-2 py-1"><span className="text-red-400 font-medium">Viewer2:</span> <span className="text-foreground">Show them what you got!</span></div>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Type a message..." className="text-xs h-8" readOnly />
                <Button size="sm" className="h-8 px-3"><Send className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/80 border-t border-border/30 p-3 flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-muted-foreground/30"><Camera className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-muted-foreground/30"><Mic className="w-4 h-4" /></Button>
        <Button variant="destructive" size="icon" className="rounded-full w-12 h-12"><PhoneOff className="w-5 h-5" /></Button>
      </div>
    </div>
  );
};

export default ContestTestPage;
