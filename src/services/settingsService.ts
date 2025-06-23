
interface AppSettings {
  ordersTeamEmail: string;
  ccEmails: string[];
  emailSubjectPrefix: string;
  marginWarningThreshold: number;
  minimumMargin: number;
  standardMargin: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  ordersTeamEmail: 'orders@qualitrolcorp.com',
  ccEmails: ['orders-backup@qualitrolcorp.com'],
  emailSubjectPrefix: '[PowerQuotePro]',
  marginWarningThreshold: 25,
  minimumMargin: 25,
  standardMargin: 40
};

class SettingsService {
  private static instance: SettingsService;
  private settings: AppSettings;

  private constructor() {
    this.loadSettings();
  }

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private loadSettings(): void {
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
      this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('adminSettings', JSON.stringify(this.settings));
  }

  getMarginWarningThreshold(): number {
    return this.settings.marginWarningThreshold;
  }

  getMinimumMargin(): number {
    return this.settings.minimumMargin;
  }

  getStandardMargin(): number {
    return this.settings.standardMargin;
  }

  // Calculate price based on cost and desired margin
  calculatePriceForMargin(cost: number, desiredMargin: number): number {
    return cost / (1 - desiredMargin / 100);
  }

  // Apply standard margin pricing to a product
  applyStandardMarginPricing(cost: number): number {
    return this.calculatePriceForMargin(cost, this.getStandardMargin());
  }
}

export const settingsService = SettingsService.getInstance();
export type { AppSettings };
