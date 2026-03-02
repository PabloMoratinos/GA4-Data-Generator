export interface CustomEventDef {
  id: string;
  name: string;
  params: Record<string, string>;
  weight: number;
}

export interface StandardEventDef {
  name: string;
  weight: number;
}

export interface GA4Config {
  measurementId: string;
  apiSecret: string;
  eventsPerMinute: number;
  customEvents: CustomEventDef[];
  selectedStandardEvents: StandardEventDef[];
}

export interface GA4EventLog {
  id: string;
  timestamp: Date;
  clientId: string;
  sessionId: string;
  eventName: string;
  status: 'success' | 'error';
  payload: any;
  error?: string;
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const EVENT_TYPES = [
  'page_view',
  'scroll',
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'purchase',
  'login',
  'sign_up'
];

const PAGES = [
  { title: 'Home', location: 'https://example.com/' },
  { title: 'Products', location: 'https://example.com/products' },
  { title: 'About Us', location: 'https://example.com/about' },
  { title: 'Checkout', location: 'https://example.com/checkout' }
];

const TRAFFIC_SOURCES = [
  { source: 'google', medium: 'organic', referrer: 'https://www.google.com/' },
  { source: 'google', medium: 'cpc', campaign: 'spring_sale', referrer: 'https://www.google.com/' },
  { source: 'facebook.com', medium: 'referral', referrer: 'https://www.facebook.com/' },
  { source: 'instagram.com', medium: 'social', referrer: 'https://l.instagram.com/' },
  { source: '(direct)', medium: '(none)', referrer: '' },
  { source: 'newsletter', medium: 'email', campaign: 'promo_50', referrer: '' },
  { source: 'bing', medium: 'organic', referrer: 'https://www.bing.com/' }
];

const ITEMS = [
  { item_id: "SKU_12345", item_name: "Stan and Friends Tee", price: 9.99, item_category: "Apparel" },
  { item_id: "SKU_12346", item_name: "Google Grey Women's Tee", price: 20.99, item_category: "Apparel" },
  { item_id: "SKU_12347", item_name: "Google Campus Bike", price: 250.00, item_category: "Sports" },
  { item_id: "SKU_12348", item_name: "Android Mascot Figurine", price: 15.50, item_category: "Accessories" }
];

interface UserSession {
  clientId: string;
  sessionId: string;
  lastActive: number;
}

class GA4Agent {
  private config: GA4Config | null = null;
  private isRunning = false;
  private timer: number | null = null;
  private activeSessions: UserSession[] = [];
  private onLogCallback: ((log: GA4EventLog) => void) | null = null;

  setConfig(config: GA4Config) {
    this.config = config;
  }

  onLog(callback: (log: GA4EventLog) => void) {
    this.onLogCallback = callback;
  }

  start() {
    if (!this.config || !this.config.measurementId || !this.config.apiSecret) {
      throw new Error('Missing GA4 configuration');
    }
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleNextEvent();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextEvent() {
    if (!this.isRunning || !this.config) return;

    // Calculate interval based on events per minute
    // Add some randomness to make it look natural (±20%)
    const baseInterval = (60 * 1000) / this.config.eventsPerMinute;
    const randomFactor = 0.8 + Math.random() * 0.4;
    const nextInterval = baseInterval * randomFactor;

    this.timer = window.setTimeout(() => {
      this.sendRandomEvent();
      this.scheduleNextEvent();
    }, nextInterval);
  }

  private getOrCreateSession(): { session: UserSession, isNew: boolean } {
    const now = Date.now();
    
    // Clean up old sessions (older than 30 mins)
    this.activeSessions = this.activeSessions.filter(s => now - s.lastActive < 30 * 60 * 1000);

    // 20% chance to create a new user/session, 80% chance to reuse existing (if any)
    if (this.activeSessions.length === 0 || Math.random() < 0.2) {
      const newSession = {
        clientId: generateUUID(),
        sessionId: Math.floor(now / 1000).toString(),
        lastActive: now
      };
      this.activeSessions.push(newSession);
      return { session: newSession, isNew: true };
    }

    // Pick a random active session
    const session = this.activeSessions[Math.floor(Math.random() * this.activeSessions.length)];
    session.lastActive = now;
    return { session, isNew: false };
  }

  private async transmitEvent(eventName: string, eventParams: any, session: UserSession, traffic: any, page: any) {
    if (!this.config) return;

    const payload = {
      client_id: session.clientId,
      events: [{
        name: eventName,
        params: {
          session_id: session.sessionId,
          engagement_time_msec: Math.floor(Math.random() * 10000),
          page_title: page.title,
          page_location: page.location,
          user_type: Math.random() > 0.5 ? 'registered' : 'guest',
          source: traffic.source,
          medium: traffic.medium,
          ...(traffic.campaign ? { campaign: traffic.campaign } : {}),
          ...(traffic.referrer ? { page_referrer: traffic.referrer } : {}),
          ...eventParams
        }
      }]
    };

    const logEntry: GA4EventLog = {
      id: generateUUID(),
      timestamp: new Date(),
      clientId: session.clientId,
      sessionId: session.sessionId,
      eventName,
      status: 'success',
      payload
    };

    try {
      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain'
          }
        }
      );

