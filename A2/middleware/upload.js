const multer = require('multer');
const path = require('path');

// Configure multer for avatar uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check file type (images only)
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

// Middleware for single avatar upload
const uploadAvatar = upload.single('avatar');

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum 5MB allowed.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Only one file allowed at a time.' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: 'Only image files are allowed' });
  }
  
  next(err);
};

module.exports = {
  uploadAvatar,
  handleUploadError
};

