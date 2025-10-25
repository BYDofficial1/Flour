import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { CameraIcon } from './icons/CameraIcon';

interface AvatarProps {
  url: string | null;
  size: number;
  onUpload: (filePath: string) => void;
  readOnly: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ url, size, onUpload, readOnly }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (url) downloadImage(url);
    else setAvatarUrl(null);
  }, [url]);

  const downloadImage = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('avatars').download(path);
      if (error) throw error;
      setAvatarUrl(URL.createObjectURL(data));
    } catch (error) {
      console.error('Error downloading image: ', error);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      onUpload(filePath);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <img
        src={avatarUrl || `https://ui-avatars.com/api/?name=?&size=${size}&background=1e293b&color=94a3b8`}
        alt="Avatar"
        className="rounded-full object-cover"
        style={{ height: size, width: size }}
      />
      {!readOnly && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
          <label htmlFor="single" className="cursor-pointer">
            {uploading ? <div className="loader"></div> : <CameraIcon />}
          </label>
          <input
            style={{ visibility: 'hidden', position: 'absolute' }}
            type="file"
            id="single"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
          />
        </div>
      )}
       <style>{`
        .loader {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `}</style>
    </div>
  );
};

export default Avatar;
