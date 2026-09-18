require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

let supabase = null;
let isConfigured = false;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id') && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    isConfigured = true;
    console.log('⚡ Supabase Client initialized successfully.');
  } catch (err) {
    console.error('⚠️ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ️ Supabase credentials not found or placeholder in .env. Running in local fallback mode.');
}

/**
 * Upload file buffer to Supabase Storage and return public URL
 */
async function uploadToStorage(bucketName, fileBuffer, fileName, mimeType) {
  if (!isConfigured || !supabase) return null;

  try {
    const cleanFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(cleanFileName, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.warn(`Supabase Storage upload warning (${bucketName}):`, error.message);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(cleanFileName);

    return publicUrlData ? publicUrlData.publicUrl : null;
  } catch (err) {
    console.error(`Storage upload error (${bucketName}):`, err.message);
    return null;
  }
}

/**
 * Delete file from Supabase Storage by public URL
 */
async function deleteFromStorage(bucketName, fileUrl) {
  if (!isConfigured || !supabase || !fileUrl) return;

  try {
    const parts = fileUrl.split('/');
    const fileName = parts[parts.length - 1];
    if (fileName) {
      await supabase.storage.from(bucketName).remove([fileName]);
    }
  } catch (err) {
    console.warn(`Storage delete warning (${bucketName}):`, err.message);
  }
}

module.exports = {
  supabase,
  isConfigured: () => isConfigured,
  uploadToStorage,
  deleteFromStorage
};
