/**
 * @file upload.schema.js
 * @description Zod validation schemas for the upload endpoint.
 *
 * Provides a second layer of file validation after Multer's
 * MIME-type filter. Validates the file extension from the
 * original filename to catch edge cases where MIME type
 * and extension disagree.
 */

import { z } from 'zod'
import path from 'path'
import config from '../config/app.config.js'

/**
 * Schema to validate the uploaded file object (req.file from Multer).
 *
 * Multer populates req.file with:
 *   fieldname, originalname, encoding, mimetype,
 *   destination, filename, path, size
 */
export const uploadedFileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string().min(1, 'Filename cannot be empty'),
  encoding: z.string(),
  mimetype: z.enum(
    config.upload.allowedMimeTypes,
    { errorMap: () => ({ message: `MIME type must be one of: ${config.upload.allowedMimeTypes.join(', ')}` }) },
  ),
  size: z
    .number()
    .positive('File size must be positive')
    .max(
      config.upload.maxFileSizeBytes,
      `File size must not exceed ${config.upload.maxFileSizeBytes / 1024 / 1024}MB`,
    ),
  filename: z.string().min(1, 'Stored filename cannot be empty'),
  path: z.string().min(1, 'File path cannot be empty'),
  destination: z.string(),
}).refine(
  (file) => {
    const ext = path.extname(file.originalname).toLowerCase()
    return config.upload.allowedExtensions.includes(ext)
  },
  {
    message: `File extension must be one of: ${config.upload.allowedExtensions.join(', ')}`,
    path: ['originalname'],
  },
)