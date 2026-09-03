/**
 * @file user.model.js
 * @description Mongoose schema for registered users.
 *
 * Security notes:
 *   - Only `passwordHash` is ever stored — raw passwords never touch the DB layer.
 *   - Email is normalized to lowercase and trimmed before the unique index applies,
 *     preventing "John@x.com" and "john@x.com" from being treated as different users.
 *   - `passwordHash` is excluded from default `toJSON`/`toObject` output so it can
 *     never accidentally leak through an API response, even if a future endpoint
 *     forgets to manually strip it.
 */

import mongoose from 'mongoose'

const { Schema } = mongoose

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name must not exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true, // normalizes at the schema level on every save
      unique: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // excluded from queries by default — must opt in with .select('+passwordHash')
    },

    preferredLanguage: {
      type: String,
      trim: true,
      default: 'en',
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash
        delete ret.__v
        return ret
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        delete ret.passwordHash
        delete ret.__v
        return ret
      },
    },
  },
)

const User = mongoose.model('User', userSchema)

export default User