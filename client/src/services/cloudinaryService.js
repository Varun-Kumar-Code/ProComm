// src/services/cloudinaryService.js
// Cloudinary service for uploading profile pictures
// This replaces Firebase Storage to stay on the free Spark plan

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Target size for compression: 2MB
const TARGET_SIZE = 2 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Compresses an image to be under the target size (2MB)
 * Uses canvas to resize and reduce quality
 * 
 * @param {File} file - The image file to compress
 * @param {number} maxSizeMB - Maximum size in MB (default 2)
 * @returns {Promise<Blob>} - The compressed image blob
 */
const compressImage = async (file, maxSizeMB = 2) => {
  const maxSize = maxSizeMB * 1024 * 1024;
  
  // If file is already under the limit, return it as-is
  if (file.size <= maxSize) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 1200px on longest side)
        let { width, height } = img;
        const maxDimension = 1200;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Start with quality 0.9 and reduce until under target size
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (blob.size <= maxSize || quality <= 0.1) {
                // Add filename to blob
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                console.log(`✅ Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                resolve(compressedFile);
              } else {
                // Reduce quality and try again
                quality -= 0.1;
                tryCompress();
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        tryCompress();
      };
      
      img.onerror = () => reject(new Error('Failed to load image for compression'));
    };
    
    reader.onerror = () => reject(new Error('Failed to read image file'));
  });
};

/**
 * Validates the image file type
 * 
 * @param {File} file - The image file to validate
 * @throws {Error} - If validation fails
 */
const validateImageType = (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
  }
};

/**
 * Uploads an image to Cloudinary with automatic compression
 * Images larger than 2MB are automatically compressed
 * 
 * @param {File} imageFile - The image file to upload
 * @param {string} userId - The user's ID (used for organizing uploads)
 * @returns {Promise<string>} - The secure URL of the uploaded image
 * @throws {Error} - If upload fails
 */
export const uploadToCloudinary = async (imageFile, userId) => {
  // Validate file type first
  validateImageType(imageFile);

  // Check if Cloudinary is configured
  if (!CLOUD_NAME || CLOUD_NAME === 'your_cloud_name') {
    throw new Error('Cloudinary is not configured. Please set REACT_APP_CLOUDINARY_CLOUD_NAME in your .env file');
  }

  if (!UPLOAD_PRESET || UPLOAD_PRESET === 'your_upload_preset') {
    throw new Error('Cloudinary upload preset is not configured. Please set REACT_APP_CLOUDINARY_UPLOAD_PRESET in your .env file');
  }

  // Compress image if larger than 2MB
  let fileToUpload = imageFile;
  if (imageFile.size > TARGET_SIZE) {
    console.log(`📦 Image is ${(imageFile.size / 1024 / 1024).toFixed(2)}MB, compressing...`);
    fileToUpload = await compressImage(imageFile, 2);
  }

  // Create form data for upload
  // Note: 'overwrite' is NOT allowed for unsigned uploads
  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'procomm/profile-pictures');
  formData.append('public_id', `user_${userId}_${Date.now()}`); // Unique ID with timestamp

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload image');
    }

    const data = await response.json();
    
    console.log('✅ Image uploaded to Cloudinary successfully');
    // Return the secure HTTPS URL
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Deletes an image from Cloudinary
 * Note: This requires signed requests, which need backend support
 * For now, we just overwrite images with unique public_id
 * 
 * @param {string} publicId - The public ID of the image to delete
 */
export const deleteFromCloudinary = async (publicId) => {
  // Deletion requires a signed request with API secret
  // For security, this should be done via a backend endpoint
  console.log('Note: Image deletion should be handled via backend or Cloudinary console');
};

// Named export object for convenience
const cloudinaryService = {
  uploadToCloudinary,
  deleteFromCloudinary,
  compressImage,
  MAX_FILE_SIZE,
  ALLOWED_TYPES
};

export default cloudinaryService;
