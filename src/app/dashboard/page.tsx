"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface VideoScript {
  id: string;
  name: string;
  script: string | null;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function Dashboard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [scripts, setScripts] = useState<VideoScript[]>([]);
  const [selectedScript, setSelectedScript] = useState<VideoScript | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState("");
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>("");

  // Redirect if not authenticated (client-side fallback)
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  // Reset selected script when reset param is present or when navigating to dashboard
  useEffect(() => {
    if (pathname === "/dashboard") {
      const reset = searchParams.get("reset");
      if (reset === "true") {
        setSelectedScript(null);
        setIsEditing(false);
        setEditedScript("");
        // Clean up the URL by removing the query parameter
        router.replace("/dashboard");
      }
    }
  }, [pathname, searchParams, router]);

  useEffect(() => {
    if (session?.user) {
      fetchScripts();
    }
  }, [session]);

  const fetchScripts = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) {
        // Unauthorized - redirect to sign-in
        router.push("/sign-in");
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setScripts(data);
      }
    } catch (error) {
      console.error("Error fetching scripts:", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      await uploadVideo(file);
    }
  };

  const uploadVideo = async (file: File) => {
    setIsUploading(true);
    setTranscriptionStatus("uploading");
    const fileName = file.name.replace(/\.[^/.]+$/, "");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", fileName);

      setTranscriptionStatus("transcribing");
      const response = await fetch("/api/videos", {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (response.ok) {
        const newScript = await response.json();
        setScripts((prev) => [newScript, ...prev]);
        setSelectedScript(newScript);
        setTranscriptionStatus("complete");
        // Reset file input
        const fileInput = document.getElementById("video-upload-zone") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        const fileInputSidebar = document.getElementById("video-upload-sidebar") as HTMLInputElement;
        if (fileInputSidebar) fileInputSidebar.value = "";
        // Clear status after a brief delay
        setTimeout(() => setTranscriptionStatus(""), 2000);
      } else {
        const error = await response.json();
        setTranscriptionStatus("error");
        alert(error.error || "Failed to upload video");
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      setTranscriptionStatus("error");
      alert("Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      await uploadVideo(file);
    }
  };

  const handleUploadZoneClick = () => {
    const fileInput = document.getElementById("video-upload-zone") as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  const handleSidebarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      await uploadVideo(file);
    }
  };

  const handleStartEdit = () => {
    if (selectedScript) {
      setEditedScript(selectedScript.script || "");
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedScript("");
  };

  const handleSaveEdit = async () => {
    if (!selectedScript) return;

    try {
      const response = await fetch(`/api/videos/${selectedScript.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: editedScript,
        }),
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (response.ok) {
        const updatedScript = await response.json();
        setScripts((prev) =>
          prev.map((s) => (s.id === updatedScript.id ? updatedScript : s))
        );
        setSelectedScript(updatedScript);
        setIsEditing(false);
        setEditedScript("");
      } else {
        alert("Failed to save changes");
      }
    } catch (error) {
      console.error("Error saving script:", error);
      alert("Failed to save changes");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this script?")) return;

    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (response.ok) {
        setScripts((prev) => prev.filter((s) => s.id !== id));
        if (selectedScript?.id === id) {
          setSelectedScript(null);
        }
      }
    } catch (error) {
      console.error("Error deleting script:", error);
      alert("Failed to delete script");
    }
  };

  // Show loading state while checking authentication
  if (isPending || !session?.user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-15vh)]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex -mx-[10%] w-[calc(100%+20%)] h-[calc(100vh-15vh)] gap-4 p-4">
      {selectedScript ? (
        // Three-panel layout when script is selected
        <>
          {/* Left Sidebar - Script List */}
          <div className="w-80 rounded-[12px] border border-gray-200 bg-white flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-medium mb-4">My Scripts</h2>
              <label
                htmlFor="video-upload-sidebar"
                className={`w-full bg-black text-white py-2 px-4 rounded-[12px] hover:bg-gray-800 transition-colors cursor-pointer flex items-center justify-center ${
                  isUploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isUploading 
                  ? transcriptionStatus === "transcribing" 
                    ? "Transcribing..." 
                    : "Uploading..."
                  : "+ Upload Video"}
              </label>
              <input
                id="video-upload-sidebar"
                type="file"
                accept="video/*"
                onChange={handleSidebarFileSelect}
                className="hidden"
                disabled={isUploading}
              />
            </div>

            {/* Script List */}
            <div className="flex-1 overflow-y-auto">
              {scripts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No scripts yet</p>
                  <p className="text-sm mt-2">Upload a video to get started</p>
                </div>
              ) : (
                <div className="p-2">
                  {scripts.map((script) => (
                    <div
                      key={script.id}
                      onClick={() => setSelectedScript(script)}
                      className={`p-3 mb-2 rounded-[12px] cursor-pointer transition-all ${
                        selectedScript?.id === script.id
                          ? "bg-black text-white shadow-sm"
                          : "bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{script.name}</h3>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(script.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(script.id);
                          }}
                          className={`ml-2 text-xs px-2 py-1 rounded ${
                            selectedScript?.id === script.id
                              ? "bg-white/20 hover:bg-white/30 text-white"
                              : "bg-red-100 hover:bg-red-200 text-red-600"
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col rounded-[12px] border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-4xl">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-3xl font-medium">{selectedScript.name}</h1>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 border border-gray-300 rounded-[12px] hover:bg-gray-50 transition-colors text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-black text-white rounded-[12px] hover:bg-gray-800 transition-colors"
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleStartEdit}
                        className="px-4 py-2 border border-gray-300 rounded-[12px] hover:bg-gray-50 transition-colors text-gray-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-[12px] p-6 min-h-[400px]">
                  {isEditing ? (
                    <textarea
                      value={editedScript}
                      onChange={(e) => setEditedScript(e.target.value)}
                      className="w-full h-full min-h-[400px] bg-white border border-gray-300 rounded-[12px] p-4 focus:outline-none focus:ring-2 focus:ring-black resize-none font-mono text-sm"
                      placeholder="Enter your script here..."
                    />
                  ) : selectedScript.script ? (
                    <p className="whitespace-pre-wrap text-gray-800">
                      {selectedScript.script}
                    </p>
                  ) : (
                    <p className="text-gray-500 italic">No script content yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 rounded-[12px] border border-gray-200 bg-white flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-medium">Details</h2>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedScript.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedScript.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Script ID</label>
                  <p className="text-xs mt-1 font-mono text-gray-600 break-all">
                    {selectedScript.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Full-width layout when no script is selected
        <div className="w-full max-w-5xl mx-auto flex flex-col p-8">
          <h2 className="text-2xl font-semibold mb-6">My Scripts</h2>
          
          {/* Upload Zone */}
          <div
            onClick={isUploading ? undefined : handleUploadZoneClick}
            onDragOver={isUploading ? undefined : handleDragOver}
            onDragLeave={isUploading ? undefined : handleDragLeave}
            onDrop={isUploading ? undefined : handleDrop}
            className={`border-2 border-dashed rounded-3xl bg-white/80 backdrop-blur-sm transition-all mb-20 shadow-md ${
              isUploading
                ? "border-gray-300 cursor-wait opacity-70"
                : isDragging
                  ? "border-black bg-white/90 cursor-pointer"
                  : "border-[#d4d4d4] hover:border-[#999] hover:bg-white/90 cursor-pointer"
            }`}
            style={{ padding: "4rem" }}
          >
            <input
              id="video-upload-zone"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <div className="flex flex-col items-center justify-center text-center">
              {isUploading ? (
                <>
                  {/* Loading Spinner */}
                  <svg
                    className="w-8 h-8 mb-4 text-gray-400 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <h3 className="text-[1.1rem] font-medium mb-2 text-gray-900 tracking-tight">
                    {transcriptionStatus === "transcribing" 
                      ? "Transcribing video..." 
                      : transcriptionStatus === "complete"
                      ? "Transcription complete!"
                      : "Uploading..."}
                  </h3>
                  <p className="text-[0.9rem] text-[#666]">
                    {transcriptionStatus === "transcribing"
                      ? "This may take a moment depending on video length"
                      : transcriptionStatus === "complete"
                      ? "Your video script is ready"
                      : "Please wait while we process your video"}
                  </p>
                </>
              ) : (
                <>
                  {/* Upload Icon */}
                  <svg
                    className="w-8 h-8 mb-4 text-gray-400"
                    style={{ opacity: 0.5 }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <h3 className="text-[1.1rem] font-medium mb-2 text-gray-900 tracking-tight">
                    + Upload Video
                  </h3>
                  <p className="text-[0.9rem] text-[#666]">
                    Drag and drop your video here, or click to browse
                  </p>
                </>
              )}
            </div>
          </div>


          {/* Empty State - Shows when no scripts exist */}
          {scripts.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center" style={{ padding: "3rem 1rem" }}>
              {/* Video Camera Icon */}
              <svg
                width="64"
                height="64"
                className="text-gray-400"
                style={{ opacity: 0.3, marginBottom: "0.5rem" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="mb-2 text-[#666]" style={{ fontSize: "1.25rem", fontWeight: 500 }}>
                No scripts yet
              </p>
              <p className="text-[#999]" style={{ fontSize: "0.95rem" }}>
                Upload a video to get started
              </p>
            </div>
          )}

          {/* Script List */}
          {scripts.length > 0 && (
            <div className="space-y-2">
              {scripts.map((script) => (
                <div
                  key={script.id}
                  onClick={() => setSelectedScript(script)}
                  className="p-3 rounded-[16px] cursor-pointer transition-all bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm"
                >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-gray-900">{script.name}</h3>
                        <p className="text-xs mt-1 text-[#666]">
                          {new Date(script.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(script.id);
                        }}
                        className="ml-2 text-xs px-2 py-1 rounded-[16px] bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}