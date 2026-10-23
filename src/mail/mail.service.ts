import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

export type MailTemplate = 'payout-success' | 'payout-failed' | 'wallet-funded';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly templates = new Map<string, string>();
  private transporter?: Transporter;
  private readonly from: string;
  private readonly templatesDir = path.join(
    process.cwd(),
    'emails',
    'build_production',
  );

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>(
      'SMTP_FROM',
      'Payroll <no-reply@payroll.local>',
    );
  }

  onModuleInit() {
    this.loadTemplates();
    this.initTransport();
  }

  private loadTemplates() {
    try {
      if (!fs.existsSync(this.templatesDir)) {
        this.logger.warn(
          `Email templates not found at ${this.templatesDir}. Run "npm run email:build".`,
        );
        return;
      }
      for (const file of fs.readdirSync(this.templatesDir)) {
        if (file.endsWith('.html')) {
          const name = file.replace(/\.html$/, '');
          this.templates.set(
            name,
            fs.readFileSync(path.join(this.templatesDir, file), 'utf8'),
          );
        }
      }
      this.logger.log(`Loaded ${this.templates.size} email template(s).`);
    } catch (err) {
      this.logger.error(
        `Failed to load email templates: ${(err as Error).message}`,
      );
    }
  }

  private initTransport() {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP_HOST not set; emails will be logged, not sent.');
      return;
    }
    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  private render(
    template: MailTemplate,
    vars: Record<string, string | number>,
  ): string {
    let html = this.templates.get(template);
    if (!html) {
      // Fallback so the system still works without built templates.
      return (
        `<p>[${template}]</p>` +
        Object.entries(vars)
          .map(([k, v]) => `<p>${k}: ${String(v)}</p>`)
          .join('')
      );
    }
    for (const [key, value] of Object.entries(vars)) {
      html = html.split(`[[${key}]]`).join(String(value));
    }
    return html;
  }

  async send(
    to: string,
    subject: string,
    template: MailTemplate,
    vars: Record<string, string | number>,
  ): Promise<void> {
    const html = this.render(template, vars);
    if (!this.transporter) {
      this.logger.log(
        `[DEV EMAIL] to=${to} subject="${subject}" template=${template}`,
      );
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html });
    this.logger.log(`Sent "${subject}" to ${to}`);
  }

  sendPayoutSuccess(
    to: string,
    vars: {
      employeeName: string;
      amount: string;
      companyName: string;
      reference: string;
    },
  ): Promise<void> {
    return this.send(to, 'You have been paid', 'payout-success', vars);
  }

  sendPayoutFailed(
    to: string,
    vars: {
      employeeName: string;
      amount: string;
      companyName: string;
      reason: string;
    },
  ): Promise<void> {
    return this.send(to, 'Payout failed', 'payout-failed', vars);
  }

  sendWalletFunded(
    to: string,
    vars: { companyName: string; amount: string; balance: string },
  ): Promise<void> {
    return this.send(to, 'Wallet funded', 'wallet-funded', vars);
  }
}
