import Link from "next/link";
import { ArrowUpRight, Check, Video, Mic, Type, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 opacity-70" />

      <div className="relative pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                AI-Powered Video Creation
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-8 tracking-tight">
              Transform{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                Text to Video
              </span>{" "}
              in Seconds
            </h1>

            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Create stunning 9:16 vertical videos for TikTok, Instagram Reels,
              and YouTube Shorts. Just describe your idea and watch AI generate
              complete videos with voiceover and captions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-8 py-4 text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all text-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Create Your First Video
                <ArrowUpRight className="ml-2 w-5 h-5" />
              </Link>

              <Link
                href="#how-it-works"
                className="inline-flex items-center px-8 py-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-lg font-medium"
              >
                See How It Works
              </Link>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="flex items-center gap-3 p-4 bg-white/80 rounded-lg shadow-sm">
                <Video className="w-6 h-6 text-purple-600" />
                <span className="text-gray-700 font-medium">
                  AI Video Generation
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/80 rounded-lg shadow-sm">
                <Mic className="w-6 h-6 text-purple-600" />
                <span className="text-gray-700 font-medium">
                  Voice Synthesis
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/80 rounded-lg shadow-sm">
                <Type className="w-6 h-6 text-purple-600" />
                <span className="text-gray-700 font-medium">Auto Captions</span>
              </div>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>No video editing skills required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>Ready in under 2 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>Perfect for social media</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
