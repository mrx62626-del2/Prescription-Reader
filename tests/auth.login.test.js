/**
 * @file auth.login.test.js
 * @description Login endpoint tests.
 */

import request from 'supertest'
import mongoose from 'mongoose'
import createApp from '../src/app.js'
import User from '../src/models/user.model.js'

const app = createApp()

const credentials = {
  fullName: 'Login Tester',
  email: 'login.test@example.com',
  password: 'StrongPass123!',
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI)
  }
  await request(app).post('/api/v1/auth/register').send(credentials)
})

afterAll(async () => {
  await User.deleteMany({})
  await mongoose.connection.close()
})

describe('POST /api/v1/auth/login', () => {
  it('logs in successfully with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: credentials.email,
      password: credentials.password,
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.refreshToken).toBeDefined()
    expect(res.body.data.user.email).toBe(credentials.email)
  })

  it('rejects an incorrect password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: credentials.email,
      password: 'WrongPassword123!',
    })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/invalid email or password/i)
  })

  it('rejects login for an unknown user', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nobody@example.com',
      password: 'StrongPass123!',
    })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})