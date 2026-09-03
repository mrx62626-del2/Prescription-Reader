/**
 * @file auth.refresh.test.js
 * @description Tests for refresh token rotation and logout invalidation.
 */

import request from 'supertest'
import mongoose from 'mongoose'
import createApp from '../src/app.js'
import User from '../src/models/user.model.js'
import RefreshToken from '../src/models/refreshToken.model.js'

const app = createApp()

const credentials = {
  fullName: 'Refresh Tester',
  email: 'refresh.test@example.com',
  password: 'StrongPass123!',
}

let refreshToken
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
  refreshToken = loginRes.body.data.refreshToken
  accessToken = loginRes.body.data.accessToken
})

afterAll(async () => {
  await User.deleteMany({})
  await RefreshToken.deleteMany({})
  await mongoose.connection.close()
})

describe('POST /api/v1/auth/refresh', () => {
  it('issues a new token pair given a valid refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken })

    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.refreshToken).toBeDefined()
    expect(res.body.data.refreshToken).not.toBe(refreshToken) // rotated

    refreshToken = res.body.data.refreshToken // update for subsequent tests
  })

  it('rejects reuse of an already-rotated (old) refresh token', async () => {
    // refreshToken from the previous test was already rotated out;
    // attempting to reuse the ORIGINAL token captured at login should fail
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'a.completely.invalid.token' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /api/v1/auth/logout', () => {
  it('invalidates the refresh token so it can no longer be used', async () => {
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })

    expect(logoutRes.status).toBe(200)
    expect(logoutRes.body.success).toBe(true)

    // Attempting to refresh with the now-revoked token must fail
    const refreshAttempt = await request(app).post('/api/v1/auth/refresh').send({ refreshToken })

    expect(refreshAttempt.status).toBe(400)
    expect(refreshAttempt.body.success).toBe(false)
  })

  it('requires authentication to access the logout endpoint', async () => {
    const res = await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'anything' })

    expect(res.status).toBe(401)
  })
})