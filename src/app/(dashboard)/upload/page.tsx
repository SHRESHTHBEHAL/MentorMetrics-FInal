"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { uploadVideo } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, Activity, Upload, AlertCircle, X } from "lucide-react";

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ALLOWED_TYPES = ["video/mp4", "video/quicktime"];
const ALLOWED_EXTENSIONS = [".mp4", ".mov"];

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [mentorName, setMentorName] = useState("");
  const [mentorError, setMentorError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentorInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File): string | null => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return "Only MP4 and MOV files are accepted.";
    }
    if (f.size > MAX_FILE_SIZE) {
      return "File size exceeds the 2GB limit.";
    }
    if (f.size === 0) {
      return "File is empty.";
    }
    return null;
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selected = e.target.files[0];
      const err = validateFile(selected);
      if (err) {
        setUploadError(err);
        setFile(null);
        return;
      }
      setUploadError("");
      setFile(selected);
    }
  }, [validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    const err = validateFile(dropped);
    if (err) {
      setUploadError(err);
      setFile(null);
      return;
    }
    setUploadError("");
    setFile(dropped);
  }, [validateFile]);

  const handleUpload = async () => {
    if (!file) return;

    const normalizedMentorName = mentorName.trim();
    if (!normalizedMentorName) {
      setMentorError("Mentor name is required before analysis.");
      mentorInputRef.current?.focus();
      return;
    }
    
    setUploading(true);
    setMentorError("");
    setUploadError("");
    try {
      if (!user?.id) {
        throw new Error("Please sign in again to upload");
      }
      const { session_id } = await uploadVideo(file, normalizedMentorName, user.id);
      router.push(`/status?session_id=${session_id}`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please try again.");
      setUploading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-4xl flex flex-col gap-12">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">New Upload</span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none uppercase">Session Ingest</h1>
        </div>

        {uploadError && (
          <div className="bg-red-50 border-2 border-red-600 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 font-bold text-sm">{uploadError}</p>
            </div>
            <button onClick={() => setUploadError("")} className="text-red-600 hover:text-red-800 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="relative group">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e2e2_1px,transparent_1px)] [background-size:20px_20px] opacity-30 -z-10"></div>
          <div 
            className={`border-[3px] border-black bg-white aspect-video md:aspect-[21/9] flex flex-col items-center justify-center text-center p-8 transition-all cursor-pointer ${
              isDragging
                ? "bg-primary/10 border-primary scale-[1.02]"
                : "hover:bg-surface-container-low"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-6 flex items-center justify-center w-16 md:w-20 h-16 md:h-20 bg-black text-white">
              {isDragging ? <Upload className="w-8 md:w-10 h-8 md:h-10" /> : <Plus className="w-8 md:w-10 h-8 md:h-10" />}
            </div>
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-4">
              {isDragging ? "Drop it right here!" : "Drop your teaching session here"}
            </h2>
            <div className="flex flex-col gap-2">
              <p className="text-xs md:text-sm font-bold uppercase text-neutral-500 tracking-widest">
                File format: MP4, MOV. Max size: 2GB
              </p>
              <div className="flex justify-center items-center gap-4 mt-4">
                <div className="h-[2px] w-8 md:w-12 bg-black"></div>
                <span className="text-xs font-bold uppercase">Or Browse Local Storage</span>
                <div className="h-[2px] w-8 md:w-12 bg-black"></div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              accept=".mp4,.mov"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {file && (
          <div className="bg-surface-container p-4 border-2 border-black flex items-center justify-between">
            <p className="font-bold">Selected: {file.name}</p>
            <p className="text-xs font-bold text-neutral-500 uppercase">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
          </div>
        )}

        <div className="bg-white border-2 border-black p-4 md:p-6">
          <label htmlFor="mentorName" className="block text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-2">
            Mentor Name
          </label>
          <input
            ref={mentorInputRef}
            id="mentorName"
            type="text"
            value={mentorName}
            onChange={(e) => {
              setMentorName(e.target.value);
              if (mentorError) setMentorError("");
            }}
            placeholder="e.g., Chandan"
            className={`w-full border-2 px-4 py-3 text-base font-bold uppercase tracking-wide focus:outline-none ${
              mentorError ? "border-red-600" : "border-black focus:border-primary"
            }`}
          />
          {mentorError && <p className="mt-2 text-xs font-bold text-red-600 uppercase">{mentorError}</p>}
        </div>

        <div className="flex flex-col md:flex-row items-end justify-between gap-8">
          <div className="max-w-md">
            <p className="text-base md:text-lg leading-snug font-medium text-neutral-600">
              Our AI models will extract sentiment, body language metrics, and pedagogical efficiency scores from your video feed.
            </p>
          </div>
          <div className="w-full md:w-auto">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`w-full md:w-auto font-black text-xl md:text-2xl uppercase px-8 md:px-12 py-4 md:py-6 border-[3px] flex items-center justify-center gap-2 md:gap-4 ${
                file ? "bg-primary text-white border-black hover:bg-black" : "bg-neutral-200 text-neutral-400 border-neutral-300 cursor-not-allowed"
              }`}
            >
              {uploading ? "Uploading..." : "Analyze session"}
              <Activity className="w-6 md:w-8 h-6 md:h-8" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-8 md:pt-12 border-t-2 border-black">
          <div className="bg-surface-container-high p-4 md:p-6 border-r-[3px] border-black">
            <span className="text-[10px] font-bold uppercase block mb-2 md:mb-4">Privacy Level</span>
            <div className="text-2xl md:text-4xl font-black tracking-tighter uppercase">ENCRYPTED</div>
          </div>
          <div className="bg-surface-container-high p-4 md:p-6">
            <span className="text-[10px] font-bold uppercase block mb-2 md:mb-4">Est. Wait Time</span>
            <div className="text-2xl md:text-4xl font-black tracking-tighter uppercase">~2-4 MINS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
