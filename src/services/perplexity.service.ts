/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteerExtra from 'puppeteer-extra';
import type { Browser } from 'puppeteer';
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
            const browser = await puppeteerExtra.launch({
                headless: true,
                args: this.buildLaunchArgs(),
            });
            return browser;
        } catch (err: unknown) {
            if (err instanceof Error)
                this.logger.error('Failed to launch browser: ' + err.message);
            else this.logger.error('Failed to launch browser (unknown error)');
            throw err;
        }
    }

    /**
     * Starts the redemption flow. Returns either immediate success or a browser/page for further steps.
     */
    async startRedemptionFlow(
        _email: string,
        _code: string,
        _targetUrl: string,
    ): Promise<
        | { immediateSuccess: true; browser?: Browser; page?: never }
        | { immediateSuccess: false; browser: Browser; page: any }
    > {
        // TODO: Implement actual Puppeteer logic here
        // For now, return a stub indicating waiting for code
        void _email;
        void _code;
        void _targetUrl;
        const browser = await this.launchBrowser();
        const page = await browser.newPage();
        // Simulate: always require code for now
        return { immediateSuccess: false, browser, page };
    }

    /**
     * Completes the redemption flow with a code or magic link.
     * Returns true if successful, false otherwise.
     */
    completeRedemption(page: any, codeOrLink: string): boolean {
        // TODO: Implement actual Puppeteer logic here
        // For now, always return true for demo
        void page;
        void codeOrLink;
        return true;
    }
}