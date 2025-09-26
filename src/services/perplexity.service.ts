/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, ElementHandle } from 'puppeteer';
import * as process from 'process';

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);

  async completeOtpVerification(
    email: string,
    otp: string,
  ): Promise<{ success: boolean; message: string }> {
    let browser: Browser | null = null;
    try {
      puppeteer.use(StealthPlugin());
      browser = await puppeteer.launch({ headless: true }); // changed to headless: true
      const page = await browser.newPage();

      page.on('console', (msg) => {
        this.logger.log(
          `[Puppeteer][Console][OTP] ${msg.type()}: ${msg.text()}`,
        );
      });

      await page.setUserAgent(
        'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
      );
      await page.setViewport({ width: 400, height: 800, isMobile: true });

      await page.goto(
        `https://www.perplexity.ai/auth/verify-request?email=${encodeURIComponent(email)}`,
        { waitUntil: 'networkidle2' },
      );
      await new Promise((res) => setTimeout(res, 1000 + Math.random() * 1000));

      const otpSelector = 'input[placeholder="Enter Code"]';
      await page.waitForSelector(otpSelector, { timeout: 7000 });
      const otpInput = await page.$(otpSelector);
      if (!otpInput) {
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

      // Removed screenshot

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
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
          new Promise((res) => setTimeout(res, 3000)),
        ]);
      } catch {
        await new Promise((res) =>
          setTimeout(res, 2000 + Math.random() * 1000),
        );
      }

      await new Promise((res) => setTimeout(res, 15000));

      const url = page.url();
      const content = await page.content();
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
      this.logger.error('OTP verification failed: ' + (err as Error).message);
      return { success: false, message: 'OTP verification failed.' };
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }

  async activateCouponOnPerplexity(
    code: string,
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      puppeteer.use(StealthPlugin());

      const proxyUrl = process.env.UK_PROXY_URL;
      const proxyArgs = proxyUrl ? [`--proxy-server=${proxyUrl}`] : [];

      const browser = await puppeteer.launch({
        headless: true,
        args: proxyArgs,
      });
      const page = await browser.newPage();

      if (process.env.UK_PROXY_USER && process.env.UK_PROXY_PASS) {
        await page.authenticate({
          username: process.env.UK_PROXY_USER,
          password: process.env.UK_PROXY_PASS,
        });
      }

      await page.setUserAgent(
        'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
      );
      await page.setViewport({ width: 400, height: 800, isMobile: true });

      await page.goto(
        `https://www.perplexity.ai/join/p/priority?discount_code=${encodeURIComponent(code)}`,
        { waitUntil: 'networkidle2', timeout: 60000 },
      );
      await new Promise((res) => setTimeout(res, 5000 + Math.random() * 2000));

      // Removed screenshot

      const emailSelector = 'input[placeholder="Enter your email"]';
      let emailInput: import('puppeteer').ElementHandle<Element> | null = null;
      try {
        await page.waitForSelector(emailSelector, {
          timeout: 20000,
          visible: true,
        });
        emailInput = await page.$(emailSelector);
      } catch {
        const content = await page.content();
        if (
          /success|activated|already|eligible|free|subscription|congratulations|your coupon is active|thank you|priority|pro plan/i.test(
            content,
          )
        ) {
          // Removed screenshot
          await browser.close();
          return {
            success: true,
            message: 'Promo code already activated or success shown.',
          };
        } else {
          await browser.close();
          return {
            success: false,
            message: 'Email input not found and no success message.',
          };
        }
      }

      await page.evaluate((selector) => {
        const el = document.querySelector(selector) as HTMLInputElement;
        if (el) el.value = '';
      }, emailSelector);

      if (emailInput) {
        await emailInput.focus();
        for (const char of email) {
          await page.keyboard.type(char, { delay: 80 + Math.random() * 70 });
        }
      } else {
        await browser.close();
        return { success: false, message: 'Email input not found.' };
      }
      await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }, emailSelector);

      await page.waitForFunction(
        () => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some(
            (btn) =>
              btn.textContent &&
              btn.textContent.trim().toLowerCase() === 'continue with email' &&
              !btn.hasAttribute('disabled'),
          );
        },
        { timeout: 10000 },
      );

      const continueEmailBtnHandle = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return (
          btns.find(
            (btn) =>
              btn.textContent &&
              btn.textContent.trim().toLowerCase() === 'continue with email' &&
              !btn.hasAttribute('disabled'),
          ) || null
        );
      });
      const continueEmailBtn =
        continueEmailBtnHandle.asElement() as unknown as import('puppeteer').ElementHandle<Element>;
      if (!continueEmailBtn) {
        await browser.close();
        return {
          success: false,
          message: 'Continue with email button not found or still disabled.',
        };
      }
      await continueEmailBtn.click({ delay: 50 });
      await new Promise((res) => setTimeout(res, 2000 + Math.random() * 1000));

      // Removed screenshot

      const url = page.url();
      const content = await page.content();
      await browser.close();
      if (
        /verify-request|otp|check your email|code sent|email sent|enter code|sign in code|priority|pro plan|success|activated/i.test(
          url + content,
        )
      ) {
        return {
          success: true,
          message:
            'Promo code accepted, email submitted. Please check your email for OTP.',
        };
      }
      return {
        success: false,
        message: 'Promo code or email step may have failed.',
      };
    } catch (err) {
      this.logger.error('Coupon activation failed: ' + (err as Error).message);
      return { success: false, message: 'Coupon activation failed.' };
    }
  }
}
