import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { HelpCircle, Music, FolderOpen, Link2, Eye, EyeOff } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type VisibilityType = 'playlist' | 'portfolios' | 'social_links';

interface VisibilityToggleWithHelpProps {
  type: VisibilityType;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const visibilityConfig = {
  playlist: {
    icon: Music,
    label: "Make Playlist Public",
    description: "Allow non-followers to see your playlist",
    publicBenefits: [
      "Earn revenue when visitors purchase songs from your playlist",
      "Merchants may discover your music taste and offer opportunities",
      "Cross-promote your favorite artists and tracks"
    ],
    privateBenefits: [
      "Keep your music preferences private",
      "Only approved followers can see what you listen to",
      "Control who knows your taste in music"
    ]
  },
  portfolios: {
    icon: FolderOpen,
    label: "Make Portfolios Public",
    description: "Allow non-followers to see your portfolios",
    publicBenefits: [
      "Attract merchant attention for modeling or collaboration opportunities",
      "Showcase your work to potential partners and clients",
      "Increase visibility and networking opportunities"
    ],
    privateBenefits: [
      "Protect your images from screenshots and unauthorized use",
      "Keep private or exclusive work confidential",
      "Control who sees your personal photos and creative work",
      "Prevent identity theft or misuse of your images"
    ]
  },
  social_links: {
    icon: Link2,
    label: "Make Social Links Public",
    description: "Allow non-followers to see your social media links",
    publicBenefits: [
      "Expand your reach and grow your following across platforms",
      "Allow visitors to connect with you on their preferred platform",
      "Great for cross-promotion and building your personal brand"
    ],
    privateBenefits: [
      "Keep personal accounts private (OnlyFans, adult sites, fetish content)",
      "Protect your identity across platforms",
      "Control who can find and contact you on social media",
      "Maintain separation between personal and professional presence"
    ]
  }
};

export const VisibilityToggleWithHelp = ({
  type,
  checked,
  onCheckedChange
}: VisibilityToggleWithHelpProps) => {
  const config = visibilityConfig[type];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
      <div className="flex items-center gap-3 flex-1">
        <Icon className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label htmlFor={`visibility-${type}`} className="text-white font-medium">
              {config.label}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  type="button" 
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Learn more about visibility settings"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80 bg-gray-800 border-gray-700 text-white p-4"
                side="top"
                align="start"
              >
                <div className="space-y-4">
                  {/* Public benefits */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-green-400" />
                      <span className="font-medium text-green-400">Benefits of Making Public</span>
                    </div>
                    <ul className="text-sm text-gray-300 space-y-1 pl-6">
                      {config.publicBenefits.map((benefit, index) => (
                        <li key={index} className="list-disc">{benefit}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Private benefits */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <EyeOff className="w-4 h-4 text-orange-400" />
                      <span className="font-medium text-orange-400">Benefits of Keeping Private</span>
                    </div>
                    <ul className="text-sm text-gray-300 space-y-1 pl-6">
                      {config.privateBenefits.map((benefit, index) => (
                        <li key={index} className="list-disc">{benefit}</li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-xs text-gray-500 border-t border-gray-700 pt-2">
                    Note: Approved followers can always see your content regardless of this setting.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-sm text-gray-400">{config.description}</p>
        </div>
      </div>
      <Switch
        id={`visibility-${type}`}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
};

export default VisibilityToggleWithHelp;
