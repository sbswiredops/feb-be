/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, ElementHandle, Page } from 'puppeteer';
import * as process from 'process';
import { v4 as uuidv4 } from 'uuid';
import { HttpsProxyAgent } from 'https-proxy-agent';

type SessionContext = {
  browser: Browser;
  page: Page;
  createdAt: number;
  otpResolve?: (otp: string) => void;
};

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);

  private sessions = new Map<string, SessionContext>();


  async activateCouponOnPerplexity(
    code: string,
    email: string,
  ): Promise<{ success: boolean; message: string; sessionId?: string }> {
    try {
      puppeteer.use(StealthPlugin());

      // Get proxy configuration from environment variables
      const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.UK_PROXY_URL;
      const proxyUser = process.env.PROXY_USER || process.env.UK_PROXY_USER;
      const proxyPass = process.env.PROXY_PASS || process.env.UK_PROXY_PASS;

      let launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--ignore-certificate-errors'
      ];

      // Add proxy configuration if available
      if (proxyUrl) {
        launchArgs.push(`--proxy-server=${proxyUrl}`);
        this.logger.log(`Using proxy: ${proxyUrl}`);
      }

      const browser = await puppeteer.launch({
        headless: true, // Changed to true for better compatibility
        args: launchArgs,
        ignoreDefaultArgs: ['--disable-extensions'],
      });
      
      const page = await browser.newPage();

      // Set proxy authentication if credentials are provided
      if (proxyUser && proxyPass) {
        await page.authenticate({
          username: proxyUser,
          password: proxyPass,
        });
        this.logger.log('Proxy authentication configured');
      }

      // Set additional headers and user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
      );
      await page.setViewport({ width: 400, height: 800, isMobile: true });
      
      // Set extra HTTP headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      this.logger.log('Navigating to Perplexity...');
      await page.goto(
        `https://www.perplexity.ai/join/p/priority?discount_code`,
        { 
          waitUntil: 'networkidle2', 
          timeout: 90000 // Increased timeout for proxy connections
        },
      );
      await new Promise((res) => setTimeout(res, 5000 + Math.random() * 2000));

      // 1. Set coupon code and trigger Continue
      const couponSelector = 'input[placeholder="Promo Code"]';
      await page.waitForSelector(couponSelector, { timeout: 10000, visible: true });
      const couponInput = await page.$(couponSelector);
      if (couponInput) {
        await couponInput.focus();
        for (const char of code) {
          await page.keyboard.type(char, { delay: 80 + Math.random() * 70 });
        }
        await page.evaluate((selector) => {
          const el = document.querySelector(selector) as HTMLInputElement;
          if (el) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          }
        }, couponSelector);

        // Wait for the Continue button to be enabled
        const continueBtnSelector = 'button[type="submit"]';
        await page.waitForFunction(
          (selector) => {
            const btn = document.querySelector(selector) as HTMLButtonElement;
            return btn && !btn.disabled;
          },
          { timeout: 10000 },
          continueBtnSelector,
        );
        // Click the Continue button after promo code
        const continueBtn = await page.$(continueBtnSelector);
        if (continueBtn) {
          await continueBtn.click({ delay: 50 });
          await new Promise((res) => setTimeout(res, 1500 + Math.random() * 500));
        }
      }

      // 2. Set email and trigger "Continue with email" button
      const emailSelector = 'input[placeholder="Enter your email"]';
      await page.waitForSelector(emailSelector, { timeout: 20000, visible: true });
      const emailInput = await page.$(emailSelector);
      if (emailInput) {
        await emailInput.focus();
        for (const char of email) {
          await page.keyboard.type(char, { delay: 80 + Math.random() * 70 });
        }
        await page.evaluate((selector) => {
          const el = document.querySelector(selector) as HTMLInputElement;
          if (el) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          }
        }, emailSelector);

        // Wait for the "Continue with email" button to be enabled
        await page.waitForFunction(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some(
            (btn) =>
              btn.textContent?.trim().toLowerCase() === 'continue with email' &&
              !btn.hasAttribute('disabled')
          );
        }, { timeout: 100000 });

        // Click the "Continue with email" button
        const continueEmailBtn = await page.evaluateHandle(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return (
            btns.find(
              (btn) =>
                btn.textContent?.trim().toLowerCase() === 'continue with email' &&
                !btn.hasAttribute('disabled')
            ) || null
          );
        });
        if (continueEmailBtn && continueEmailBtn.asElement()) {
          await (continueEmailBtn.asElement() as import('puppeteer').ElementHandle<Element>).click({ delay: 50 });
          await new Promise((res) => setTimeout(res, 2000 + Math.random() * 1000));
        } else {
          await browser.close();
          return { success: false, message: '"Continue with email" button not found or not enabled.' };
        }
      }

      // OTP page-এ redirect হয়েছে কিনা চেক করুন
      const url = page.url();
      const content = await page.content();
      if (
        /verify-request|otp|check your email|code sent|email sent|enter code|sign in code|priority|pro plan|success|activated/i.test(
          url + content,
        )
      ) {
        const sessionId = uuidv4();
        this.sessions.set(sessionId, {
          browser,
          page,
          createdAt: Date.now(),
        });
        return {
          success: true,
          message: 'Email submitted, waiting for OTP.',
          sessionId,
        };
      }
      await browser.close();
      return {
        success: false,
        message: 'Promo code or email step may have failed.',
      };
    } catch (err) {
      this.logger.error('Coupon activation failed: ' + (err as Error).message);
      return { success: false, message: 'Coupon activation failed.' };
    }
  }

  // FE থেকে OTP এলে এই ফাংশন call করবে
  async submitOtp(sessionId: string, otp: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found or expired.' };
    }
    const { page, browser } = session;
    try {
      const otpSelector = 'input[placeholder="Enter Code"]';
      await page.waitForSelector(otpSelector, { timeout: 7000 });
      const otpInput = await page.$(otpSelector);
      if (!otpInput) {
        await browser.close();
        this.sessions.delete(sessionId);
        return { success: false, message: 'OTP input not found.' };
      }
      await otpInput.focus();
      for (const char of otp) {
        await page.keyboard.type(char, { delay: 80 + Math.random() * 70 });
      }
      await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }, otpSelector);

      await new Promise((res) => setTimeout(res, 500 + Math.random() * 500));

      // Continue button click
      let continueBtn: ElementHandle<Element> | null = null;
      try {
        await page.waitForFunction(
          () => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.some(
              (btn) =>
                (btn as HTMLElement).innerText &&
                (btn as HTMLElement).innerText.trim().toLowerCase() ===
                  'continue' &&
                !btn.disabled,
            );
          },
          { timeout: 15000 },
        );

        const continueBtnHandle = await page.evaluateHandle(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return (
            btns.find(
              (btn) =>
                (btn as HTMLElement).innerText &&
                (btn as HTMLElement).innerText.trim().toLowerCase() ===
                  'continue' &&
                !btn.disabled,
            ) || null
          );
        });
        continueBtn =
          continueBtnHandle.asElement() as unknown as ElementHandle<Element>;
      } catch {
        this.logger.warn(
          'Continue button not found or waitForFunction timeout, checking for navigation...',
        );
      }

      if (continueBtn) {
        await continueBtn.click({ delay: 50 });
      }

      try {
        await Promise.race([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 7000 }),
          new Promise((res) => setTimeout(res, 2000)),
        ]);
      } catch {
        await new Promise((res) => setTimeout(res, 1000));
      }

      const url = page.url();
      const content = await page.content();
      await browser.close();
      this.sessions.delete(sessionId);

      if (
        /home|account|priority|welcome|success|activated/i.test(url) ||
        /welcome|success|activated|priority|account/i.test(content)
      ) {
        return { success: true, message: 'OTP verified successfully.' };
      }
      const matches = content.match(
        /(invalid|expired|wrong|incorrect|failed|error)[^<\n]{0,80}/i,
      );
      const errorMsg = matches ? matches[0] : null;
      return {
        success: false,
        message: errorMsg || 'OTP verification failed.',
      };
    } catch (err) {
      await browser.close();
      this.sessions.delete(sessionId);
      this.logger.error('OTP verification failed: ' + (err as Error).message);
      return { success: false, message: 'OTP verification failed.' };
    }
  }
}
