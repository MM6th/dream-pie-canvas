
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import UserStatsDisplay from "./UserStatsDisplay";

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const userType = formData.get("userType") as string;
    const isAdultCreator = formData.get("isAdultCreator") === "on";

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: userType || "supporter",
            is_adult_creator: isAdultCreator
          }
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Success",
          description: "Please check your email to confirm your account."
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during sign up",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during sign in",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("resetEmail") as string;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Reset Email Sent",
          description: "Check your email for password reset instructions."
        });
        setShowForgotPassword(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAboutAuthor = () => {
    navigate('/about-author');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          {/* Logo Image with Glow Effect */}
          <div className="flex justify-center mb-4">
            <img
              src="/lovable-uploads/e4407ccd-84aa-476e-9171-384946d3ed51.png"
              alt="Private Investigation Enterprises Logo"
              className="w-32 h-32 object-contain"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3)) drop-shadow(0 0 40px rgba(255, 255, 255, 0.2))',
              }}
            />
          </div>
          
          {/* Company Name */}
          <h1 className="text-2xl font-bold text-white mb-4 tracking-widest">PRIVATE INVESTIGATION ENTERPRISES</h1>
          
          <p className="text-gray-400 mb-6">Your boutique platform for entertainment and astrology</p>
          
          <UserStatsDisplay />
        </div>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-center">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="text-center space-y-4">
                <p className="text-green-400">Check your email to confirm your account!</p>
                <Button
                  onClick={handleAboutAuthor}
                  variant="link"
                  className="text-blue-400 hover:text-blue-300"
                >
                  About the Author
                </Button>
              </div>
            ) : showForgotPassword ? (
              <div className="space-y-4">
                <h3 className="text-white text-center text-lg">Reset Password</h3>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="resetEmail" className="text-white">Email</Label>
                    <Input
                      id="resetEmail"
                      name="resetEmail"
                      type="email"
                      required
                      className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                      placeholder="Enter your email address"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Email"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    variant="link"
                    className="w-full text-gray-400 hover:text-white"
                  >
                    Back to Sign In
                  </Button>
                </form>
              </div>
            ) : (
              <Tabs defaultValue="signin" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                  <TabsTrigger value="signin" className="text-white data-[state=active]:bg-blue-600">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-white data-[state=active]:bg-blue-600">
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email" className="text-white">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        required
                        className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="signin-password" className="text-white">Password</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        required
                        className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-white text-black hover:bg-gray-100" disabled={isLoading}>
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      variant="link"
                      className="w-full text-blue-400 hover:text-blue-300"
                    >
                      Forgot Password?
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-email" className="text-white">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        required
                        className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-password" className="text-white">Password</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        required
                        className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Account Type</Label>
                      <RadioGroup defaultValue="supporter" name="userType" className="mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="supporter" id="supporter" className="border-blue-500 text-blue-600" />
                          <Label htmlFor="supporter" className="text-white">Supporter</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="merchant" id="merchant" className="border-blue-500 text-blue-600" />
                          <Label htmlFor="merchant" className="text-white">Merchant</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isAdultCreator"
                        name="isAdultCreator"
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-2"
                      />
                      <Label htmlFor="isAdultCreator" className="text-white">I am an adult content creator</Label>
                    </div>
                    <p className="text-xs text-gray-400">
                      Adult creators can see and participate in adult/18+ opportunities. Only check this if you create adult content.
                    </p>
                    <Button type="submit" className="w-full bg-white text-black hover:bg-gray-100" disabled={isLoading}>
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
