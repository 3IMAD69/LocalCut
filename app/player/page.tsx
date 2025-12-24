"use client";

import { useState } from "react";
import { MediaPlayer } from "@/components/player/media-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PlayerDemo() {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
      setMediaUrl("");
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMediaFile(null);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">MediaBunny Player</h1>

      <div className="mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Upload Media File
          </label>
          <Input
            type="file"
            accept="video/*,audio/*"
            onChange={handleFileChange}
            className="max-w-md"
          />
        </div>

        <div className="text-center text-gray-500">OR</div>

        <form onSubmit={handleUrlSubmit} className="space-y-2">
          <label className="block text-sm font-medium">Enter Media URL</label>
          <div className="flex gap-2 max-w-md">
            <Input
              type="url"
              placeholder="https://example.com/video.mp4"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
            <Button type="submit">Load</Button>
          </div>
        </form>
      </div>

      {(mediaFile || mediaUrl) && (
        <div className="mt-8">
          <MediaPlayer src={mediaFile || mediaUrl} />
        </div>
      )}
    </div>
  );
}
