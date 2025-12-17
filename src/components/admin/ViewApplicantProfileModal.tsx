import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, Mail, Calendar, ExternalLink, Globe, 
  Youtube, Facebook, Camera, MapPin, Briefcase
} from "lucide-react";

interface ApplicantProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  business_name?: string;
  business_description?: string;
  industry?: string;
  skills?: string[];
  website?: string;
  contact_email?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  pinterest_url?: string;
  onlyfans_url?: string;
  snapchat_url?: string;
  is_adult_creator?: boolean;
  created_at: string;
}

interface ViewApplicantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: ApplicantProfile;
}

const ViewApplicantProfileModal = ({ isOpen, onClose, applicant }: ViewApplicantProfileModalProps) => {
  const socialLinks = [
    { url: applicant.website, name: 'Website', icon: Globe, color: 'bg-gray-600' },
    { url: applicant.youtube_url, name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
    { url: applicant.instagram_url, name: 'Instagram', icon: Camera, color: 'bg-pink-600' },
    { url: applicant.facebook_url, name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
    { url: applicant.snapchat_url, name: 'Snapchat', icon: Camera, color: 'bg-yellow-500' },
    { url: applicant.pinterest_url, name: 'Pinterest', icon: MapPin, color: 'bg-red-500' },
    { url: applicant.onlyfans_url, name: 'OnlyFans', icon: User, color: 'bg-blue-500' },
  ].filter(link => link.url);

  const openLink = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://${url}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-700 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Applicant Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-center gap-4">
            {applicant.avatar_url ? (
              <img
                src={applicant.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-semibold text-white">
                {applicant.display_name || 'No Display Name'}
              </h3>
              {applicant.business_name && (
                <p className="text-gray-400">{applicant.business_name}</p>
              )}
              {applicant.is_adult_creator && (
                <Badge className="mt-1 bg-purple-600 text-white">Adult Creator</Badge>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 p-4 bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Contact Information</h4>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">Contact:</span>
              <span className="text-white">{applicant.contact_email || applicant.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-gray-300">Login:</span>
              <span className="text-gray-400">{applicant.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-300">Applied:</span>
              <span className="text-white">{new Date(applicant.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Industry & Skills */}
          {(applicant.industry || (applicant.skills && applicant.skills.length > 0)) && (
            <div className="space-y-2 p-4 bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Professional Info</h4>
              {applicant.industry && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-orange-400" />
                  <span className="text-gray-300">Industry:</span>
                  <span className="text-white">{applicant.industry}</span>
                </div>
              )}
              {applicant.skills && applicant.skills.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-gray-300">Skills:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {applicant.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="bg-gray-600 text-white text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Business Description */}
          {applicant.business_description && (
            <div className="space-y-2 p-4 bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">About</h4>
              <p className="text-sm text-white whitespace-pre-wrap">{applicant.business_description}</p>
            </div>
          )}

          {/* Social Links */}
          {socialLinks.length > 0 ? (
            <div className="space-y-2 p-4 bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Social Media Profiles</h4>
              <div className="grid grid-cols-2 gap-2">
                {socialLinks.map((link, index) => {
                  const IconComponent = link.icon;
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => openLink(link.url!)}
                      className={`${link.color} border-none text-white hover:opacity-80`}
                    >
                      <IconComponent className="w-4 h-4 mr-2" />
                      {link.name}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
              <p className="text-yellow-400 text-sm">
                ⚠️ No social media links provided. Consider requesting more information before approval.
              </p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button onClick={onClose} variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewApplicantProfileModal;
