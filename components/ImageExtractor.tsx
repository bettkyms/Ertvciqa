import React, { useState, useCallback } from 'react';
import { extractScheduleFromImage } from '../services/geminiService';
import { WeeklyTrainerReportData } from '../types';

interface ImageExtractorProps {
    onDataExtracted: (data: WeeklyTrainerReportData) => void;
}

const fileToBase64 = (file: File): Promise<{base64: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mimeType = result.match(/:(.*?);/)?.[1] || 'application/octet-stream';
      resolve({ base64, mimeType });
    };
    reader.onerror = error => reject(error);
  });
};

const ImageExtractor: React.FC<ImageExtractorProps> = ({ onDataExtracted }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            setError('');
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setError('Please upload a valid image file.');
        }
    };

    const handleDragEvents = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }

    const handleDragEnter = (e: React.DragEvent) => {
        handleDragEvents(e);
        setIsDragging(true);
    }

    const handleDragLeave = (e: React.DragEvent) => {
        handleDragEvents(e);
        setIsDragging(false);
    }
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvents(e);
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileChange(files[0]);
        }
    };

    const handleExtract = async () => {
        if (!imageFile) return;
        setIsLoading(true);
        setError('');
        try {
            const { base64, mimeType } = await fileToBase64(imageFile);
            const extractedData = await extractScheduleFromImage(base64, mimeType);
            onDataExtracted(extractedData);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred during extraction.');
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setImageFile(null);
        setImagePreview(null);
        setError('');
        setIsLoading(false);
    }
    
    return (
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
            {!imagePreview ? (
                <div 
                    onDrop={handleDrop}
                    onDragOver={handleDragEvents}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'}`}
                >
                    <input
                        type="file"
                        id="image-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-indigo-600 font-semibold">Click to upload an image</p>
                        <p className="text-sm text-slate-500">or drag and drop</p>
                    </label>
                    {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="border rounded-lg p-2 bg-white shadow-sm">
                        <img src={imagePreview} alt="Attendance form preview" className="w-full h-auto rounded-md object-contain max-h-80" />
                    </div>
                    <div className="text-center md:text-left">
                        <h3 className="font-bold text-slate-800">Ready to Extract?</h3>
                        <p className="text-sm text-slate-600 my-2">Click the button below to let AI read the schedule from the uploaded image.</p>
                         {error && <p className="text-red-500 text-sm my-3" role="alert">{error}</p>}
                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                            <button
                                onClick={handleExtract}
                                disabled={isLoading}
                                className="flex-grow bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 flex items-center justify-center"
                            >
                                {isLoading && (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {isLoading ? 'Extracting...' : 'Extract Schedule'}
                            </button>
                            <button
                                onClick={reset}
                                className="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageExtractor;
