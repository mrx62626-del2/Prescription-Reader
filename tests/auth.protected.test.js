/**
 * @file auth.protected.test.js
 * @description Tests for protected routes and requireAuth middleware behavior.
 */

import request from 'supertest'
import mongoose from 'mongoose'
import createApp from '../src/app.js'
import User from '../src/models/user.model.js'
import RefreshToken from '../src/models/refreshToken.model.js'

const app = createApp()

const credentials = {
  fullName: 'Protected Route Tester',
  email: 'protected.test@example.com',
  password: 'StrongPass123!',
}

let accessToken

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI)
  }

  await request(app).post('/api/v1/auth/register').send(credentials)
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: credentials.email,
    password: credentials.password,
  })
  accessToken = loginRes.body.data.accessToken
})

afterAll(async () => {
  await User.deleteMany({})
  await RefreshToken.deleteMany({})
  await mongoose.connection.close()
})

describe('GET /api/v1/auth/me', () => {
  it('returns the current user when a valid access token is provided', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe(credentials.email)
  })

  it('rejects requests with no Authorization header', async () => {
    const res = await request(app).get('/api/v1/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('rejects requests with an invalid/malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('rejects requests with an expired token', async () => {
    // A token signed with a real secret but an already-past expiry
    // is simulated by signing with -1s expiry directly via jsonwebtoken
    const jwt = (await import('jsonwebtoken')).default
    const config = (await import('../src/config/app.config.js')).default

    const expiredToken = jwt.sign({ sub: 'someid' }, config.jwt.accessSecret, { expiresIn: '-10s' })

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)

    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/expired/i)
  })
})