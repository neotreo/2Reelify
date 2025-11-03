"use client";

import { useState } from "react";
import { VideoSection } from "@/types/video";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  RefreshCw, 
  Clock, 
  FileText, 
  Image, 
  Loader2,
  Save,
  X,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionDetailsProps {
  section: VideoSection | null;
  onClose: () => void;
  onPromptUpdate: (sectionId: string, newPrompt: string) => void;
  onRegenerate: (sectionId: string) => void;
  isRegenerating?: boolean;
}

export function SectionDetails({
  section,
  onClose,
  onPromptUpdate,
  onRegenerate,
  isRegenerating = false,
}: SectionDetailsProps) {
  const [editedPrompt, setEditedPrompt] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  if (!section) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Image className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Select a clip to view details</p>
        </div>
      </div>
    );
  }

  // Initialize edited prompt when section changes
  if (editedPrompt === "" && section.shot_prompt) {
    setEditedPrompt(section.shot_prompt);
  }

  const handlePromptChange = (value: string) => {
    setEditedPrompt(value);
    setHasChanges(value !== section.shot_prompt);
  };

  const handleSave = () => {
    if (hasChanges && editedPrompt.trim()) {
      onPromptUpdate(section.id, editedPrompt.trim());
      setHasChanges(false);
    }
  };

  const handleRevert = () => {
    setEditedPrompt(section.shot_prompt || "");
    setHasChanges(false);
  };

  const isLoading = !section.clip_url && !section.clip_error;
  const hasError = !!section.clip_error;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Editing: {section.title}</h3>
          <Badge variant={isLoading ? "secondary" : hasError ? "destructive" : "default"}>
            {isLoading ? "Generating" : hasError ? "Error" : "Complete"}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8"
        >
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Section Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              Section Information
            </h4>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">{section.target_seconds || 5}s</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Objective
              </label>
              <p className="text-sm text-gray-800 mt-1">{section.objective}</p>
            </div>
            
            {section.clip_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(section.clip_url, "_blank")}
                className="w-full"
              >
                <Play className="w-3 h-3 mr-2" />
                Preview This Clip
              </Button>
            )}
          </div>
        </div>

        {/* Script */}
        {section.script && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-5">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Voiceover Script</h4>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {section.script}
            </p>
          </div>
        )}

        {/* AI Prompt Editor */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Visual Generation Prompt</h4>
            <span className="text-xs text-gray-500">
              {editedPrompt.length} characters
              {hasChanges && <span className="text-orange-600 ml-2 font-medium">• Unsaved</span>}
            </span>
          </div>

          <Textarea
            value={editedPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="Describe the visual scene in detail. Include characters, setting, lighting, camera angle, etc."
            className="min-h-[140px] text-sm"
            disabled={isRegenerating}
          />
          
          <p className="text-xs text-gray-600 italic">
            💡 Tip: Be specific about visual details, camera angles, and atmosphere for best results
          </p>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {hasChanges && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRevert}
                disabled={isRegenerating}
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={!hasChanges || isRegenerating}
              className="flex-1"
            >
              <Save className="w-3 h-3 mr-1" />
              Save Changes
            </Button>
            <Button
              size="sm"
              onClick={() => onRegenerate(section.id)}
              disabled={isRegenerating || !section.shot_prompt}
              className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Regenerate Clip
            </Button>
          </div>
        </div>

        {/* Error or Success Status */}
        {hasError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-900 mb-1">Generation Error</h4>
                <p className="text-sm text-red-700">{section.clip_error}</p>
              </div>
            </div>
          </div>
        )}

        {!hasError && section.clip_id && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-green-900 mb-1">Successfully Generated</h4>
                <p className="text-xs text-green-700 font-mono">{section.clip_id}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}