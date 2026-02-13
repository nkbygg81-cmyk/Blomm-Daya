import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('App.tsx Convex Configuration', () => {
  it('should have hardcoded Convex URL instead of environment variable check', () => {
    const appPath = path.join(__dirname, '..', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');
    
    // Verify that the hardcoded URL is present (flexible whitespace matching)
    expect(appContent).toMatch(/const\s+convex\s*=\s*new\s+ConvexReactClient\s*\(\s*["']https:\/\/little-coyote-905\.convex\.cloud["']\s*\)/);
    
    // Verify that the environment variable check is NOT present
    expect(appContent).not.toMatch(/if\s*\(\s*!\s*process\.env\.EXPO_PUBLIC_CONVEX_URL/);
    
    // Verify that the Expo Go compatibility comment is present
    expect(appContent).toMatch(/Note:\s*Hardcoded for Expo Go compatibility/);
    expect(appContent).toMatch(/For production builds with environment variables,\s*use EAS Build/);
  });
  
  it('should not throw error for missing environment variable', () => {
    // This test verifies that the code doesn't rely on environment variables
    const appPath = path.join(__dirname, '..', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');
    
    // Verify that process.env.EXPO_PUBLIC_CONVEX_URL is not used in Convex initialization
    const convexInitLine = appContent.match(/const convex = new ConvexReactClient\((.*?)\);/);
    expect(convexInitLine).toBeTruthy();
    
    if (convexInitLine) {
      // The argument should be a hardcoded string, not an environment variable
      expect(convexInitLine[1]).toMatch(/^"https:\/\/.+\.convex\.cloud"$/);
      expect(convexInitLine[1]).not.toContain('process.env');
    }
  });
});
