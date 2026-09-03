/**
 * @file ApiResponse.js
 * @description Consistent API response factory.
 *
 * Enforces a single response envelope across all endpoints:
 *   Success: { success, message, data, meta? }
 *   Error:   { success, message, errors }
 *
 * Usage (in a controller):
 *   return ApiResponse.success(res, 200, 'Upload successful', { fileId })
 *   return ApiResponse.error(res, 400, 'Invalid file type')
 */

class ApiResponse {
  /**
   * Send a successful JSON response.
   *
   * @param {import('express').Response} res
   * @param {number} statusCode
   * @param {string} message
   * @param {*}      data         - Any serializable payload
   * @param {object} meta         - Optional pagination / extra metadata
   */
  static success(res, statusCode = 200, message = 'Success', data = null, meta = null) {
    const body = {
      success: true,
      message,
      data,
    }

    if (meta) body.meta = meta

    return res.status(statusCode).json(body)
  }

  /**
   * Send an error JSON response.
   *
   * @param {import('express').Response} res
   * @param {number}   statusCode
   * @param {string}   message
   * @param {Array}    errors     - Field-level or structured error details
   */
  static error(res, statusCode = 500, message = 'An error occurred', errors = []) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    })
  }

  /**
   * Convenience: 201 Created
   */
  static created(res, message = 'Resource created', data = null) {
    return ApiResponse.success(res, 201, message, data)
  }

  /**
   * Convenience: 204 No Content
   */
  static noContent(res) {
    return res.status(204).send()
  }
}

export default ApiResponse