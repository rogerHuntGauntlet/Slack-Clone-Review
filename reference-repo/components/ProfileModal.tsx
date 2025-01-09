import { FC, useState, useEffect, useRef } from 'react'
import { X, Upload, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ProfileModalProps {
  currentUser: { id: string; email: string };
  onClose: () => void;
}

interface Profile {
  username: string;
  avatar_url: string;
  phone: string;
  bio: string;
  employer: string;
}

const ProfileModal: FC<ProfileModalProps> = ({ currentUser, onClose }) => {
  const [profile, setProfile] = useState<Profile>({
    username: '',
    avatar_url: '',
    phone: '',
    bio: '',
    employer: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('users')
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
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
      setStream(mediaStream)
    } catch (error) {
      console.error('Error accessing camera:', error)
      setError('Failed to access camera. Please check your permissions.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const takePhoto = () => {
    if (stream && videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'camera_photo.jpg', { type: 'image/jpeg' })
          setAvatarFile(file)
        }
      }, 'image/jpeg')
      stopCamera()
    }
  }

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
        .from('users')
        .update({ username: profile.username, avatar_url, phone: profile.phone, bio: profile.bio, employer: profile.employer })
        .eq('id', currentUser.id)

      if (error) throw error

      onClose()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError(error.message || 'An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-[90%] mx-4 relative overflow-hidden shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Edit Profile</h2>
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Avatar
            </label>
            <div className="mt-1 flex items-center space-x-4">
              <img
                src={avatarFile ? URL.createObjectURL(avatarFile) : (profile.avatar_url || '/placeholder.svg?height=100&width=100')}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover"
              />
              <label className="cursor-pointer bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors">
                <Upload size={20} />
                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              {stream ? (
                <div className="relative">
                  <video ref={videoRef} autoPlay className="w-32 h-32 rounded-lg" />
                  <button
                    type="button"
                    onClick={takePhoto}
                    className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
                  >
                    <Camera size={20} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-green-500 text-white p-2 rounded-md hover:bg-green-600 transition-colors"
                >
                  <Camera size={20} />
                </button>
              )}
            </div>
          </div>
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            ></textarea>
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileModal
