import React, { useContext, useState } from 'react';
import { DataContext } from '../contexts/DataContext';

const SettingsManagement: React.FC = () => {
  const { logo, setLogo } = useContext(DataContext);
  const [message, setMessage] = useState('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    // Check file type
    if (!file.type.startsWith('image/')) {
        setMessage('Please upload a valid image file (e.g., PNG, JPG).');
        return;
    }
    // Check file size (e.g., max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        setMessage('Image size should not exceed 2MB.');
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result as string);
      setMessage('Logo uploaded successfully!');
      setTimeout(() => setMessage(''), 3000);
    };
    reader.onerror = () => {
        setMessage('Failed to read the file.');
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveLogo = () => {
    setLogo(null);
    setMessage('Logo removed.');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-700 mb-1">Application Settings</h2>
      <p className="text-slate-500 mb-6 text-sm">Manage branding for PDF reports.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Logo Upload */}
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-700 mb-3">Institutional Logo</h3>
          <p className="text-sm text-slate-500 mb-4">Upload a logo to brand your PDF reports. Recommended format: PNG with transparent background.</p>
          <input
            type="file"
            accept="image/png, image/jpeg, image/svg+xml"
            onChange={handleLogoChange}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />
           {message && <p className="text-sm text-center text-green-700 pt-4">{message}</p>}
        </div>

        {/* Logo Preview */}
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-700 mb-3">Current Logo Preview</h3>
          <div className="flex items-center justify-center bg-white p-4 rounded-md h-32 border border-slate-200">
            {logo ? (
              <img src={logo} alt="Current Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <p className="text-slate-400">No logo uploaded.</p>
            )}
          </div>
          {logo && (
            <button
              onClick={handleRemoveLogo}
              className="w-full mt-4 bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
            >
              Remove Logo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsManagement;