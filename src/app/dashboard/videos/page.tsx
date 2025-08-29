import DashboardNavbar from "@/components/dashboard-navbar";
import { getUserVideos, deleteVideo } from "@/app/actions/video-actions";
import VideoCard from "@/components/video-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Plus, Film } from "lucide-react";
import Link from "next/link";

export default async function VideosLibraryPage() {
  const { videos, error } = await getUserVideos();

  return (
    <>
      <DashboardNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Videos</h1>
              <p className="text-muted-foreground">
                Manage and download your AI-generated videos
              </p>
            </div>
            <Link href="/dashboard/create">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Plus className="mr-2 w-4 h-4" />
                Create New Video
              </Button>
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {videos && videos.length > 0 ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Videos</p>
                        <p className="text-2xl font-bold">{videos.length}</p>
                      </div>
                      <Video className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                        <p className="text-2xl font-bold">
                          {videos.reduce((acc, v) => acc + (v.view_count || 0), 0)}
                        </p>
                      </div>
                      <Film className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Duration</p>
                        <p className="text-2xl font-bold">
                          {Math.round(videos.reduce((acc, v) => acc + (v.duration || 0), 0) / 60)}m
                        </p>
                      </div>
                      <Film className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Videos Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </>
          ) : (
            <Card className="p-12">
              <div className="text-center">
                <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">No videos yet</h2>
                <p className="text-muted-foreground mb-6">
                  Create your first AI-powered video in seconds
                </p>
                <Link href="/dashboard/create">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Plus className="mr-2 w-4 h-4" />
                    Create Your First Video
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}