      // With no-cors, the response is opaque (status 0). We assume success if fetch didn't throw.
      if (response.type !== 'opaque' && !response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (this.onLogCallback) {
        this.onLogCallback(logEntry);
      }
    } catch (error: any) {
      logEntry.status = 'error';
      logEntry.error = error.message === 'Failed to fetch' 
        ? 'Network error (Check AdBlocker or CORS)' 
        : error.message;
      if (this.onLogCallback) {
        this.onLogCallback(logEntry);
      }
    }
  }

  private async sendRandomEvent() {
    if (!this.config) return;

    const hasStandard = this.config.selectedStandardEvents && this.config.selectedStandardEvents.length > 0;
    const hasCustom = this.config.customEvents && this.config.customEvents.length > 0;

    if (!hasStandard && !hasCustom) return; // Nothing to send

    const { session, isNew } = this.getOrCreateSession();
    const page = PAGES[Math.floor(Math.random() * PAGES.length)];
    const traffic = TRAFFIC_SOURCES[Math.floor(Math.random() * TRAFFIC_SOURCES.length)];

    // Send session_start if this is a newly created session
    if (isNew) {
      await this.transmitEvent('session_start', {}, session, traffic, page);
    }

    const allEvents: { name: string, isCustom: boolean, eventDef: any, weight: number }[] = [];
    
    if (hasStandard) {
      this.config.selectedStandardEvents.forEach(e => {
        allEvents.push({ name: e.name, isCustom: false, eventDef: e, weight: e.weight || 1 });
      });
    }
    
    if (hasCustom) {
      this.config.customEvents.forEach(e => {
        allEvents.push({ name: e.name, isCustom: true, eventDef: e, weight: e.weight || 1 });
      });
    }

    const totalWeight = allEvents.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedEvent = allEvents[0];
    
    for (const e of allEvents) {
      random -= e.weight;
      if (random <= 0) {
        selectedEvent = e;
        break;
      }
    }

    let eventName = selectedEvent.name;
    let eventParams: any = {};

    if (selectedEvent.isCustom) {
      eventParams = { ...selectedEvent.eventDef.params };
    } else {
      if (['view_item', 'add_to_cart', 'begin_checkout'].includes(eventName)) {
        const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        eventParams = {
          currency: "USD",
          value: item.price,
          items: [{ ...item, quantity: 1 }]
        };
      } else if (eventName === 'purchase') {
        const item1 = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        const item2 = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        eventParams = {
          transaction_id: `T_${Math.floor(Math.random() * 1000000)}`,
          currency: "USD",
          value: item1.price + item2.price,
          items: [
            { ...item1, quantity: 1 },
            { ...item2, quantity: 1 }
          ]
        };
      }
    }

    await this.transmitEvent(eventName, eventParams, session, traffic, page);
  }
}

export const ga4Agent = new GA4Agent();
