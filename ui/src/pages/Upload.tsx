import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@/services/apiServer";
import { sessionStorage } from "@/utils/sessionStorage";

export default () => {
  const { user } = useAuth();
  const [imageName, setImageName] = useState("");
  const [imageDescription, setImageDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] || null);
    setUploadMessage("");
    setUploadError("");
  };

  const handleUpload = async () => {
    if (!imageName.trim()) {
      setUploadError("Please enter an image name");
      return;
    }
    if (!selectedFile) {
      setUploadError("Please select a file");
      return;
    }
    if (imageName.length > 40) {
      setUploadError("Image name must be 40 characters or less");
      return;
    }
    if (imageDescription.length > 120) {
      setUploadError("Image description must be 120 characters or less");
      return;
    }

    setIsUploading(true);
    setUploadMessage("");
    setUploadError("");

    try {
      const token = sessionStorage.getAccessToken();
      if (token) {
        api.setAccessToken(token);
      }

      const presignedResponse = await api.getPresignedUrl(
        imageName.trim(),
        imageDescription.trim() || null,
      );
      if (!presignedResponse.success || !presignedResponse.presignedUrl) {
        throw new Error(presignedResponse.message || "Failed to get upload URL");
      }

      await api.uploadToPresignedUrl(
        presignedResponse.presignedUrl,
        selectedFile
      );

      setUploadMessage("Upload successful!");
      setImageName("");
      setImageDescription("");
      setSelectedFile(null);
      const fileInput = document.getElementById(
        "file-input"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      setTimeout(() => setUploadMessage(""), 3000);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Upload Image</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Please sign in to upload images
            </p>
            <Button onClick={() => window.location.href = "/"}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Upload Image</h1>
      <Card>
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label htmlFor="image-name" className="text-sm font-medium block mb-2">
              Image Name
            </label>
            <Input
              id="image-name"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              placeholder="Enter image name (max 40 characters)"
              maxLength={40}
              disabled={isUploading}
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {imageName.length}/40
            </div>
          </div>

          <div>
            <label
              htmlFor="image-description"
              className="text-sm font-medium block mb-2"
            >
              Image Description (optional)
            </label>
            <Input
              id="image-description"
              value={imageDescription}
              onChange={(e) => setImageDescription(e.target.value)}
              placeholder="Enter a short description (max 120 characters)"
              maxLength={120}
              disabled={isUploading}
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {imageDescription.length}/120
            </div>
          </div>

          <div>
            <label htmlFor="file-input" className="text-sm font-medium block mb-2">
              Select File
            </label>
            <Input
              id="file-input"
              type="file"
              onChange={handleFileSelect}
              disabled={isUploading}
              accept="image/*"
            />
            {selectedFile && (
              <div className="mt-2 text-xs text-muted-foreground">
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={isUploading || !imageName.trim() || !selectedFile}
            className="w-full"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>

          {uploadMessage && (
            <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
              {uploadMessage}
            </div>
          )}

          {uploadError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
              {uploadError}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
