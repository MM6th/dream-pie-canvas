
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"merchant" | "supporter" | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isSignUp && !userType) return;

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, userType!);
        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Success",
            description: "Please check your email to verify your account."
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dreamy background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-500/10 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-gray-600/10 via-transparent to-transparent"></div>
      
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-black text-white mb-4 tracking-tight">
            PIE
          </h1>
          <p className="text-gray-400">
            {isSignUp ? "Join the entertainment revolution" : "Welcome back to the platform"}
          </p>
        </div>

        <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>
              
              {isSignUp && (
                <div>
                  <Label className="text-gray-300 mb-2 block">I am a:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={userType === "merchant" ? "default" : "outline"}
                      onClick={() => setUserType("merchant")}
                      className="w-full"
                    >
                      Merchant
                    </Button>
                    <Button
                      type="button"
                      variant={userType === "supporter" ? "default" : "outline"}
                      onClick={() => setUserType("supporter")}
                      className="w-full"
                    >
                      Supporter
                    </Button>
                  </div>
                </div>
              )}
              
              <Button 
                type="submit"
                disabled={loading || (isSignUp && !userType)}
                className="w-full bg-gradient-to-r from-gray-600 to-black hover:from-gray-700 hover:to-gray-900"
              >
                {loading ? "Loading..." : (isSignUp ? "Sign Up" : "Sign In")}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
