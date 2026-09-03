/**
 * @file auth.register.test.js
 * @description Registration endpoint tests.
 *
 * Uses an in-memory-style approach against a real test MongoDB instance.
 * Set MONGODB_URI in your test environment to a dedicated test database
 * (e.g. mongodb://localhost:27017/mediread_test) — never run tests
 * against production data.
 */

import request from 'supertest'
import mongoose from 'mongoose'
import createApp from '../src/app.js'
import User from '../src/models/user.model.js'

const app = createApp()

const validUser = {
  fullName: 'Jane Doe',
  email: 'jane.doe@example.com',
  password: 'StrongPass123!',
  preferredLanguage: 'en',
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI)
  }
})

afterEach(async () => {
  await User.deleteMany({})
})

afterAll(async () => {
  await mongoose.connection.close()
})

describe('POST /api/v1/auth/register', () => {
  it('registers a new user successfully', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser)

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user).toMatchObject({
      fullName: validUser.fullName,
      email: validUser.email,
    })
    expect(res.body.data.user.passwordHash).toBeUndefined()
  })

  it('rejects duplicate email registration', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser)
    const res = await request(app).post('/api/v1/auth/register').send(validUser)

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/already exists/i)
  })

  it('rejects an invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, email: 'not-an-email' })

    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
  })

  it('rejects a weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, email: 'weak.pass@example.com', password: 'weak' })

    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
  })
})