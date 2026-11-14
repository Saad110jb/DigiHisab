export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  badge?: string | number;
  badgeColor?: 'mint' | 'sky' | 'amber' | 'rose' | 'slate';
  category: 'Main' | 'People & Business' | 'Operations' | 'Security & Team';
  description?: string;
}

export const dynamicNavConfig: NavItem[] = [
  // 1. Main
  {
    id: 'home',
    label: 'Home Overview',
    href: '/admin',
    iconName: 'Home',
    badge: 'LIVE',
    badgeColor: 'mint',
    category: 'Main',
    description: 'Overall earnings, health, and pulse of the app',
  },
  {
    id: 'marketing',
    label: 'Growth & Ads',
    href: '/admin/marketing',
    iconName: 'TrendingUp',
    badge: 'Viral',
    badgeColor: 'mint',
    category: 'Main',
    description: 'Facebook ads, mandi foot-agents, and Paylink loop',
  },
  {
    id: 'plans',
    label: 'Plans & Pricing',
    href: '/admin/subscriptions',
    iconName: 'CreditCard',
    badge: 'Active',
    badgeColor: 'mint',
    category: 'Main',
    description: 'Rs. 200/250/400/750 pricing, AI features & Kill-switch',
  },
  {
    id: 'finance',
    label: 'Money & Payments',
    href: '/admin/finance',
    iconName: 'Wallet',
    badge: 'Auto',
    badgeColor: 'sky',
    category: 'Main',
    description: 'JazzCash, EasyPaisa, PayFast & Raast deposits',
  },

  // 2. People & Business
  {
    id: 'users',
    label: 'Users (Shops & Homes)',
    href: '/admin/users',
    iconName: 'Users',
    badge: '2.6k',
    badgeColor: 'sky',
    category: 'People & Business',
    description: 'List of all 1,540 shopkeepers and 1,105 families',
  },
  {
    id: 'documents',
    label: 'ID Card Checks',
    href: '/admin/documents',
    iconName: 'UserCheck',
    badge: '7 Pending',
    badgeColor: 'amber',
    category: 'People & Business',
    description: 'Review and approve scanned smart CNICs',
  },
  {
    id: 'explorer',
    label: 'Khata Search',
    href: '/admin/explorer',
    iconName: 'Search',
    category: 'People & Business',
    description: 'Look up any shopkeeper or customer khata instantly',
  },
  {
    id: 'tariffs',
    label: 'Sub-Meters & Bills',
    href: '/admin/tariffs',
    iconName: 'Zap',
    badge: 'Slabs',
    badgeColor: 'slate',
    category: 'People & Business',
    description: 'LESCO slabs, water, gas, and tenant splitters',
  },

  // 3. Operations & Support
  {
    id: 'help',
    label: 'Help & Complaints',
    href: '/admin/complaints',
    iconName: 'HelpCircle',
    badge: 3,
    badgeColor: 'rose',
    category: 'Operations',
    description: 'Resolve customer questions and WhatsApp tickets',
  },
  {
    id: 'alerts',
    label: 'Alerts & Announcements',
    href: '/admin/notifications',
    iconName: 'Bell',
    badge: 'Push/SMS',
    badgeColor: 'mint',
    category: 'Operations',
    description: 'Send mass messages to phones via push or email',
  },
  {
    id: 'app_versions',
    label: 'App Updates & Controls',
    href: '/admin/app-versions',
    iconName: 'Smartphone',
    badge: 'v2.6',
    badgeColor: 'slate',
    category: 'Operations',
    description: 'Push required app updates or maintenance mode',
  },

  // 4. Security & Team
  {
    id: 'security',
    label: 'Security & Lockouts',
    href: '/admin/security',
    iconName: 'ShieldAlert',
    category: 'Security & Team',
    description: 'Check failed PIN attempts and locked devices',
  },
  {
    id: 'fraud',
    label: 'Till Shortage & Theft',
    href: '/admin/fraud',
    iconName: 'AlertTriangle',
    badge: 'Chor Nazar',
    badgeColor: 'amber',
    category: 'Security & Team',
    description: 'Detect cash drawer theft, shortages, or fake entries',
  },
  {
    id: 'rbac',
    label: 'Admin Team & Roles',
    href: '/admin/rbac',
    iconName: 'Users',
    badge: '4 Nodes',
    badgeColor: 'slate',
    category: 'Security & Team',
    description: 'Manage SuperAdmin accounts and secret rotation',
  },
  {
    id: 'passwords',
    label: 'Password & 2FA Keys',
    href: '/admin/settings/security',
    iconName: 'Key',
    badge: 'TOTP',
    badgeColor: 'mint',
    category: 'Security & Team',
    description: 'SuperAdmin passkeys, TOTP secrets, and logins',
  },
  {
    id: 'audit_logs',
    label: 'Activity History',
    href: '/admin/audit-logs',
    iconName: 'FileText',
    badge: 'Safe',
    badgeColor: 'slate',
    category: 'Security & Team',
    description: 'Who did what, when, and from where',
  },
];
