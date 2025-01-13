import { FC, useState, useEffect, useRef } from 'react'
import { X, Upload, Camera, User, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ProfileModalProps } from '@/types/components'
import Image from 'next/image'

interface Profile {
  username: string;
  avatar_url: string;
  phone: string;
  bio: string;
  employer: string;
}

const ProfilePhotoPreview: FC<{
  file: File | null;
  url: string | null;
  onRemove: () => void;
}> = ({ file, url, onRemove }) => {
  const previewUrl = file ? URL.createObjectURL(file) : url

  useEffect(() => {
    return () => {
      if (file && previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [file, previewUrl])

  if (!previewUrl) return null

  return (
    <div className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
      <div className="aspect-square">
        <Image
          src={previewUrl}
          alt="Profile preview"
          width={300}
          height={300}
          className="w-full h-full object-cover"
          unoptimized={file !== null}
        />
      </div>
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          type="button"
          onClick={onRemove}
          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        >
          <XCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  currentUser,
  onClose,
  isMobile
}) => {
  const [profile, setProfile] = useState<Profile>({
    username: '',
    avatar_url: '',
    phone: '',
    bio: '',
    employer: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    fetchProfile()
    return () => stopCamera()
  }, [])

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username, avatar_url, phone, bio, employer')
      .eq('id', currentUser.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to fetch profile. Please try again.')
    } else if (data) {
      setProfile(data)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0])
    }
  }

  const startCamera = async () => {
    console.log('Starting camera initialization...');
    setIsLoading(true)
    setError(null)
    setIsVideoReady(false)
    
    // Set stream first to ensure video element is mounted
    try {
      console.log('Requesting media stream...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      console.log('Media stream obtained:', mediaStream.active, 'tracks:', mediaStream.getTracks().length);
      
      // Set stream first to trigger video element mount
      setStream(mediaStream);
      
      // Wait for video element to be available
      await new Promise<void>((resolve) => {
        const checkVideoRef = () => {
          if (videoRef.current) {
            resolve();
          } else {
            console.log('Waiting for video element...');
            setTimeout(checkVideoRef, 100);
          }
        };
        checkVideoRef();
      });
      
      console.log('Video ref available, setting up video element...');
      const video = videoRef.current!;
      
      // Add all possible video events for debugging
      video.onloadstart = () => console.log('Video loadstart event');
      video.onloadeddata = () => console.log('Video loadeddata event');
      video.oncanplay = () => console.log('Video canplay event');
      video.onplaying = () => console.log('Video playing event');
      video.onwaiting = () => console.log('Video waiting event');
      video.onerror = (e) => console.error('Video error event:', e);
      
      console.log('Setting video srcObject...');
      video.srcObject = mediaStream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        const checkVideo = () => {
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
            resolve();
          } else {
            setTimeout(checkVideo, 100);
          }
        };
        checkVideo();
      });
      
      try {
        console.log('Video ready, attempting to play...');
        await video.play();
        console.log('Video playing successfully');
        setIsVideoReady(true);
      } catch (err) {
        console.error('Error playing video:', err);
        setError('Failed to start video stream');
      }
      
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      console.log('Error details:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint
      });
      setError(error.message || 'Failed to access camera. Please check your permissions.');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    } finally {
      setIsLoading(false)
      console.log('Camera initialization completed');
    }
  };

  const stopCamera = () => {
    setIsVideoReady(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const takePhoto = () => {
    if (!videoRef.current) {
      console.error('Video ref is not available');
      return;
    }

    const video = videoRef.current;
    
    // Simplified ready check
    if (!isVideoReady || video.paused) {
      console.error('Video not ready:', {
        isVideoReady,
        paused: video.paused,
        currentTime: video.currentTime
      });
      setError('Video stream not ready. Please wait a moment and try again.');
      return;
    }
    
    console.log('Starting photo capture process...');
    setIsLoading(true);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      // Simpler drawing approach - draw first, then flip the image
      context.drawImage(video, 0, 0);
      
      // Flip the image after drawing
      context.save();
      context.scale(-1, 1);
      context.drawImage(canvas, -canvas.width, 0);
      context.restore();
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera_photo.jpg', { type: 'image/jpeg' });
          setAvatarFile(file);
          stopCamera();
        } else {
          setError('Failed to capture photo. Please try again.');
        }
        setIsLoading(false);
      }, 'image/jpeg', 0.9);
      
    } catch (error: any) {
      console.error('Error in photo capture process:', error);
      setError(error.message || 'Failed to capture photo. Please try again.');
      setIsLoading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}${Math.random()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      return publicUrlData.publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      let avatar_url = profile.avatar_url

      if (avatarFile) {
        avatar_url = await uploadAvatar(avatarFile)
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          username: profile.username, 
          avatar_url, 
          phone: profile.phone, 
          bio: profile.bio, 
          employer: profile.employer,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)

      if (error) throw error

      onClose()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError(error.message || 'An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg relative overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-gray-800">
                  {avatarFile || profile.avatar_url ? (
                    <Image
                      src={avatarFile ? URL.createObjectURL(avatarFile) : profile.avatar_url}
                      alt="Avatar"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized={avatarFile !== null}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <User size={40} className="text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <label className="cursor-pointer p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:scale-110 transition-transform">
                    <Upload size={18} className="text-blue-500" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={stream ? takePhoto : startCamera}
                    className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:scale-110 transition-transform"
                  >
                    <Camera size={18} className="text-green-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {stream && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000]">
              <div className="relative bg-gray-800 p-4 rounded-lg">
                <div className="relative aspect-[4/3] w-full max-w-2xl">
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline
                    muted
                    className="w-full h-full rounded-lg [transform:rotateY(180deg)]"
                  />
                  <div className="absolute top-4 right-4">
                    {isVideoReady ? (
                      <div className="flex items-center gap-2 bg-green-500/80 text-white px-3 py-1 rounded-full text-sm">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Ready
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-yellow-500/80 text-white px-3 py-1 rounded-full text-sm">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Initializing...
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={takePhoto}
                      disabled={isLoading || !isVideoReady}
                      className="p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera size={24} />
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      disabled={isLoading}
                      className="p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={profile.username}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="employer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Employer
              </label>
              <input
                type="text"
                id="employer"
                name="employer"
                value={profile.employer}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileModal
