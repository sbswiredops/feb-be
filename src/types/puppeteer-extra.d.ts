/* eslint-disable prettier/prettier */
declare module 'puppeteer-extra' {
  import { Browser, LaunchOptions } from 'puppeteer';
  
  interface PuppeteerExtra {
    use(plugin: any): PuppeteerExtra;
    launch(options?: LaunchOptions): Promise<Browser>;
  }

  const puppeteerExtra: PuppeteerExtra;
  export default puppeteerExtra;
}

declare module 'puppeteer-extra-plugin-stealth' {
  const StealthPlugin: any;
  export default StealthPlugin;
}