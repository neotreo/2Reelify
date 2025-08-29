# Reelify - AI Video Generation Feature

## Overview
Reelify transforms text prompts into complete 9:16 vertical videos for social media platforms (TikTok, Instagram Reels, YouTube Shorts) using AI for content generation, voiceover, and captions.

## Architecture

### Video Generation Pipeline
1. **Script Generation** - OpenAI GPT generates engaging scripts with scene breakdowns
2. **Video Generation** - AI models create video clips for each scene
3. **Voiceover Creation** - Text-to-speech generates natural narration
4. **Caption Generation** - Automatic transcription and timing
5. **Video Processing** - Combines all elements into final video

## Setup Instructions

### 1. Database Setup
Run the migration to create the videos table:
```bash
npx supabase migration up
```

### 2. Configure AI Services

#### OpenAI (Required for Script Generation)
1. Get API key from [OpenAI Platform](https://platform.openai.com)
2. Add to `.env.local`: `OPENAI_API_KEY=your_key`

#### Video Generation (Choose One)

**Option A: Replicate (Recommended for ease)**
- Sign up at [Replicate](https://replicate.com)
- Get API token
- Add to `.env.local`: `REPLICATE_API_TOKEN=your_token`

**Option B: Runway ML**
- Apply for API access at [Runway](https://runwayml.com)
- More expensive but higher quality

**Option C: Stability AI**
- Use their API for Stable Video Diffusion
- Good balance of quality and cost

#### Voiceover Generation

**ElevenLabs (Recommended)**
- Sign up at [ElevenLabs](https://elevenlabs.io)
- Get API key
- Add to `.env.local`: `ELEVENLABS_API_KEY=your_key`
- Configure voice IDs in `src/lib/ai-services.ts`

**Alternatives:**
- OpenAI TTS
- Google Cloud Text-to-Speech
- Amazon Polly

#### Video Processing

**Option 1: Shotstack (Easiest)**
- Sign up at [Shotstack](https://shotstack.io)
- No server setup required
- Add API key to `.env.local`

**Option 2: Custom FFmpeg Server**
- Set up Node.js server with fluent-ffmpeg
- Deploy to cloud (AWS EC2, DigitalOcean)
- Handle video concatenation, audio mixing, caption overlay

**Option 3: Bannerbear**
- Good for simpler video assembly
- Sign up at [Bannerbear](https://bannerbear.com)

### 3. Storage Configuration

Videos need to be stored somewhere accessible:

**Supabase Storage (Simplest)**
```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('videos', 'videos', true),
  ('audio', 'audio', true),
  ('thumbnails', 'thumbnails', true);
```

**AWS S3 (For scale)**
- Create S3 bucket
- Configure CORS for direct uploads
- Add credentials to `.env.local`

### 4. Update API Implementation

In `src/app/actions/video-actions.ts`, replace the mock implementations with actual API calls:

```typescript
// Example: Actual OpenAI implementation
async function generateScript(idea: string, duration: number, style: string) {
  const { generateScriptWithAI } = await import('@/lib/ai-services');
  return await generateScriptWithAI({ idea, duration, style });
}

// Example: Actual video generation
async function generateVideoClips(scenes: ScriptScene[], style: string) {
  const { generateVideoClip, VIDEO_STYLES } = await import('@/lib/ai-services');
  
  const clips = await Promise.all(
    scenes.map(scene => 
      generateVideoClip({
        prompt: `${VIDEO_STYLES[style].prompt_prefix}, ${scene.videoPrompt}`,
        duration: scene.duration,
        style,
        aspectRatio: '9:16'
      })
    )
  );
  
  return clips;
}
```

## Features

### Core Features
- ✅ AI Script Generation
- ✅ Scene-by-scene video generation
- ✅ Natural AI voiceover
- ✅ Automatic caption generation
- ✅ Background music integration
- ✅ 9:16 vertical format optimization
- ✅ Multiple style presets

### Video Styles
- **Cinematic** - Professional, dramatic lighting
- **Casual Vlog** - Natural, handheld feel
- **Animated** - Cartoon/motion graphics style
- **Minimalist** - Clean, modern aesthetic
- **Documentary** - Informative, realistic
- **Energetic** - Fast-paced, dynamic

### Voice Options
- Professional
- Casual
- Energetic
- Calm
- Storyteller

## Usage Flow

1. **User Input**
   - Enter video idea/topic
   - Select style, duration, voice type
   - Toggle features (voiceover, captions, music)

2. **Processing**
   - AI generates script with scene breakdown
   - Each scene gets a video clip generated
   - Voiceover is created from script
   - All elements are combined

3. **Output**
   - Preview video in player
   - Download MP4 file
   - Share directly to social platforms

## Cost Considerations

### API Costs (Approximate)
- **OpenAI GPT-4**: ~$0.03 per script
- **Video Generation**: ~$0.10-0.50 per clip
- **ElevenLabs**: ~$0.15 per minute of audio
- **Video Processing**: ~$0.05-0.20 per video

### Total per 30-second video: ~$1.00-2.50

### Optimization Tips
1. Cache generated content
2. Use lower quality for previews
3. Batch process during off-peak
4. Implement user quotas
5. Offer different quality tiers

## Monitoring & Analytics

Track these metrics:
- Video generation success rate
- Average processing time
- API costs per video
- User engagement with generated videos
- Most popular styles/topics

## Troubleshooting

### Common Issues

**"Failed to generate script"**
- Check OpenAI API key
- Verify API quota/credits
- Check network connectivity

**"Video generation timeout"**
- Increase timeout limits
- Use webhook for async processing
- Check API service status

**"Audio sync issues"**
- Ensure consistent frame rates
- Verify audio duration matches video
- Check FFmpeg configuration

## Future Enhancements

1. **Multi-language support**
2. **Custom brand templates**
3. **AI-powered editing suggestions**
4. **Social media direct publishing**
5. **Collaborative editing**
6. **Advanced analytics**
7. **A/B testing for viral optimization**
8. **Music generation instead of presets**
9. **Real-time preview during generation**
10. **Mobile app for on-the-go creation**

## Security Considerations

1. **API Key Management**
   - Never expose keys client-side
   - Use environment variables
   - Rotate keys regularly

2. **Rate Limiting**
   - Implement per-user limits
   - Queue system for heavy processing
   - Prevent API abuse

3. **Content Moderation**
   - Filter inappropriate requests
   - Review generated content
   - Implement reporting system

## Support & Resources

- [OpenAI Documentation](https://platform.openai.com/docs)
- [Replicate Docs](https://replicate.com/docs)
- [ElevenLabs API](https://docs.elevenlabs.io)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Shotstack API](https://shotstack.io/docs)

## License
This implementation is part of the Reelify platform. All rights reserved.