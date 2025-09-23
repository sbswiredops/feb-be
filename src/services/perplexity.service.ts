import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    const proxyUrl = this.configService.get<string>('HTTP_PROXY');
    const apiBase = this.configService.get<string>('PERPLEXITY_API_BASE');
    const apiKey = this.configService.get<string>('PERPLEXITY_API_KEY');

    // Create axios instance with US proxy configuration
    this.axiosInstance = axios.create({
      baseURL: apiBase,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Configure proxy if provided
    if (proxyUrl) {
      const httpsAgent = new HttpsProxyAgent(proxyUrl);
      this.axiosInstance.defaults.httpsAgent = httpsAgent;
      this.axiosInstance.defaults.proxy = false; // Disable axios built-in proxy
      this.logger.log(`Configured US proxy: ${proxyUrl}`);
    } else {
      this.logger.warn('No HTTP_PROXY configured - requests will not be proxied');
    }
  }

  async sendLoginEmail(email: string): Promise<boolean> {
    try {
      this.logger.log(`Sending Perplexity login email to: ${email}`);
      
      // Note: This is a placeholder for the actual Perplexity API endpoint
      // Replace with the actual endpoint when available
      const response = await this.axiosInstance.post('/auth/send-login-email', {
        email,
        redirect_url: this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
      });

      this.logger.log(`Perplexity API response status: ${response.status}`);
      return response.status === 200 || response.status === 201;
    } catch (error) {
      this.logger.error('Failed to send Perplexity login email:', error.message);
      if (error.response) {
        this.logger.error('Response data:', error.response.data);
        this.logger.error('Response status:', error.response.status);
      }
      return false;
    }
  }

  /**
   * Test the proxy connection and API availability
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test with a simple API call
      const response = await this.axiosInstance.get('/health', {
        timeout: 10000,
      });
      
      return {
        success: true,
        message: `Connection successful. Status: ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }
}