
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import UserStatsDisplay from "./UserStatsDisplay";

// Industries available for signup
const INDUSTRY_OPTIONS = [
  'Music Artist',
  'Audio Podcaster',
  'Cook/Baker',
  'Film Maker',
];

// Industries under construction (hidden but preserved for future use)
const UNDER_CONSTRUCTION_INDUSTRIES = [
  'Fashion Retailer',
  'Pole Dancer',
  'Film Editor',
  'Videographer',
  'Live Stream Artist',
  'Voice Actor',
  'Book Editor',
];

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [userType, setUserType] = useState<"supporter" | "merchant">("supporter");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const displayName = formData.get("displayName") as string;

    // Validate display name
    if (!displayName || displayName.trim() === "") {
      toast({
        title: "Error",
        description: "Display name is required",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Validate industry for merchants
    if (userType === "merchant" && !selectedIndustry) {
      toast({
        title: "Error",
        description: "Please select your industry/skill to create a merchant account",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Block under construction industries
    if (userType === "merchant" && UNDER_CONSTRUCTION_INDUSTRIES.includes(selectedIndustry)) {
      toast({
        title: "Under Construction",
        description: `The ${selectedIndustry} industry is currently under construction. Please check back later or select a different industry.`,
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Sign up user - avatar will be uploaded after email confirmation via ProfileCompletionModal
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            user_type: userType,
            is_adult_creator: false,
            display_name: displayName.trim(),
            industry: userType === "merchant" ? selectedIndustry : null,
            skills: userType === "merchant" && selectedIndustry ? [selectedIndustry] : []
          }
        }
      });

      if (authError) {
        toast({
          title: "Error",
          description: authError.message,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      setEmailSent(true);
      toast({
        title: "Success",
        description: "Please check your email to confirm your account."
      });
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
          
          <p className="text-gray-400 mb-6">Your spiritually guided boutique platform for entertainment</p>
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
                    
                    {/* Supporter-specific required fields */}
                    {userType === "supporter" && (
                      <div>
                        <Label htmlFor="displayName" className="text-white">
                          Display Name <span className="text-red-400">*</span>
                        </Label>
                        <Input
                          id="displayName"
                          name="displayName"
                          type="text"
                          required
                          className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                          placeholder="Enter your display name"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-white">Account Type</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="supporter"
                            name="userType"
                            value="supporter"
                            checked={userType === "supporter"}
                             onChange={(e) => setUserType(e.target.value as "supporter" | "merchant")}
                            className="border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-2"
                          />
                          <Label htmlFor="supporter" className="text-white font-normal cursor-pointer">
                            Supporter
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="merchant"
                            name="userType"
                            value="merchant"
                            checked={userType === "merchant"}
                            onChange={(e) => setUserType(e.target.value as "supporter" | "merchant")}
                            className="border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-2"
                          />
                          <Label htmlFor="merchant" className="text-white font-normal cursor-pointer">
                            Merchant
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Merchant-specific required fields */}
                    {userType === "merchant" && (
                      <>
                        <div>
                          <Label htmlFor="displayName" className="text-white">
                            Display Name <span className="text-red-400">*</span>
                          </Label>
                          <Input
                            id="displayName"
                            name="displayName"
                            type="text"
                            required
                            className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                            placeholder="Enter your display name"
                          />
                        </div>

                        <div>
                          <Label className="text-white">
                            Industry / Skill <span className="text-red-400">*</span>
                          </Label>
                          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:border-blue-500">
                              <SelectValue placeholder="Select your industry" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-600">
                              {INDUSTRY_OPTIONS.map((industry) => (
                                <SelectItem 
                                  key={industry} 
                                  value={industry}
                                  className="text-white hover:bg-gray-700 focus:bg-gray-700"
                                >
                                  {industry}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <p className="text-xs text-blue-300 text-center">
                        After confirming your email, you'll be prompted to upload your profile picture.
                      </p>
                    </div>
                    
                    <p className="text-xs text-gray-400 text-center">
                      The content on this website is not made for children.
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
        
        {/* The Well Being Society text */}
        <h2 className="text-xl font-bold text-white tracking-widest text-center">THE WELL BEING SOCIETY</h2>
      </div>
    </div>
  );
};

export default AuthPage;
