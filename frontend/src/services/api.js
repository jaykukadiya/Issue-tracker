const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication APIs
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    return this.request('/auth/login', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async refreshToken() {
    return this.request('/auth/refresh', {
      method: 'POST',
    });
  }

  // Issue APIs
  async getIssues(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const queryString = params.toString();
    return this.request(`/issues${queryString ? `?${queryString}` : ''}`);
  }

  async createIssue(issueData, enhanceDescription = true) {
    return this.request(`/issues?enhance_description=${enhanceDescription}`, {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  }

  async getIssue(issueId) {
    return this.request(`/issues/${issueId}`);
  }

  async updateIssue(issueId, updateData) {
    return this.request(`/issues/${issueId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteIssue(issueId) {
    return this.request(`/issues/${issueId}`, {
      method: 'DELETE',
    });
  }

  async getAssignedIssues(userId, page = 1, size = 10) {
    return this.request(`/issues/assigned/${userId}?page=${page}&size=${size}`);
  }

  // Team APIs
  async inviteTeamMember(memberData) {
    return this.request('/teams/invite', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async getTeamMembers() {
    return this.request('/teams/members');
  }

  // AI Enhancement API - Now using backend endpoint
  async enhanceDescription(description) {
    return this.request('/ai/enhance-description', {
      method: 'POST',
      body: JSON.stringify({ raw_description: description }),
    });
  }
}

const apiService = new ApiService();
export default apiService;
