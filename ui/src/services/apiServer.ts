/**
 * API Server Client
 *
 * Provides a clean interface for calling API endpoints.
 * Usage:
 *   import api from './services/apiServer';
 *   const config = await api.getConfig();
 */

let API_BASE_URL: string;

if (import.meta.env.VITE_API_SERVER_LOCATION === "local") {
  API_BASE_URL = import.meta.env.VITE_API_SERVER_LOCAL;
} else {
  API_BASE_URL = import.meta.env.VITE_API_SERVER_REMOTE;
}

if (!API_BASE_URL) {
  throw new Error(
    "Error: VITE_API_SERVER_LOCATION, VITE_API_SERVER_LOCAL and VITE_API_SERVER_REMOTE missing from .env file ",
  );
}

interface ConfigResponse {
  success: boolean;
  cognitoDomain: string;
  cognitoClientId: string;
  error?: string;
}

interface UserResponse {
  success: boolean;
  user: {
    sub: string;
    email: string;
    nickname: string | null;
  };
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  /**
   * Set the access token for authenticated requests
   */
  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Make an HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add authorization header if we have an access token
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }

  /**
   * Get configuration from the API server
   * Returns Cognito domain and client ID
   */
  async getConfig(): Promise<{
    cognitoDomain: string;
    cognitoClientId: string;
  }> {
    const response = await this.request<ConfigResponse>("/v1/config");

    if (!response.success) {
      throw new Error(response.error || "Failed to get config from API server");
    }

    return {
      cognitoDomain: response.cognitoDomain,
      cognitoClientId: response.cognitoClientId,
    };
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request<{ status: string; service: string }>("/health");
  }

  /**
   * Get user data by sub
   */
  async getUser(sub: string): Promise<{
    sub: string;
    email: string;
    nickname: string | null;
  }> {
    const response = await this.request<UserResponse>(`/v1/users/${sub}`);

    if (!response.success) {
      throw new Error(response.error || "Failed to get user data");
    }

    return response.user;
  }

  /**
   * Update user nickname
   */
  async updateNickname(
    sub: string,
    nickname: string | null,
  ): Promise<{
    sub: string;
    email: string;
    nickname: string | null;
  }> {
    const response = await this.request<UserResponse>(
      `/v1/users/${sub}/nickname`,
      {
        method: "PUT",
        body: JSON.stringify({ nickname }),
      },
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to update nickname");
    }

    return response.user;
  }

  async getPresignedUrl(
    imageName: string,
    imageDescription?: string | null,
  ): Promise<{
    success: boolean;
    presignedUrl?: string;
    imageId?: number;
    uuidFilename?: string;
    message?: string;
    error?: string;
  }> {
    return this.request(`/v1/images/presigned-url`, {
      method: "POST",
      body: JSON.stringify({
        imageName,
        imageDescription: imageDescription ?? null,
      }),
    });
  }

  async uploadToPresignedUrl(
    presignedUrl: string,
    file: File,
  ): Promise<void> {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
  }
}

// Export a singleton instance
const api = new ApiClient(API_BASE_URL);
export default api;
