import { useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  loading: boolean;
}

export function FileUpload({ onFileSelect, loading }: FileUploadProps) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file && file.name.endsWith('.fit')) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <label className="block cursor-pointer">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {loading ? 'Processing...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-400">.FIT files from Garmin/Stryd</p>
          </div>
        </div>
        <input
          type="file"
          accept=".fit,.FIT"
          onChange={handleChange}
          className="hidden"
          disabled={loading}
        />
      </label>
    </div>
  );
}
