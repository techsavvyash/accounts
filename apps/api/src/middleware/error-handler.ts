export const errorHandler = ({ code, error, set }: any) => {
  console.error('Error:', error)

  if (code === 'VALIDATION') {
    set.status = 400
    return {
      error: 'Validation Error',
      message: error.message,
      details: error.all || []
    }
  }

  if (code === 'NOT_FOUND') {
    set.status = 404
    return {
      error: 'Not Found',
      message: error.message || 'Resource not found'
    }
  }

  if (error?.code === 'P2002') {
    set.status = 409
    return {
      error: 'Conflict',
      message: 'A record with this value already exists'
    }
  }

  if (error?.code === 'P2025') {
    set.status = 404
    return {
      error: 'Not Found',
      message: 'Record not found'
    }
  }

  set.status = 500
  return {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error?.message || 'Unknown error'
  }
}