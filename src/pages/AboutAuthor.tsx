
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, LogOut, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const AboutAuthor = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/');
    }
  };

  const handleYouTubeClick = () => {
    window.open('https://youtube.com/ratedBenjamin', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
        <Button
          onClick={handleBackToDashboard}
          variant="outline"
          className="border-gray-600 text-white hover:bg-white hover:text-black"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <Button
          onClick={handleSignOut}
          className="bg-white text-black hover:bg-gray-100 hover:text-black"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <div className="pt-20 max-w-4xl mx-auto p-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">About the Author</h1>
              <div className="mb-6">
                <img
                  src="/lovable-uploads/8a8289fd-017b-4c07-9e5a-03d19c081cb0.png"
                  alt="Author"
                  className="w-64 h-64 mx-auto rounded-lg object-cover"
                />
              </div>
            </div>

            <div className="space-y-6 text-gray-300 leading-relaxed">
              <p>
                I wouldn't call myself a super-human; just someone who after researching and reflecting realized that he's actualized and is still manifesting their natal chart. Yes, astrology and entertainment is a peculiar mix, and I can't it was intended that way, but when man makes plans God laughs.
              </p>

              <p>
                It was Aquarius season 2016 when I decided to rebrand my entertainment services. My solar return chart that year showed that my sun landed in my 9th house of higher education, publication, long distant travel, and philosophy. The prior fall I enrolled for my doctorate in business, and that January I started classes. The fact of the matter is, the 7 years since branching out on my own after being released from my label consisted of college education and obtaining my masters; therefore, my rebrand was an advancement to further my career.
              </p>

              <p>
                After over 20 years in the entertainment industry I found myself not only still working, but teaching the business as well. Everything I just mentioned however was done organically before I knew about astrology. That same year in the spring I became an astrologer unintentionally when stumbling on a video that persecuted the sign Pisces so bad, I just wanted to respond and clarify what I found us to be since I am one. It caught traction and for now almost a decade I've been an astrologer.
              </p>

              <p>
                In the process of learning the craft I was able to do an electional chart on my business Private Investigation Enterprises by examining the planetary transits on the day and time it was incorporated. What I found is that it being done in Aquarius season, it set the foundation for me to become an astrologer because Aquarius rules over astrology. The midheaven of the company is in the sign of Pisces which rules the glamour world, and film; areas I was already well versed in.
              </p>

              <p>
                Astrology is also a higher form of education which explains why it happened during my ninth house solar return. The name Private Investigation Enterprises was even sporadic because it's hard making a connection on how something with that title revolves around entertainment. But in astrology Pisces rules over privacy and confidential information. Astrology is also an occult science; hidden for centuries from the masses in exchange for popular religions, and called taboo in many circles.
              </p>

              <p>
                My point there is we are all acting out our natal charts (a celestial guide for our lives determined when we were born) even before we are aware of it. Seeing that is is part of a science Millenia's old is fascinating, and you too can find out how you've done it, what has prevented you from doing it, and what else you have to manifest in the future for yourself.
              </p>

              <p>
                I have helped countless others on my journey, and do sell astrological products alongside entertainment from unique and innovative entertainers within a 'boutique' type of platform. If you want more insight on astrology because you're a newbie check me out on YouTube at ratedBenjamin.
              </p>

              <Button
                onClick={handleYouTubeClick}
                className="bg-red-600 hover:bg-red-700 text-white mb-6"
              >
                <Youtube className="w-4 h-4 mr-2" />
                Visit YouTube Channel
              </Button>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">Entertainment Industry Background</h2>

              <p>
                I started out signed to Tony Rahsan's 40 Acres management company in 1992 in a group called Hijinx. We performed on the same stages as Wutang Clan, and other stages such as the Apollo, and made an appearance on the Richard Bey Show. We also did the Rugrats intro song that so many kids grew up listening to everyday.
              </p>

              <p>
                Later I went to an independent label The 5th Brigade alongside super producer Marcus 'Bellringer' Bell, performed at the same events as Fat Joe, Fabulous, Jadakiss, and Fifty Cent & the G-Unit. I also have numerous placements in TV & Film productions you may have watched such as American Son, Mall Cop, 16 & Pregnant, Jersey Shore, and many others.
              </p>

              <p>
                In 2009 I went totally independent starting my sole proprietorship Benjamin Bugs (my then rap name). I went into the webcam side of the business for some time, photographed women in the industry, and won Best Business Award in Brooklyn in 2013.
              </p>

              <p>
                Now I produce the beats for songs as well as record them; some which you can see exclusively on this website before they are published on major platforms. At PIE I work with independent contractors behind the scenes with brand deals, modeling opportunities, musical opportunities, film opportunities, and offer insight on how they are celestially designed to fit in any of these categories if they in fact are, all before their work hits the major platforms.
              </p>

              <p>
                I am also building an audience of supporters at PIE for creators to test run their work with whether it's content, pictures, and posts, while using PIE as a one stop hub to post which social media platform they will be live at, as well as where their pre-recorded content will be in a 'TV Guide' styled section of the site.
              </p>

              <p>
                I may be a teacher now, but I'm still learning, and I hope to grow with you and you with me.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AboutAuthor;
