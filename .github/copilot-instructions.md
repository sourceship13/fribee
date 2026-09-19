# Copilot Instructions

## Project Overview

This is **Fribee Deals**, a React Native mobile app for discovering and sharing local deals. The app uses a swipe-based interface for deal discovery and includes a unique contact-based sharing system to unlock premium deals.

## Architecture & Key Patterns

### Authentication Flow
- **Conditional Navigation**: App uses `useAuth` hook to control stack navigator routing
- **Auth screens**: SignIn, SignUp, Verification (unauthenticated users)
- **Main screens**: Swipe, Explore, DealDetail, Profile, SavedDeals, Settings (authenticated users)
- **Context Provider**: `AuthProvider` wraps entire app, provides `user`, `isAuthenticated`, `isDarkMode` state

### Navigation Structure
- **Single Stack Navigator**: Uses `@react-navigation/native-stack` with conditional screen rendering
- **No Tab Navigation**: Pure stack-based navigation with custom `Toolbar` component
- **Screen Names**: Use PascalCase strings (`"DealDetail"`, `"SignIn"`)
- **Header Management**: All screens use `headerShown: false`, custom `Toolbar` component handles navigation

### Data Architecture
- **Services Pattern**: Singleton services (`ApiService`, `AuthService`, `DealSharingService`)
- **Type Safety**: Centralized types in `src/types/global.types.ts` (User, Category, LoginCredentials, RegisterData)
- **State Management**: React Context + hooks pattern, no Redux
- **Async Storage**: Used for persistence (auth tokens, preferences, sharing data)

### Deal Sharing System (Core Feature)
- **Contact-Based Sharing**: Users must share deals with contacts to unlock them
- **Permission Handling**: `react-native-contacts` + `react-native-permissions` for contact access
- **Progress Tracking**: Share progress stored in AsyncStorage, tracks required vs current shares
- **Hook Pattern**: `useDealSharing` custom hook manages sharing state and actions

### Theming & Colors
- **Centralized Colors**: `src/libs/colors.ts` exports light/dark theme objects
- **Theme Hook**: `useAuth` provides `isDarkMode` boolean and `getColors()` function  
- **Dynamic Theming**: Colors accessed via `const colors = getColors(isDarkMode)`
- **Appearance Integration**: Respects system theme changes automatically

## Development Commands

```bash
# iOS Development (specific simulators configured)
npm run ios          # iPhone 17 Pro (default)
npm run ios:max      # iPhone 17 Pro Max  
npm run ios:se       # iPhone SE (3rd generation)
npm run ios:ipad     # iPad Pro (12.9-inch)

# Android Development
npm run android      # Run on Android device/emulator

# Maintenance Commands
npm run clean        # Clean both Android and iOS build artifacts
npm run reset-cache  # Reset Metro bundler cache
npm run pod-install  # Install iOS CocoaPods dependencies
```

## File Structure Conventions

```
src/
├── components/          # Reusable UI components
│   ├── DealShareButton.tsx    # Main sharing component
│   └── Toolbar.tsx           # Custom navigation header
├── libs/
│   ├── colors.ts            # Theme color definitions
│   ├── hooks/               # Custom React hooks
│   └── utils/               # Utility functions
├── screens/                 # Screen components (organized by feature)
│   ├── DealDetail/
│   ├── Explore/
│   ├── Home/
│   └── [FeatureName]/       # Each screen in own directory
├── services/                # Business logic & API calls
│   ├── api.service.ts       # Centralized HTTP client
│   ├── auth.service.ts      # Authentication logic
│   └── deal-sharing.service.ts # Contact sharing logic
└── types/
    └── global.types.ts      # TypeScript interfaces
```

## Key Coding Patterns

### Service Layer Pattern
All services use singleton pattern with `getInstance()` method:
```typescript
class ApiService {
  private static instance: ApiService;
  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }
}
export default ApiService.getInstance();
```

### Color Usage Pattern
Always use dynamic theming, never hardcoded colors:
```typescript
const { isDarkMode } = useAuth();
const colors = getColors(isDarkMode);

// In styles
backgroundColor: colors.background,
color: colors.text
```

### API Response Pattern
All API calls return consistent `ApiResponse<T>` interface:
```typescript
interface ApiResponse<T = any> {
  data?: T;
  success?: boolean;
  message?: string;
  error?: string;
}
```

### Deal Data Structure
Deals have inconsistent property names across API responses. Always handle both variants:
```typescript
// Handle both business_name and business
business_name: deal.business_name || deal.business
// Handle both description and descrption (API typo)
description: deal.description || deal.descrption
// Handle both expires and expiry
expires: deal.expires || deal.expiry
```

### Icon Usage
- **Primary Icons**: `react-native-vector-icons/MaterialIcons` for main UI
- **Navigation Icons**: `react-native-vector-icons/Ionicons` for toolbar/navigation
- **Verified Badge**: `MaterialIcons` "verified" with color `#0095f6`
- **Platform Fonts**: Use `Platform.OS === 'ios' ? 'System' : 'Roboto'` for consistency

## Testing & Debug Features
- Multiple debug screens available: `Debug`, `NetworkDebug`, `PermissionTest`, `DemoShare`
- Extensive console logging in ApiService for network debugging
- Mock data and placeholder screens for development
- Contact sharing can be tested via `DemoShareScreen`

When working on this codebase, always consider the sharing mechanism as a core feature that affects deal access and user progression through the app.