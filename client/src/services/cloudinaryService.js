// src/services/cloudinaryService.js
// Cloudinary service for uploading profile pictures
// This replaces Firebase Storage to stay on the free Spark plan

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validates the image file before upload
 * 
 * @param {File} file - The image file to validate
 * @throws {Error} - If validation fails
 */
const validateImage = (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than 2MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  }
};

/**
 * Uploads an image to Cloudinary
 * 
 * @param {File} imageFile - The image file to upload
 * @param {string} userId - The user's ID (used for organizing uploads)
 * @returns {Promise<string>} - The secure URL of the uploaded image
 * @throws {Error} - If upload fails
 */
export const uploadToCloudinary = async (imageFile, userId) => {
  // Validate file first
  validateImage(imageFile);

  // Check if Cloudinary is configured
  if (!CLOUD_NAME || CLOUD_NAME === 'your_cloud_name') {
    throw new Error('Cloudinary is not configured. Please set REACT_APP_CLOUDINARY_CLOUD_NAME in your .env file');
  }

  if (!UPLOAD_PRESET || UPLOAD_PRESET === 'your_upload_preset') {
    throw new Error('Cloudinary upload preset is not configured. Please set REACT_APP_CLOUDINARY_UPLOAD_PRESET in your .env file');
  }

  // Create form data for upload
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'procomm/profile-pictures'); // Organize in folders
  formData.append('public_id', `user_${userId}`); // Use user ID as filename
  formData.append('overwrite', 'true'); // Replace existing image

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
 * For now, we just overwrite images with the same public_id
 * 
 * @param {string} publicId - The public ID of the image to delete
 */
export const deleteFromCloudinary = async (publicId) => {
  // Deletion requires a signed request with API secret
  // For security, this should be done via a backend endpoint
  // Since we use 'overwrite: true', old images are automatically replaced
  console.log('Note: Image deletion should be handled via backend or Cloudinary console');
};

// Named export object for convenience
const cloudinaryService = {
  uploadToCloudinary,
  deleteFromCloudinary,
  MAX_FILE_SIZE,
  ALLOWED_TYPES
};

export default cloudinaryService;
