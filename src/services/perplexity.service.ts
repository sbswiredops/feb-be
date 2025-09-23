/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteerExtra from 'puppeteer-extra';
import type { Browser, Page } from 'puppeteer';

puppeteerExtra.use((StealthPlugin as unknown as () => any)());

@Injectable()
export class PerplexityService {
    private readonly logger = new Logger(PerplexityService.name);
    private readonly HEADLESS_TIMEOUT_MS = Number(
        process.env.HEADLESS_TIMEOUT_MS ?? 30000,
    );
    private readonly PROXY = process.env.US_PROXY_URL ?? null;

    private buildLaunchArgs(): string[] {
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
        ];
        if (this.PROXY) args.push(`--proxy-server=${this.PROXY}`);
        return args;
    }

    private parseProxyAuth(
        proxyUrl: string | null,
    ): { username?: string; password?: string } | null {
        if (!proxyUrl) return null;
        try {
            const u = new URL(proxyUrl);
            if (u.username || u.password) {
                return {
                    username: decodeURIComponent(u.username),
                    password: decodeURIComponent(u.password),
                };
            }
            return null;
        } catch {
            return null;
        }
    }

    async launchBrowser(): Promise<Browser> {
        try {
            const launchOptions: import('puppeteer').LaunchOptions = {
                headless: process.env.NODE_ENV === 'production' ? true : false,
                args: this.buildLaunchArgs(),
                defaultViewport: { width: 1280, height: 720 },
            };

            const browser = await puppeteerExtra.launch(launchOptions);
            return browser;
        } catch (err: unknown) {
            if (err instanceof Error)
                this.logger.error('Failed to launch browser: ' + err.message);
            else this.logger.error('Failed to launch browser (unknown error)');
            throw err;
        }
    }

    private async getPageTextSafe(page: Page): Promise<string> {
        try {
            const txt = await page.evaluate(() => document.body?.innerText || '');
            return typeof txt === 'string' ? txt : '';
        } catch {
            return '';
        }
    }

    private async waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
        await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout }),
            new Promise(resolve => setTimeout(resolve, timeout))
        ]);
    }

    /**
     * Starts the redemption flow with actual Puppeteer logic
     */
    async startRedemptionFlow(
        email: string,
        code: string,
    ): Promise<
        | { immediateSuccess: true; browser?: Browser; page?: never }
        | { immediateSuccess: false; browser: Browser; page: Page; needsCode?: boolean }
    > {
        const browser = await this.launchBrowser();
        const page = await browser.newPage();

        // Set navigation timeout and user agent
        page.setDefaultNavigationTimeout(this.HEADLESS_TIMEOUT_MS);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // If proxy has auth, set it on page
        const proxyAuth = this.parseProxyAuth(this.PROXY);
        if (proxyAuth) {
            try {
                await page.authenticate({
                    username: proxyAuth.username ?? '',
                    password: proxyAuth.password ?? '',
                });
            } catch {
                this.logger.warn('Proxy authentication failed or not required.');
            }
        }

        try {
            // TODO: Replace with actual URL logic as needed
            const targetUrl = process.env.REDEMPTION_URL || 'https://example.com/redeem';
            this.logger.log(`Navigating to: ${targetUrl}`);
            await page.goto(targetUrl, {
                waitUntil: 'domcontentloaded',
                timeout: this.HEADLESS_TIMEOUT_MS,
            });

            // Wait for page to load completely
            await this.waitForNetworkIdle(page, 3000);

            // Try to find and fill email field
            const emailSelectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[id*="email"]',
                '[data-testid="email"]',
                '.email-input',
                '#email'
            ];

            let emailFilled = false;
            for (const selector of emailSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    await page.click(selector, { clickCount: 3 }); // Select all text
                    await page.type(selector, email, { delay: 50 });
                    emailFilled = true;
                    this.logger.log(`Email filled using selector: ${selector}`);
                    break;
                } catch {
                    continue;
                }
            }

            if (!emailFilled) {
                this.logger.warn('Could not find email field, trying manual search');
                // Fallback: try to find any input that might be email
                const inputs = await page.$$('input');
                for (const input of inputs) {
                    try {
                        const type = await input.evaluate(el => el.getAttribute('type'));
                        const name = await input.evaluate(el => el.getAttribute('name'));
                        const id = await input.evaluate(el => el.getAttribute('id'));

                        if (type === 'email' || name?.includes('email') || id?.includes('email')) {
                            await input.click({ clickCount: 3 });
                            await input.type(email, { delay: 50 });
                            emailFilled = true;
                            break;
                        }
                    } catch {
                        continue;
                    }
                }
            }

            // Try to find and fill coupon code field
            const codeSelectors = [
                'input[name="coupon"]',
                'input[name="code"]',
                'input[name="promo"]',
                'input[name="voucher"]',
                'input[placeholder*="coupon"]',
                'input[placeholder*="code"]',
                'input[placeholder*="promo"]',
                '.coupon-input',
                '.promo-code',
                '#coupon',
                '#promo'
            ];

            let codeFilled = false;
            for (const selector of codeSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    await page.click(selector, { clickCount: 3 });
                    await page.type(selector, code, { delay: 50 });
                    codeFilled = true;
                    this.logger.log(`Coupon code filled using selector: ${selector}`);
                    break;
                } catch {
                    continue;
                }
            }

            // Try to find and click submit button

            // Try to find and click submit button (improved: match by text)
            const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                '.submit-btn',
                '.redeem-btn',
                '[data-testid="submit"]'
            ];

            let submitted = false;
            // Try selectors first
            for (const selector of submitSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    await page.click(selector);
                    submitted = true;
                    this.logger.log(`Form submitted using selector: ${selector}`);
                    break;
                } catch {
                    continue;
                }
            }
            // If not found, try matching button text
            if (!submitted) {
                const buttons = await page.$$('button');
                for (const btn of buttons) {
                    const text = await btn.evaluate(el => el.textContent?.toLowerCase() || '');
                    if (['redeem', 'submit', 'continue', 'next'].some(word => text.includes(word))) {
                        await btn.click();
                        submitted = true;
                        this.logger.log(`Form submitted by button text: ${text}`);
                        break;
                    }
                }
            }
            // If still not found, try pressing Enter
            if (!submitted && (emailFilled || codeFilled)) {
                try {
                    await page.keyboard.press('Enter');
                    submitted = true;
                    this.logger.log('Form submitted using Enter key');
                } catch {
                    // Ignore error
                }
            }

            // Wait for response after submission
            await this.waitForNetworkIdle(page, 5000);

            // Check for immediate success
            const bodyText = await this.getPageTextSafe(page);
            const lowered = bodyText.toLowerCase();

            const immediateSuccessPatterns = [
                'success',
                'redeemed',
                'activated',
                'thank you',
                'congratulations',
                'activation complete',
                'your coupon has been redeemed',
                'successfully redeemed'
            ];

            const errorPatterns = [
                'error',
                'invalid',
                'failed',
                'try again',
                'not found',
                'expired'
            ];

            const immediateSuccess = immediateSuccessPatterns.some(pattern =>
                lowered.includes(pattern)
            );

            const hasError = errorPatterns.some(pattern =>
                lowered.includes(pattern)
            );

            if (hasError) {
                this.logger.error('Error detected in redemption response');
                await browser.close();
                throw new Error('Redemption failed - error detected');
            }

            if (immediateSuccess) {
                this.logger.log('Immediate redemption success detected');
                await browser.close();
                return { immediateSuccess: true };
            }

            // Check if OTP/code input is present (waiting for verification code)
            const otpSelectors = [
                'input[name="otp"]',
                'input[name="verification"]',
                'input[type="tel"]',
                '.otp-input',
                '.verification-code',
                '[data-testid="otp"]'
            ];

            let needsCode = false;
            for (const selector of otpSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 3000 });
                    needsCode = true;
                    this.logger.log('OTP input detected - waiting for verification code');
                    break;
                } catch {
                    continue;
                }
            }

            // Also check for "check your email" messages
            const codeSentPatterns = [
                'check your email',
                'verification code',
                'enter code',
                'we sent a code',
                'code has been sent'
            ];

            if (!needsCode) {
                needsCode = codeSentPatterns.some(pattern =>
                    lowered.includes(pattern)
                );
            }

            if (needsCode) {
                this.logger.log('Redemption requires verification code');
                return {
                    immediateSuccess: false,
                    browser,
                    page,
                    needsCode: true
                };
            }

            // If we're not sure, assume we need code and keep session open
            this.logger.log('Redemption status unclear, keeping session open for verification');
            return {
                immediateSuccess: false,
                browser,
                page,
                needsCode: true
            };

        } catch (error) {
            // Close browser on error
            try {
                await browser.close();
            } catch {
                // Ignore cleanup errors
            }

            if (error instanceof Error) {
                this.logger.error(`Redemption flow error: ${error.message}`);
                throw error;
            } else {
                this.logger.error('Unknown error in redemption flow');
                throw new Error('Redemption flow failed');
            }
        }
    }

    /**
     * Completes the redemption flow with a code or magic link
     */
    async completeRedemption(page: Page, codeOrLink: string): Promise<boolean> {
        try {
            if (codeOrLink.startsWith('http')) {
                // It's a magic link - navigate to it
                this.logger.log('Navigating to magic link');
                await page.goto(codeOrLink, {
                    waitUntil: 'domcontentloaded',
                    timeout: this.HEADLESS_TIMEOUT_MS,
                });
            } else {
                // It's a code - enter it in OTP field
                this.logger.log('Entering verification code');
                const otpSelectors = [
                    'input[name="otp"]',
                    'input[name="verification"]',
                    'input[name="code"]',
                    'input[type="tel"]',
                    '.otp-input',
                    '.verification-code',
                    '[data-testid="otp"]'
                ];

                let codeEntered = false;
                for (const selector of otpSelectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 5000 });
                        await page.click(selector, { clickCount: 3 });
                        await page.type(selector, codeOrLink, { delay: 50 });
                        codeEntered = true;
                        this.logger.log(`Code entered using selector: ${selector}`);
                        break;
                    } catch {
                        continue;
                    }
                }

                if (!codeEntered) {
                    this.logger.error('Could not find OTP input field');
                    return false;
                }

                // Submit the code
                const submitSelectors = [
                    'button[type="submit"]',
                    'button:contains("Verify")',
                    'button:contains("Confirm")',
                    'button:contains("Submit")',
                    '.verify-btn',
                    '[data-testid="verify"]'
                ];

                let submitted = false;
                for (const selector of submitSelectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 3000 });
                        await page.click(selector);
                        submitted = true;
                        break;
                    } catch {
                        continue;
                    }
                }

                if (!submitted) {
                    // Try pressing Enter
                    await page.keyboard.press('Enter');
                }

                // Wait for response
                await this.waitForNetworkIdle(page, 5000);
            }

            // Check for success
            const bodyText = await this.getPageTextSafe(page);
            const lowered = bodyText.toLowerCase();

            const successPatterns = [
                'success',
                'verified',
                'activated',
                'thank you',
                'congratulations',
                'redemption complete',
                'account activated',
                'you\'re all set'
            ];

            const errorPatterns = [
                'error',
                'invalid',
                'failed',
                'try again',
                'wrong code'
            ];

            const success = successPatterns.some(pattern =>
                lowered.includes(pattern)
            );

            const hasError = errorPatterns.some(pattern =>
                lowered.includes(pattern)
            );

            if (hasError) {
                this.logger.error('Error detected in verification response');
                return false;
            }

            this.logger.log(`Verification result: ${success ? 'SUCCESS' : 'UNKNOWN'}`);
            return success;

        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(`Complete redemption error: ${error.message}`);
            } else {
                this.logger.error('Unknown error in complete redemption');
            }
            return false;
        }
    }
}