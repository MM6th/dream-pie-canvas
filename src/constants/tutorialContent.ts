export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  duration?: number;
}

export const merchantTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Merchant Dashboard! 🎉',
    description: 'This quick tour will show you how to manage your content, view contracts, and grow your creative business on PIE.',
    duration: 12000,
  },
  {
    id: 'approval-status',
    title: 'Your Approval Status',
    description: 'Check your merchant approval status here. Once approved, you can upload and sell content to supporters.',
    duration: 10000,
  },
  {
    id: 'account-setup',
    title: 'Account Setup',
    description: 'Complete your profile and add payment information to start receiving earnings from your content sales.',
    duration: 10000,
  },
  {
    id: 'astrology-products',
    title: 'Astrology Products',
    description: 'Browse and purchase astrology readings. These products are managed by administrators.',
    duration: 10000,
  },
  {
    id: 'fashion-products',
    title: 'Fashion Products',
    description: 'Explore fashion items available for purchase. You can also apply to model products you\'ve purchased.',
    duration: 10000,
  },
  {
    id: 'audio-products',
    title: 'Audio Products & Music',
    description: 'Upload and manage your music tracks, podcasts, and ASMR content. Set pricing and availability for each item.',
    duration: 10000,
  },
  {
    id: 'modeling',
    title: 'Modeling Applications',
    description: 'Apply to model fashion products you\'ve purchased. Submit photos and wait for admin approval.',
    duration: 10000,
  },
  {
    id: 'tax-planning',
    title: 'Tax Planning Tools',
    description: 'Use the Self-Employment Tax Calculator to estimate your quarterly tax obligations based on your earnings.',
    duration: 10000,
  },
  {
    id: 'bulletin-board',
    title: 'Bulletin Board Posts',
    description: 'Create announcements, TV Guide entries, and regular posts to engage with your audience.',
    duration: 10000,
  },
  {
    id: 'contracts',
    title: 'Contract Dashboard',
    description: 'View and manage all your contracts including cover submissions, modeling applications, and video ad opportunities.',
    duration: 10000,
  },
  {
    id: 'content-gallery',
    title: 'Content Gallery',
    description: 'Upload photos and videos to your personal gallery. This content is separate from products for sale.',
    duration: 10000,
  },
  {
    id: 'media-players',
    title: 'Your Media Library',
    description: 'Access all your purchased music, podcasts, and videos in one place. Your personal media collection.',
    duration: 10000,
  },
];

export const supporterTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to PIE! 🎉',
    description: 'Your supporter dashboard is your hub for discovering content, managing purchases, and supporting creators.',
    duration: 12000,
  },
  {
    id: 'tax-calculator',
    title: 'Tax Planning (If Applicable)',
    description: 'If you earn referral income, use the Self-Employment Tax Calculator to estimate your quarterly taxes.',
    duration: 10000,
  },
  {
    id: 'music-tab',
    title: 'Music & Podcasts',
    description: 'Listen to all your purchased music tracks and podcast episodes. Your library grows as you support creators.',
    duration: 10000,
  },
  {
    id: 'videos-tab',
    title: 'Videos',
    description: 'Watch your purchased video content. All your video purchases are saved here for easy access.',
    duration: 10000,
  },
  {
    id: 'gallery-tab',
    title: 'Content Gallery',
    description: 'Upload and manage your personal photos and videos. Share your creative content with the community.',
    duration: 10000,
  },
  {
    id: 'profile-tab',
    title: 'Your Profile',
    description: 'Manage your profile settings, view your portfolios, and control your playlist visibility.',
    duration: 10000,
  },
  {
    id: 'background-tab',
    title: 'Background Customization',
    description: 'Upload a custom background image or video to personalize your dashboard experience.',
    duration: 10000,
  },
  {
    id: 'playlist-public',
    title: 'Playlist Visibility',
    description: 'Toggle whether your playlist is publicly visible to other users. Control your privacy settings here.',
    duration: 10000,
  },
];

export const adminTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Admin Dashboard Overview 👑',
    description: 'Welcome to the admin panel. Manage merchants, review submissions, and oversee platform operations.',
    duration: 12000,
  },
  {
    id: 'tax-calculator',
    title: 'Tax Planning Tools',
    description: 'Access the Self-Employment Tax Calculator for your own tax planning as needed.',
    duration: 10000,
  },
  {
    id: 'merchants-tab',
    title: 'Merchant Management',
    description: 'Review and approve merchant applications. Manage merchant status and permissions.',
    duration: 10000,
  },
  {
    id: 'submissions-tab',
    title: 'Contract Submissions',
    description: 'Review cover submissions, modeling applications, ASMR downloads, and video ad submissions from merchants.',
    duration: 10000,
  },
  {
    id: 'reviews-tab',
    title: 'Product Reviews',
    description: 'Moderate and manage product reviews submitted by users across all product categories.',
    duration: 10000,
  },
  {
    id: 'gallery-tab',
    title: 'Content Gallery',
    description: 'View and manage all user-uploaded content. Monitor for policy compliance.',
    duration: 10000,
  },
  {
    id: 'bulletin-tab',
    title: 'Bulletin Posts',
    description: 'Manage bulletin board posts, announcements, and TV Guide entries created by merchants.',
    duration: 10000,
  },
  {
    id: 'video-ads',
    title: 'Video Ad Opportunities',
    description: 'Create and manage video ad opportunities for merchants to apply to and submit content for.',
    duration: 10000,
  },
];
