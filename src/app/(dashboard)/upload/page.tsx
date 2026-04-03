"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadVideo } from "@/lib/api";
import { Plus, Activity } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const { session_id } = await uploadVideo(file);
      router.push(`/status?session_id=${session_id}`);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-4xl flex flex-col gap-12">
        {/* Contextual Header */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">New Upload</span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none uppercase">Session Ingest</h1>
        </div>

        {/* Upload Area */}
        <div className="relative group">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e2e2_1px,transparent_1px)] [background-size:20px_20px] opacity-30 -z-10"></div>
          <div 
            className="border-[3px] border-black bg-white aspect-video md:aspect-[21/9] flex flex-col items-center justify-center text-center p-8 transition-all hover:bg-surface-container-low cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="mb-6 flex items-center justify-center w-16 md:w-20 h-16 md:h-20 bg-black text-white">
              <Plus className="w-8 md:w-10 h-8 md:h-10" />
            </div>
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-4">
              Drop your teaching session here
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

        {/* Selected File Display */}
        {file && (
          <div className="bg-surface-container p-4 border-2 border-black">
            <p className="font-bold">Selected: {file.name}</p>
          </div>
        )}

        {/* Action Section */}
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

        {/* Metric Blocks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-8 md:pt-12 border-t-2 border-black">
          <div className="bg-surface-container-high p-4 md:p-6 border-r-[3px] border-black">
            <span className="text-[10px] font-bold uppercase block mb-2 md:mb-4">Processing Engine</span>
            <div className="text-2xl md:text-4xl font-black tracking-tighter uppercase">V3.4-TITAN</div>
          </div>
          <div className="bg-surface-container-high p-4 md:p-6 border-r-[3px] border-black">
            <span className="text-[10px] font-bold uppercase block mb-2 md:mb-4">Privacy Level</span>
            <div className="text-2xl md:text-4xl font-black tracking-tighter uppercase">ENCRYPTED</div>
          </div>
          <div className="bg-surface-container-high p-4 md:p-6">
            <span className="text-[10px] font-bold uppercase block mb-2 md:mb-4">Est. Wait Time</span>
            <div className="text-2xl md:text-4xl font-black tracking-tighter uppercase">~4.5 MIN</div>
          </div>
        </div>
      </div>
    </div>
  );
}
