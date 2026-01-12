"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VideoScript {
  id: string;
  name: string;
  script: string | null;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function Dashboard1() {
  const [scripts, setScripts] = useState<VideoScript[]>([]);
  const [selectedScript, setSelectedScript] = useState<VideoScript | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.ok) {
        const data = await response.json();
        setScripts(data);
        if (data.length > 0 && !selectedScript) {
          setSelectedScript(data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching scripts:", error);
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

      if (response.ok) {
        setScripts((prev) => prev.filter((s) => s.id !== id));
        if (selectedScript?.id === id) {
          const remaining = scripts.filter((s) => s.id !== id);
          setSelectedScript(remaining.length > 0 ? remaining[0] : null);
        }
      }
    } catch (error) {
      console.error("Error deleting script:", error);
      alert("Failed to delete script");
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
    const fileName = file.name.replace(/\.[^/.]+$/, "");
    
    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fileName,
          script: null,
        }),
      });

      if (response.ok) {
        const newScript = await response.json();
        setScripts((prev) => [newScript, ...prev]);
        setSelectedScript(newScript);
        // Reset file input
        const fileInput = document.getElementById("video-upload-sidebar") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        const fileInputEmpty = document.getElementById("video-upload-empty") as HTMLInputElement;
        if (fileInputEmpty) fileInputEmpty.value = "";
      } else {
        const error = await response.json();
        alert(error.error || "Failed to upload video");
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex gap-4 -mx-[10%] w-[calc(100%+20%)] h-[calc(100vh-15vh)] p-4">
      {selectedScript ? (
        <>
          {/* Left Sidebar - Script List */}
          <Card className="w-80 flex-shrink-0 flex flex-col overflow-hidden">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg mb-4">My Scripts</CardTitle>
              <label
                htmlFor="video-upload-sidebar"
                className="w-full bg-gray-900 text-white py-2.5 px-4 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer flex items-center justify-center text-sm font-medium"
              >
                + Upload Video
              </label>
              <input
                id="video-upload-sidebar"
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </CardHeader>

            {/* Script List */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {scripts.map((script) => (
                  <div
                    key={script.id}
                    onClick={() => {
                      setSelectedScript(script);
                      setIsEditing(false);
                    }}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                      selectedScript?.id === script.id
                        ? "bg-gray-900 text-white"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-sm">{script.name}</h3>
                        <p className={`text-xs mt-1.5 ${
                          selectedScript?.id === script.id ? "text-gray-400" : "text-gray-500"
                        }`}>
                          {new Date(script.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(script.id);
                        }}
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                          selectedScript?.id === script.id
                            ? "bg-white/10 hover:bg-white/20 text-white"
                            : "bg-red-50 hover:bg-red-100 text-red-600"
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Right Content Area */}
          <Card className="flex-1 flex flex-col h-full overflow-hidden">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-medium">
                  {selectedScript.name}
                </CardTitle>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit}>
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleStartEdit}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl">
                {isEditing ? (
                  <textarea
                    value={editedScript}
                    onChange={(e) => setEditedScript(e.target.value)}
                    className="w-full min-h-[500px] bg-gray-50 border border-gray-200 rounded-xl p-5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none font-mono text-sm text-gray-700 leading-relaxed"
                    placeholder="Enter your script here..."
                  />
                ) : selectedScript.script ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed">
                    {selectedScript.script}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">No script content yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        // Empty state - when no scripts exist
        <div className="w-full max-w-5xl mx-auto flex flex-col p-8">
          <h2 className="text-2xl font-semibold mb-6">My Scripts</h2>
          
          {/* Upload Zone */}
          <div
            onClick={() => document.getElementById("video-upload-empty")?.click()}
            className="border-2 border-dashed rounded-3xl bg-white/80 backdrop-blur-sm cursor-pointer transition-all mb-20 shadow-md border-[#d4d4d4] hover:border-[#999] hover:bg-white/90"
            style={{ padding: "4rem" }}
          >
            <input
              id="video-upload-empty"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center text-center">
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
            </div>
          </div>

          {/* Empty State Message */}
          <div className="flex flex-col items-center justify-center text-center" style={{ padding: "3rem 1rem" }}>
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
        </div>
      )}
    </div>
  );
}
