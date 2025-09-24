/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PerplexityService {
    private readonly logger = new Logger(PerplexityService.name);



    /**
     * Starts the redemption flow by sending sign-in code using Perplexity API
     */
    async startRedemptionFlow(email: string, uuid: string): Promise<{ success: boolean; message: string }> {
        try {
            const res = await axios.post(
                'https://redeem.o2perplexity.online/send-code',
                { email, uuid }, // uuid must be provided
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Origin': 'https://o2perplexity.online',
                        'Referer': 'https://o2perplexity.online',
                    }
                }
            );
            if (res.status === 200) {
                this.logger.log(`Sign-in code sent to ${email} via direct API hit.`);
                return { success: true, message: 'Sign-in code sent to email.' };
            } else {
                this.logger.error(`Failed to send sign-in code via direct API hit.`);
                return { success: false, message: 'Failed to send sign-in code.' };
            }
        } catch (error: any) {
            const errorMessage = (error && typeof error === 'object' && 'message' in error) ? (error as { message: string }).message : String(error);
            this.logger.error(`Failed to send sign-in code via direct API hit: ${errorMessage}`);
            return { success: false, message: 'Failed to send sign-in code.' };
        }
    }

    // ...existing code...
}