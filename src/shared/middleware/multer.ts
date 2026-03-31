import multer from "multer";

// Tell Multer to keep the file in RAM as a Buffer, not on the hard drive
const storage = multer.memoryStorage();

// -----------------------------------------------------------------------------
// 1. Audio Upload Middleware (For the AI Proxy)
// -----------------------------------------------------------------------------
const uploadAudio = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for audio snippets
  },
  fileFilter(req, file, cb) {
    const allowedMimeTypes = [
      "audio/mpeg", // .mp3
      "audio/mp4", // .m4a
      "audio/x-m4a", // Apple specific m4a
      "audio/wav", // .wav
      "audio/aac", // .aac
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          `Invalid audio type: ${file.mimetype}. Only MP3, M4A, WAV, and AAC are allowed.`,
        ),
      );
    }
    cb(null, true);
  },
});

// -----------------------------------------------------------------------------
// 2. Image Upload Middleware (For User Avatars & Reciter Photos)
// -----------------------------------------------------------------------------
const uploadImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
  },
  fileFilter(req, file, cb) {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          `Invalid image type: ${file.mimetype}. Only JPG, PNG, and WEBP images are allowed.`,
        ),
      );
    }
    cb(null, true);
  },
});

export { uploadAudio, uploadImage };
