export interface HealthResponse {
  ok: true;
}

/** All API failures return this envelope with an appropriate HTTP status. */
export interface ApiError {
  error: { code: string; message: string };
}
