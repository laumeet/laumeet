'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ImageUploader({ onUpload }) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (event) => {
    try {
      setUploading(true)
      const file = event.target.files[0]
      if (!file) return

      const fileName = `${Date.now()}-${file.name}`

      const { data, error } = await supabase.storage
        .from('upload') // your Supabase bucket name
        .upload(fileName, file)

      if (error) throw error

      const { data: publicData } = supabase.storage
        .from('upload')
        .getPublicUrl(fileName)

      onUpload(publicData.publicUrl)
    } catch (error) {
      alert('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input type="file" onChange={handleUpload} disabled={uploading} />
    </div>
  )
}
