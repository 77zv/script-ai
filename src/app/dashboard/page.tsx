"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

interface VideoScript {
  id: string;
  name: string;
  script: string | null;
  repurposedScript: string | null;
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
  const [showRepurposed, setShowRepurposed] = useState(false);
  const [hasBackboardProfile, setHasBackboardProfile] = useState<boolean | null>(null);

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
        setShowRepurposed(false);
        // Clean up the URL by removing the query parameter
        router.replace("/dashboard");
      }
    }
  }, [pathname, searchParams, router]);

  useEffect(() => {
    if (session?.user) {
      fetchScripts();
      checkBackboardProfile();
    }
  }, [session]);

  const checkBackboardProfile = async () => {
    try {
      const response = await fetch("/api/backboard");
      if (response.ok) {
        const data = await response.json();
        setHasBackboardProfile(!!data.profile);
      }
    } catch (error) {
      console.error("Error checking backboard profile:", error);
    }
  };

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

  const handleStartEdit = () => {
    if (selectedScript) {
      const scriptToEdit = showRepurposed 
        ? (selectedScript.repurposedScript || selectedScript.script || "")
        : (selectedScript.script || "");
      setEditedScript(scriptToEdit);
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
      const updateData: { script?: string; repurposedScript?: string } = {};
      if (showRepurposed) {
        updateData.repurposedScript = editedScript;
      } else {
        updateData.script = editedScript;
      }

      const response = await fetch(`/api/videos/${selectedScript.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
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
    setOpenMenuId(null);
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
        // Two-panel layout when script is selected (no My Scripts sidebar)
        <>
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
                
                {/* Script Type Toggle */}
                {selectedScript.repurposedScript && (
                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={() => setShowRepurposed(false)}
                      className={`px-4 py-2 rounded-[12px] transition-colors ${
                        !showRepurposed
                          ? "bg-black text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setShowRepurposed(true)}
                      className={`px-4 py-2 rounded-[12px] transition-colors ${
                        showRepurposed
                          ? "bg-black text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Repurposed
                    </button>
                  </div>
                )}
                
                {/* Onboarding prompt if no backboard profile */}
                {!hasBackboardProfile && !selectedScript.repurposedScript && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-[12px]">
                    <p className="text-sm text-blue-800 mb-2">
                      Complete your backboard.io onboarding to get AI-repurposed scripts tailored to your voice and brand.
                    </p>
                    <Link
                      href="/onboarding"
                      className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      Complete Onboarding →
                    </Link>
                  </div>
                )}

                <div className="bg-gray-50 rounded-[12px] p-6 min-h-[400px]">
                  {isEditing ? (
                    <textarea
                      value={editedScript}
                      onChange={(e) => setEditedScript(e.target.value)}
                      className="w-full h-full min-h-[400px] bg-white border border-gray-300 rounded-[12px] p-4 focus:outline-none focus:ring-2 focus:ring-black resize-none font-mono text-sm"
                      placeholder="Enter your script here..."
                    />
                  ) : (() => {
                    const scriptToShow = showRepurposed 
                      ? (selectedScript.repurposedScript || selectedScript.script)
                      : selectedScript.script;
                    return scriptToShow ? (
                      <div className="whitespace-pre-wrap text-gray-800">
                        {scriptToShow.split('\n\n').map((paragraph, idx) => {
                          const needsManualInput = paragraph.includes('[⚠️ NO PROFILE INFORMATION AVAILABLE');
                          if (needsManualInput) {
                            const [text, warning] = paragraph.split('[⚠️');
                            return (
                              <div key={idx} className="mb-4">
                                <p className="mb-2">{text.trim()}</p>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                                  <p className="text-yellow-800 font-medium">⚠️ Manual Input Needed</p>
                                  <p className="text-yellow-700 mt-1">
                                    No profile information available for this segment. Please manually adapt it to match your voice and style.
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return <p key={idx} className="mb-2">{paragraph}</p>;
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        {showRepurposed 
                          ? "No repurposed script available. Complete your backboard.io onboarding to get repurposed scripts."
                          : "No script content yet"}
                      </p>
                    );
                  })()}
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
            <div className="grid grid-cols-4 gap-3">
              {scripts.map((script) => (
                <div
                  key={script.id}
                  className="aspect-rectangle p-8 rounded-[12px] bg-white border border-gray-300 hover:border-gray-300 hover:shadow-sm transition-all relative flex items-end justify-center"
                >
                  {/* Circle Icon Container - Left */}
                  <div className="absolute left-2 top-4 w-14">
                    <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                  </div>

                  {/* Three Dots Menu - Right */}
                  <div className="absolute right-2 top-2" data-menu-id={script.id}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === script.id ? null : script.id);
                      }}
                      className="flex flex-col gap-0.5 p-0.5 hover:bg-gray-100 rounded"
                    >
                      <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                      <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                      <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                    </button>

                    {/* Dropdown Menu */}
                    {openMenuId === script.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[100px] overflow-hidden"
                      >
                        <button
                          onClick={() => handleStartRename(script)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 border-b border-gray-100"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDelete(script.id)}
                          className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Name - Bottom Center */}
                  <div
                    onClick={() => setSelectedScript(script)}
                    className="absolute bottom-2 left-14 right-8 cursor-pointer text-center px-2"
                  >
                    {renamingId === script.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveRename(script.id);
                            } else if (e.key === "Escape") {
                              handleCancelRename();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0 text-sm px-2 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveRename(script.id);
                          }}
                          className="text-sm px-1.5 py-0.5 bg-black text-white rounded"
                        >
                          ✓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelRename();
                          }}
                          className="text-sm px-1.5 py-0.5 bg-gray-200 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 truncate">
                        {script.name}
                      </p>
                    )}
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