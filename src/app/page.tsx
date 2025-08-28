import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import PricingCard from "@/components/pricing-card";
import Footer from "@/components/footer";
import { createClient } from "../../supabase/server";
import {
  ArrowUpRight,
  CheckCircle2,
  Video,
  Mic,
  Type,
  Sparkles,
  Play,
  Download,
  Share2,
  Palette,
  Clock,
  Zap,
} from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: plans, error } = await supabase.functions.invoke(
    "supabase-functions-get-plans",
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <Hero />

      {/* How It Works Section */}
      <section className="py-24 bg-white" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Create Videos in 3 Simple Steps
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From text prompt to viral-ready video in under 2 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Type className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                1. Describe Your Video
              </h3>
              <p className="text-gray-600">
                Simply type what you want your video to be about. Be as detailed
                or as simple as you like.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                2. AI Does the Magic
              </h3>
              <p className="text-gray-600">
                Our AI generates the video content, creates a natural voiceover,
                and adds synchronized captions.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                3. Download & Share
              </h3>
              <p className="text-gray-600">
                Export your video optimized for TikTok, Instagram Reels, or
                YouTube Shorts and start going viral.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Everything You Need to Create Viral Content
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Professional-quality videos without the professional complexity
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Video className="w-6 h-6" />,
                title: "AI Video Rendering",
                description:
                  "Generate stunning visuals that match your content perfectly",
              },
              {
                icon: <Mic className="w-6 h-6" />,
                title: "Natural Voiceover",
                description:
                  "AI-powered voice synthesis that sounds human and engaging",
              },
              {
                icon: <Type className="w-6 h-6" />,
                title: "Auto Captions",
                description:
                  "Perfectly timed captions that boost engagement and accessibility",
              },
              {
                icon: <Palette className="w-6 h-6" />,
                title: "Style Selection",
                description:
                  "Choose from cinematic, casual vlog, animated, and more aesthetics",
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: "Lightning Fast",
                description:
                  "Complete videos ready in under 2 minutes, not hours",
              },
              {
                icon: <Share2 className="w-6 h-6" />,
                title: "Platform Optimized",
                description:
                  "Perfect 9:16 format for TikTok, Instagram Reels, and YouTube Shorts",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-purple-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Styles Preview */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Choose Your Video Style</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Different aesthetics for different vibes - all generated by AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Cinematic",
                description: "Professional movie-like quality",
                gradient: "from-gray-900 to-gray-600",
              },
              {
                name: "Casual Vlog",
                description: "Friendly and approachable",
                gradient: "from-orange-500 to-yellow-500",
              },
              {
                name: "Animated",
                description: "Fun and engaging motion graphics",
                gradient: "from-blue-500 to-purple-500",
              },
              {
                name: "Minimalist",
                description: "Clean and modern aesthetic",
                gradient: "from-gray-400 to-gray-200",
              },
            ].map((style, index) => (
              <div key={index} className="group cursor-pointer">
                <div
                  className={`aspect-[9/16] bg-gradient-to-b ${style.gradient} rounded-lg mb-4 flex items-center justify-center group-hover:scale-105 transition-transform`}
                >
                  <Play className="w-12 h-12 text-white opacity-80" />
                </div>
                <h3 className="font-semibold text-lg">{style.name}</h3>
                <p className="text-gray-600 text-sm">{style.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10M+</div>
              <div className="text-purple-100">Videos Created</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50K+</div>
              <div className="text-purple-100">Happy Creators</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">2 Min</div>
              <div className="text-purple-100">Average Creation Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white" id="pricing">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Start Creating Today</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose the perfect plan for your content creation needs
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans?.map((item: any) => (
              <PricingCard key={item.id} item={item} user={user} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Go Viral?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are already making viral content with
            Reelify
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-8 py-4 text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Start Creating Now
            <ArrowUpRight className="ml-2 w-5 h-5" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
