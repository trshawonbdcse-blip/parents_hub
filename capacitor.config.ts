import type { CapacitorConfig } from '@capacitor/cli'

// Native iOS wrapper around the same web app (built into dist/).
const config: CapacitorConfig = {
  appId: 'ee.parentshub.app',
  appName: 'Parents Hub',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#f6f5f2',
  },
  plugins: {
    LocalNotifications: { iconColor: '#136f63' },
  },
}

export default config
