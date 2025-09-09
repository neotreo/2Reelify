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
    <div className="relative min-h-screen bg-gradient-to-b from-white via-purple-50/40 to-gray-50 dark:from-background dark:via-purple-900/10 dark:to-background overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[5%] h-72 w-72 rounded-full bg-gradient-to-tr from-fuchsia-400/30 to-purple-600/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-15%] right-[0%] h-80 w-80 rounded-full bg-gradient-to-br from-indigo-400/20 to-cyan-400/10 blur-3xl animate-[pulse_9s_ease-in-out_infinite]" />
      </div>
      <Navbar />
      <Hero />
      {/* Quick Badges Row */}
    <div className="container mx-auto px-4 -mt-8 mb-8 flex flex-wrap gap-3 justify-center text-xs">
        {[
      { label: 'Multi‑Model Workflow', tone: 'from-purple-600 to-pink-600' },
      { label: 'Voice + Captions', tone: 'from-emerald-500 to-teal-500' },
      { label: 'Vertical Ready', tone: 'from-sky-500 to-indigo-600' },
      { label: 'Script → Video Flow', tone: 'from-amber-500 to-orange-500' },
        ].map(b => (
          <span key={b.label} className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${b.tone} px-3 py-1 font-medium text-white shadow-sm shadow-black/10`}>{b.label}</span>
        ))}
      </div>

      {/* How It Works Section */}
      <section className="py-24 bg-white dark:bg-background" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-up [--delay:0ms]">
            <h2 className="text-3xl font-bold mb-4">
              Create Videos in 3 Simple Steps
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              From text prompt to viral-ready video in under 2 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center animate-fade-up [--delay:100ms]">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Type className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                1. Describe Your Video
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Simply type what you want your video to be about. Be as detailed
                or as simple as you like.
              </p>
            </div>

            <div className="text-center animate-fade-up [--delay:200ms]">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                2. AI Does the Magic
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our AI generates the video content, creates a natural voiceover,
                and adds synchronized captions.
              </p>
            </div>

            <div className="text-center animate-fade-up [--delay:300ms]">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                3. Download & Share
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Export your video optimized for TikTok, Instagram Reels, or
                YouTube Shorts and start going viral.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50 dark:bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-up [--delay:0ms]">
            <h2 className="text-3xl font-bold mb-4">
              Everything You Need to Create Viral Content
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
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
                className="p-6 bg-white dark:bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow animate-fade-up"
                style={{ ['--delay' as any]: `${100 * (index + 1)}ms` }}
              >
                <div className="text-purple-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
  <section className="py-20 bg-gradient-to-b from-white to-white/60 dark:from-background dark:to-background/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid sm:grid-cols-3 gap-6 animate-fade-up [--delay:50ms]">
            {[
      { value: '~', label: 'Adaptive Durations', accent: 'text-emerald-500' },
      { value: 'Auto', label: 'Voice & Captions', accent: 'text-purple-500' },
      { value: 'Many', label: 'Style Options', accent: 'text-pink-500' },
            ].map(s => (
              <div key={s.label} className="relative overflow-hidden rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/40 border border-white/40 dark:border-white/10 p-6 shadow-sm">
                <div className={`text-4xl font-bold tracking-tight ${s.accent}`}>{s.value}</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{s.label}</div>
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-tr from-fuchsia-500/10 to-purple-500/0 blur-2xl" />
              </div>
            ))}
          </div>
          
        </div>
      </section>

      {/* Use Case Showcase (horizontal scroll) */}
      <section className="py-20 bg-gray-50/70 dark:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">What People Are Making</h2>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded">Live Examples</span>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-thin snap-x">
            {[
              { tag: 'Explain Like I’m 5', color: 'from-indigo-500 to-sky-500' },
              { tag: 'Product Teasers', color: 'from-pink-500 to-rose-500' },
              { tag: 'Listicles', color: 'from-amber-500 to-orange-500' },
              { tag: 'Mini Documentaries', color: 'from-emerald-500 to-teal-500' },
              { tag: 'Myth Busting', color: 'from-fuchsia-500 to-purple-500' },
              { tag: 'Story Time', color: 'from-blue-500 to-indigo-600' },
              { tag: 'Daily Tips', color: 'from-violet-500 to-purple-600' },
            ].map(item => (
              <div key={item.tag} className="snap-start shrink-0 w-56 group relative">
                <div className={`aspect-[9/16] rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-black/20 group-hover:scale-[1.03] transition-transform`}>{item.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white dark:bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Loved by Indie Creators</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">Early users are shipping more short‑form content in less time — and having fun doing it.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: 'Went from idea to polished reel in literally 90 seconds.', name: 'Ava – DTC Founder' },
              { quote: 'The captions timing is scary good. Huge time saver.', name: 'Liam – Solo Creator' },
              { quote: 'I stopped outsourcing shorts. This is my secret weapon now.', name: 'Noah – Podcast Host' },
            ].map(t => (
              <div key={t.name} className="relative rounded-xl p-6 bg-white/70 dark:bg-white/5 backdrop-blur border border-white/40 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">“{t.quote}”</div>
                <div className="text-xs font-medium text-purple-600 dark:text-purple-400">{t.name}</div>
                <div className="pointer-events-none absolute -left-8 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-gradient-to-tr from-purple-400/10 to-pink-400/0 blur-2xl" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Styles Preview */}
      <section className="py-24 bg-white dark:bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-up [--delay:0ms]">
            <h2 className="text-3xl font-bold mb-4">Choose Your Video Style</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
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
              <div key={index} className="group cursor-pointer animate-fade-up" style={{ ['--delay' as any]: `${100 * (index + 1)}ms` }}>
                <div
                  className={`aspect-[9/16] bg-gradient-to-b ${style.gradient} rounded-lg mb-4 flex items-center justify-center group-hover:scale-105 transition-transform`}
                >
                  <Play className="w-12 h-12 text-white opacity-80" />
                </div>
                <h3 className="font-semibold text-lg">{style.name}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {style.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white dark:bg-background" id="pricing">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-up [--delay:0ms]">
            <h2 className="text-3xl font-bold mb-4">Start Creating Today</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Sign up to create your first video free. Upgrade anytime to unlock
              unlimited creation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans?.map((item: any, idx: number) => (
              <div key={item.id} className="animate-fade-up" style={{ ['--delay' as any]: `${100 * (idx + 1)}ms` }}>
                <PricingCard key={item.id} item={item} user={user} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50 dark:bg-background">
        <div className="container mx-auto px-4 text-center animate-fade-up [--delay:0ms]">
          <h2 className="text-3xl font-bold mb-4">Ready to Try Reelify?</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Create your first AI-generated vertical video for free — no credit
            card required.
          </p>
          <a
            href="/dashboard/create"
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