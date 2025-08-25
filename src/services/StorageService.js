import { supabase } from '../config/supabase';

class StorageService {
  constructor() {
    this.bucketName = 'apk.kr';
  }

  /**
   * Upload file to Supabase Storage
   * @param {string} filePath - Local file path
   * @param {string} fileName - File name for storage
   * @param {string} folder - Folder in bucket (optional)
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFile(filePath, fileName, folder = 'payment-proofs') {
    try {
      console.log('StorageService: Uploading file:', { filePath, fileName, folder });

      // Generate unique filename with timestamp
      const timestamp = new Date().getTime();
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${timestamp}_${fileName}`;
      const storagePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

      // Read file as blob/buffer for React Native
      const response = await fetch(filePath);
      const blob = await response.blob();

      console.log('StorageService: File blob created, size:', blob.size);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(storagePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: blob.type || 'image/jpeg'
        });

      if (error) {
        console.error('StorageService: Upload error:', error);
        throw error;
      }

      console.log('StorageService: Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(storagePath);

      return {
        success: true,
        data: {
          path: data.path,
          fullPath: data.fullPath,
          publicUrl: urlData.publicUrl,
          fileName: uniqueFileName,
          originalName: fileName
        },
        message: 'File berhasil diupload'
      };

    } catch (error) {
      console.error('StorageService: Upload failed:', error);
      return {
        success: false,
        message: `Gagal upload file: ${error.message || 'Unknown error'}`,
        error
      };
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param {string} filePath - File path in storage
   * @returns {Promise<Object>} - Delete result
   */
  async deleteFile(filePath) {
    try {
      console.log('StorageService: Deleting file:', filePath);

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('StorageService: Delete error:', error);
        throw error;
      }

      console.log('StorageService: Delete successful:', data);

      return {
        success: true,
        message: 'File berhasil dihapus'
      };

    } catch (error) {
      console.error('StorageService: Delete failed:', error);
      return {
        success: false,
        message: `Gagal hapus file: ${error.message || 'Unknown error'}`,
        error
      };
    }
  }

  /**
   * Get public URL for file
   * @param {string} filePath - File path in storage
   * @returns {string} - Public URL
   */
  getPublicUrl(filePath) {
    try {
      const { data } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('StorageService: Error getting public URL:', error);
      return null;
    }
  }

  /**
   * Upload payment proof specifically
   * @param {Object|string} fileData - File data object or file path
   * @param {string} checkinId - Checkin ID for organizing files
   * @returns {Promise<Object>} - Upload result
   */
  async uploadPaymentProof(fileData, checkinId) {
    try {
      // Handle both object and string input
      let filePath, fileName;

      if (typeof fileData === 'string') {
        // Legacy: filePath as string
        filePath = fileData;
        fileName = `payment_proof_${checkinId}.jpg`;
      } else if (fileData && fileData.uri) {
        // New: file data object from ImagePickerService
        filePath = fileData.uri;
        fileName = fileData.name || `payment_proof_${checkinId}.jpg`;
      } else {
        throw new Error('Invalid file data provided');
      }

      const folder = 'payment-proofs';

      return await this.uploadFile(filePath, fileName, folder);
    } catch (error) {
      console.error('StorageService: Payment proof upload failed:', error);
      return {
        success: false,
        message: `Gagal upload bukti pembayaran: ${error.message || 'Unknown error'}`,
        error
      };
    }
  }

  /**
   * Check if bucket exists and is accessible
   * @returns {Promise<boolean>} - Bucket accessibility
   */
  async checkBucketAccess() {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list('', { limit: 1 });

      if (error) {
        console.error('StorageService: Bucket access error:', error);
        return false;
      }

      console.log('StorageService: Bucket accessible');
      return true;
    } catch (error) {
      console.error('StorageService: Bucket check failed:', error);
      return false;
    }
  }
}

export default new StorageService();
