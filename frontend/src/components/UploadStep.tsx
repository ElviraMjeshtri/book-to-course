import React, { useRef } from "react";
import { StatusBadge } from "./StatusBadge";

interface UploadStepProps {
  selectedFile: File | null;
  isUploading: boolean;
  bookId: string | null;
  disabled: boolean;
  error: string | null;
  onFileSelect: (file: File | null) => void;
  onUpload: () => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  selectedFile,
  isUploading,
  bookId,
  disabled,
  error,
  onFileSelect,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".pdf")) {
      onFileSelect(file);
    } else if (file) {
      onFileSelect(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith(".pdf")) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="step-content">
      <div className="step-header">
        <div className="step-number">1</div>
        <div>
          <h2>Upload your book</h2>
          <p className="step-description">
            Upload a technical PDF to generate your course
          </p>
        </div>
        {bookId && <StatusBadge variant="success">Uploaded</StatusBadge>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div
        className={`dropzone ${selectedFile ? "has-file" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {selectedFile ? (
          <>
            <div className="file-icon">📄</div>
            <p className="file-name">{selectedFile.name}</p>
            <p className="file-hint">Click to choose a different file</p>
          </>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <p className="dropzone-text">
              Drop your PDF here or <span className="link">browse</span>
            </p>
            <p className="dropzone-hint">Supports PDF files up to 20MB</p>
          </>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}

      <button
        className="btn btn-primary btn-full"
        onClick={onUpload}
        disabled={!selectedFile || isUploading || disabled}
      >
        {isUploading ? (
          <>
            <span className="spinner" /> Uploading...
          </>
        ) : bookId ? (
          "Re-upload Book"
        ) : (
          "Upload & Extract Text"
        )}
      </button>
    </div>
  );
};

