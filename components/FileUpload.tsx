import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, X } from 'lucide-react'

interface FileUploadProps {
  onUpload: (url: string, fileName: string) => void
  maxSize?: number // in bytes
  allowedTypes?: string[]
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  maxSize = 5 * 1024 * 1024, // 5MB default
  allowedTypes = ['image/*', 'application/pdf', 'text/plain']
}) => {
  const [uploading, setUploading] = useState(false)

  const uploadFile = async (file: File) => {
    if (file.size > maxSize) {
      alert('File is too large')
      return
    }
    
    if (!allowedTypes.some(type => file.type.match(type))) {
      alert('File type not allowed')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('message_attachments')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('message_attachments')
        .getPublicUrl(fileName)

      onUpload(publicUrl, file.name)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative">
      <input
        type="file"
        className="hidden"
        id="file-upload"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) uploadFile(file)
        }}
        disabled={uploading}
      />
      <label
        htmlFor="file-upload"
        className={`cursor-pointer flex items-center justify-center p-2 rounded-lg border-2 border-dashed
          ${uploading 
            ? 'border-gray-400 bg-gray-100 cursor-not-allowed' 
            : 'border-blue-400 hover:border-blue-600'}`}
      >
        {uploading ? (
          <div className="animate-pulse">Uploading...</div>
        ) : (
          <Upload className="w-6 h-6 text-blue-500" />
        )}
      </label>
    </div>
  )
}

export default FileUpload
