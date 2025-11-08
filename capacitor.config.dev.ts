import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snapp.test',
  appName: 'SN App (Dev)',
  webDir: 'build',
  server: {
    url: 'http://YOUR_IP:5173',
    cleartext: true
  }
};

export default config;
