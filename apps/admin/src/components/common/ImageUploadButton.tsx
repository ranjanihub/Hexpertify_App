import React, { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { uploadImageAsset } from '../../lib/uploadImage';

interface ImageUploadButtonProps {
  /** Receives the new image URL once the file is saved to Assets */
  onUploaded: (url: string) => void;
  /** Name for the new asset (defaults to the file name) */
  assetName?: string;
  /** Assets label: Banner, Icon, Consultant, Blog, Images… */
  assetType?: string;
  label?: string;
  className?: string;
}

/**
 * "Upload" next to an image URL field: picks a file, saves it to Assets and fills the field with its URL.
 */
export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onUploaded,
  assetName,
  assetType,
  label = 'Upload',
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageAsset(file, { name: assetName, type: assetType });
      onUploaded(url);
    } catch (err: any) {
      alert(`Image not uploaded: ${err?.message || 'please try again'}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Upload an image from your computer. It is saved to Assets and its URL is filled in."
        className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-colors ${
          uploading ? 'bg-purple-100 text-purple-500 cursor-wait' : 'bg-purple-50 text-[#5e2be2] hover:bg-purple-100 border border-purple-200'
        } ${className}`}
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        <span>{uploading ? 'Uploading…' : label}</span>
      </button>
    </>
  );
};
