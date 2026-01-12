"use client";

import { useEffect, useState } from "react";

interface VideoScript {
  id: string;
  name: string;
  script: string | null;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function Dashboard() {
  const [scripts, setScripts] = useState<VideoScript[]>([]);
  const [selectedScript, setSelectedScript] = useState<VideoScript | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [scriptName, setScriptName] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.ok) {
        const data = await response.json();
        setScripts(data);
      }
    } catch (error) {
      console.error("Error fetching scripts:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
      if (!scriptName.trim()) {
        setScriptName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scriptName.trim()) {
      alert("Please enter a script name");
      return;
    }

    setIsUploading(true);
    
    try {
      // For now, we'll just create the script entry without extracting text
      // Later you can integrate video transcription here
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: scriptName,
          script: videoFile ? `Video uploaded: ${videoFile.name}` : null,
        }),
      });

      if (response.ok) {
        const newScript = await response.json();
        setScripts((prev) => [newScript, ...prev]);
        setSelectedScript(newScript);
        setScriptName("");
        setVideoFile(null);
        setShowUploadForm(false);
        // Reset file input
        const fileInput = document.getElementById("video-upload") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this script?")) return;

    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: "DELETE",
      });

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

  return (
    <div className="flex -mx-[10%] w-[calc(100%+20%)] h-[calc(100vh-15vh)] bg-[#FEFAEF] gap-4 p-4">
      {selectedScript ? (
        // Three-panel layout when script is selected
        <>
          {/* Left Sidebar - Script List */}
          <div className="w-80 rounded-xl border border-gray-200 bg-white flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold mb-4">My Scripts</h2>
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
              >
                {showUploadForm ? "Cancel" : "+ Upload Video"}
              </button>
            </div>

            {showUploadForm && (
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <form onSubmit={handleUpload} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Script Name</label>
                    <input
                      type="text"
                      value={scriptName}
                      onChange={(e) => setScriptName(e.target.value)}
                      placeholder="Enter script name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Video File</label>
                    <input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </button>
                </form>
              </div>
            )}

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
                      className={`p-3 mb-2 rounded-md cursor-pointer transition-colors ${
                        selectedScript?.id === script.id
                          ? "bg-black text-white"
                          : "bg-gray-50 hover:bg-gray-100"
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
          <div className="flex-1 flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-4xl">
                <h1 className="text-3xl font-bold mb-4">{selectedScript.name}</h1>
                <div className="bg-gray-50 rounded-lg p-6 min-h-[400px]">
                  {selectedScript.script ? (
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
          <div className="w-80 rounded-xl border border-gray-200 bg-white flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold">Details</h2>
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
        <div className="w-full rounded-xl border border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold mb-4">My Scripts</h2>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
            >
              {showUploadForm ? "Cancel" : "+ Upload Video"}
            </button>
          </div>

          {showUploadForm && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <form onSubmit={handleUpload} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Script Name</label>
                  <input
                    type="text"
                    value={scriptName}
                    onChange={(e) => setScriptName(e.target.value)}
                    placeholder="Enter script name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Video File</label>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </button>
              </form>
            </div>
          )}

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
                    className="p-3 mb-2 rounded-md cursor-pointer transition-colors bg-gray-50 hover:bg-gray-100"
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
                        className="ml-2 text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-600"
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
      )}
    </div>
  );
}
