/**
 * @file refreshToken.model.js
 * @description Mongoose schema for issued refresh tokens.
 *
 * Purpose:
 *   - Enables logout: deleting the document invalidates the token immediately,
 *     even though the JWT itself would still cryptographically verify until expiry.
 *   - Enables rotation: each refresh issues a new token and deletes the old document,
 *     so a stolen-and-reused old refresh token fails because it no longer exists here.
 *   - TTL index automatically removes expired documents — no cleanup job required.
 */

import mongoose from 'mongoose'

const { Schema } = mongoose

const refreshTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

// TTL index: MongoDB automatically deletes documents once `expiresAt` is in the past.
// expireAfterSeconds: 0 means "expire exactly at the value stored in expiresAt".
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema)

export default RefreshToken