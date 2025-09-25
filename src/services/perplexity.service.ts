/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, ElementHandle } from 'puppeteer';

@Injectable()
export class PerplexityService {
    private readonly logger = new Logger(PerplexityService.name);

    async startRedemptionFlow(
        email: string,
    ): Promise<{ success: boolean; message: string }> {
        try {
            puppeteer.use(StealthPlugin());
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            // Set advanced anti-bot headers and language
            await page.setExtraHTTPHeaders({
                'accept-language': 'en-US,en;q=0.9,bn;q=0.8',
                'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120", ";Not A Brand";v="99"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"',
                'upgrade-insecure-requests': '1',
            });
            // Set timezone and geolocation
            try {
                await page.emulateTimezone('Asia/Dhaka');
            } catch { /* ignore */ }
            // Add a small random delay before navigation
            await new Promise(res => setTimeout(res, 500 + Math.random() * 1000));
            // Log browser console
            page.on('console', msg => {
                this.logger.log(`[Puppeteer][Console] ${msg.type()}: ${msg.text()}`);
            });
            // Log network requests/responses and detect if /api/auth/signin/email POST happens
            let signinApiHit = false;
            page.on('request', req => {
                this.logger.log(`[Puppeteer][Request] ${req.method()} ${req.url()}`);
                if (req.method() === 'POST' && req.url().includes('/api/auth/signin/email')) {
                    signinApiHit = true;
                    this.logger.log('[Puppeteer] Detected /api/auth/signin/email POST');
                }
            });
            page.on('response', res => {
                this.logger.log(`[Puppeteer][Response] ${res.status()} ${res.url()}`);
            });
            // Set mobile user-agent

            await page.setUserAgent('Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36');
            await page.setViewport({ width: 400, height: 800, isMobile: true });


            await page.goto('https://www.perplexity.ai/auth/signin', { waitUntil: 'networkidle2' });
            // Add a small random delay after navigation
            await new Promise(res => setTimeout(res, 1000 + Math.random() * 1000));

            // 1. Close notification if present
            try {
                const notifCloseBtn = await page.$('button[aria-label="Close"]');
                if (notifCloseBtn) {
                    await notifCloseBtn.click();
                    await new Promise(res => setTimeout(res, 500));
                }
            } catch { /* ignore */ }

            // 2. Open sidebar (mobile menu)
            try {
                const sidebarBtn = await page.$('button[aria-label="Open sidebar"],button[aria-label="Open navigation menu"]');
                if (sidebarBtn) {
                    await sidebarBtn.click();
                    await new Promise(res => setTimeout(res, 500));
                }
            } catch { /* ignore */ }

            // 3. Click sign in button in sidebar
            try {
                // Wait for sidebar to appear
                await page.waitForSelector('button, a', { timeout: 3000 });
                // Try to find sign in button by text
                const signInBtnHandle = await page.evaluateHandle(() => {
                    const btns = Array.from(document.querySelectorAll('button, a'));
                    return btns.find(b => b.textContent && b.textContent.trim().toLowerCase().includes('sign in')) || null;
                });
                const signInBtn = signInBtnHandle.asElement() as unknown as import('puppeteer').ElementHandle<Element>;
                if (signInBtn) {
                    await signInBtn.click();
                    await new Promise(res => setTimeout(res, 1000));
                }
            } catch { /* ignore */ }

            // 4. Now continue as before: Wait for the email input by placeholder
            const emailSelector = 'input[placeholder="Enter your email"]';
            await page.waitForSelector(emailSelector, { timeout: 7000 });
            // Human-like mouse movement to input
            const emailBox = await page.$(emailSelector);
            if (emailBox) {
                const box = await emailBox.boundingBox();
                if (box) {
                    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
                    await new Promise(res => setTimeout(res, 200 + Math.random() * 200));
                }
            }
            await page.focus(emailSelector);
            // Type email with random delay per char
            for (const char of email) {
                await page.keyboard.type(char, { delay: 80 + Math.random() * 70 });
            }
            await page.evaluate((selector) => {
                const el = document.querySelector(selector);
                if (el) {
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur', { bubbles: true }));
                }
            }, emailSelector);
            await new Promise(res => setTimeout(res, 500 + Math.random() * 500));

            // Find the "Continue with email" button by its text

            // Find the "Continue with email" button by its text and click it
            const buttonHandle = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(btn => btn.textContent && btn.textContent.trim().toLowerCase() === 'continue with email') || null;
            });
            const buttonElement = buttonHandle.asElement();
            if (!buttonElement) {
                throw new Error('Continue with email button not found');
            }
            await page.screenshot({ path: `perplexity_before_submit_${Date.now()}.png`, fullPage: true });
            // Cast to ElementHandle<Element> for correct typing
            const elementButton = buttonElement as unknown as import('puppeteer').ElementHandle<Element>;
            // Ensure button is visible and scroll into view
            await elementButton.evaluate((el) => {
                el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
            });
            // Human-like mouse movement to button
            const btnBox = await elementButton.boundingBox();
            if (btnBox) {
                await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, { steps: 12 });
                await new Promise(res => setTimeout(res, 200 + Math.random() * 200));
            }
            try {
                await elementButton.hover();
                await new Promise(res => setTimeout(res, 200 + Math.random() * 200));
                await elementButton.click({ delay: 50 });
            } catch {
                // fallback: click via DOM
                await elementButton.evaluate((el: HTMLElement) => el.click());
            }
            await new Promise(res => setTimeout(res, 2000 + Math.random() * 1000));

            // If /api/auth/signin/email POST did not happen, try JS submit
            if (!signinApiHit) {
                this.logger.warn('No /api/auth/signin/email POST detected after click. Trying JS submit.');
                await page.evaluate((emailSelector) => {
                    const emailInput = document.querySelector(emailSelector);
                    if (emailInput) {
                        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
                        emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
                        // Try to find the closest form and submit
                        const form = emailInput.closest('form');
                        if (form) {
                            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                            if (typeof form.submit === 'function') form.submit();
                        }
                    }
                }, emailSelector);
                await new Promise(res => setTimeout(res, 2000));
            }
            await page.screenshot({ path: `perplexity_after_submit_${Date.now()}.png`, fullPage: true });
            const currentUrl = 'https://www.perplexity.ai/api/auth/signin/email';
            const pageContent = await page.content();
            await browser.close();
            this.logger.log(`Sign-in code attempted for ${email} via browser. URL: ${currentUrl}`);
            this.logger.log(`Page content after submit: ${pageContent.substring(0, 1000)}`);
            return { success: true, message: 'Sign-in code attempted via browser. Check logs/screenshots.' };
        } catch (err) {
            this.logger.error('Puppeteer flow failed. ' + (err as Error).message);
            return { success: false, message: 'Puppeteer flow failed.' };
        }
    }
    /**
     * Complete OTP verification for a user by automating the Perplexity verification page.
     * Navigates to https://www.perplexity.ai/auth/verify-request?email=... and submits the OTP.
     */
    async completeOtpVerification(email: string, otp: string): Promise<{ success: boolean; message: string }> {
        let browser: Browser | null = null;
        try {
            puppeteer.use(StealthPlugin());
            browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();

            // Log browser console for OTP verification
            page.on('console', msg => {
                this.logger.log(`[Puppeteer][Console][OTP] ${msg.type()}: ${msg.text()}`);
            });

            await page.setUserAgent('Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36');
            await page.setViewport({ width: 400, height: 800, isMobile: true });

            // Go to the OTP verification page
            await page.goto(`https://www.perplexity.ai/auth/verify-request?email=${encodeURIComponent(email)}`, { waitUntil: 'networkidle2' });
            await new Promise(res => setTimeout(res, 1000 + Math.random() * 1000));

            // Wait for the OTP input box (placeholder: "Enter Code")
            const otpSelector = 'input[placeholder="Enter Code"]';
            await page.waitForSelector(otpSelector, { timeout: 7000 });
            const otpInput = await page.$(otpSelector);
            if (!otpInput) {
                return { success: false, message: 'OTP input not found.' };
            }

            // Type the OTP and force input events
            await otpInput.focus();
            await page.evaluate((selector, otp) => {
                const el = document.querySelector(selector) as HTMLInputElement;
                if (el) {
                    el.value = otp;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur', { bubbles: true }));
                }
            }, otpSelector, otp);

            // Wait a bit before clicking
            await new Promise(res => setTimeout(res, 500 + Math.random() * 500));

            // Take a screenshot before searching for the Continue button
            await page.screenshot({ path: `perplexity_otp_before_continue_${Date.now()}.png`, fullPage: true });

            // Wait for the Continue button to become enabled (timeout increased)
            await page.waitForFunction(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                return btns.some(btn =>
                    btn.innerText && btn.innerText.trim().toLowerCase() === 'continue' && !btn.disabled
                );
            }, { timeout: 15000 });

            // Now get the enabled Continue button
            const continueBtnHandle = await page.evaluateHandle(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                return btns.find(btn =>
                    btn.innerText && btn.innerText.trim().toLowerCase() === 'continue' && !btn.disabled
                ) || null;
            });
            const continueBtn = continueBtnHandle.asElement() as unknown as ElementHandle<Element>;
            if (!continueBtn) {
                return { success: false, message: 'Continue button not found or still disabled.' };
            }
            await continueBtn.click({ delay: 50 });

            // Wait for navigation or a short delay
            try {
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
            } catch {
                await new Promise(res => setTimeout(res, 2000 + Math.random() * 1000));
            }

            // Check for success
            const url = page.url();
            const content = await page.content();
            if (/home|account|priority|welcome|success|activated/i.test(url) || /welcome|success|activated|priority|account/i.test(content)) {
                return { success: true, message: 'OTP verified successfully.' };
            }
            // Try to extract error message from page
            const matches = content.match(/(invalid|expired|wrong|incorrect|failed|error)[^<\n]{0,80}/i);
            const errorMsg = matches ? matches[0] : null;
            return { success: false, message: errorMsg || 'OTP verification failed.' };
        } catch (err) {
            this.logger.error('OTP verification failed: ' + (err as Error).message);
            return { success: false, message: 'OTP verification failed.' };
        } finally {
            if (browser) {
                try { await browser.close(); } catch { /* ignore error on browser close */ }
            }
        }
    }

    /**
     * Activate coupon for a user by automating the coupon join page.
     * Navigates to https://www.perplexity.ai/join/p/priority?discount_code=CODE and completes activation.
     */
    async activateCouponOnPerplexity( code: string): Promise<{ success: boolean; message: string }> {
        try {
            puppeteer.use(StealthPlugin());
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36');
            await page.setViewport({ width: 400, height: 800, isMobile: true });
            // Go to coupon activation page
            await page.goto(
                `https://www.perplexity.ai/join/p/priority?discount_code=${encodeURIComponent(code)}&version=2.18&source=default`,
                { waitUntil: 'networkidle2' }
            );
            await new Promise(res => setTimeout(res, 1000 + Math.random() * 1000));

            // If login is required, try to login with email (reuse logic if needed)
            // If already logged in, look for activate/join/continue button
            const buttonHandle = await page.evaluateHandle(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                return btns.find(btn => btn.textContent && /activate|join|continue|redeem|start/i.test(btn.textContent)) || null;
            });
            const buttonElement = buttonHandle.asElement();
            if (buttonElement) {
                const elementButton = buttonElement as unknown as import('puppeteer').ElementHandle<Element>;
                await elementButton.click();
                await new Promise(res => setTimeout(res, 2000 + Math.random() * 1000));
            }

            // Check for success (look for redirect or success message)
            const url = page.url();
            const content = await page.content();
            await browser.close();
            if (/success|priority|account|home/i.test(url) || /success|activated|priority|welcome/i.test(content)) {
                return { success: true, message: 'Coupon activated successfully.' };
            }
            return { success: false, message: 'Coupon activation may have failed.' };
        } catch (err) {
            this.logger.error('Coupon activation failed: ' + (err as Error).message);
            return { success: false, message: 'Coupon activation failed.' };
        }
    }
}