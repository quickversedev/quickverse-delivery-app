# Authentication Flow Documentation

This document describes the authentication flow implemented in the QV Transporters App.

## Overview

The app implements a phone number-based authentication system with OTP verification. The flow consists of three main screens:

1. **Login Screen** - Phone number input
2. **OTP Screen** - OTP verification
3. **Home Screen** - Main app screen after successful authentication

## Architecture

### Components Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Authentication state management
├── screens/
│   ├── LoginScreen.tsx          # Phone number input screen
│   ├── OTPScreen.tsx            # OTP verification screen
│   └── HomeScreen.tsx           # Main app screen
├── navigation/
│   └── AppNavigator.tsx         # Navigation logic
└── components/
    └── LoadingScreen.tsx        # Loading indicator
```

### Authentication Context

The `AuthContext` provides:
- User state management
- Login function (sends OTP)
- OTP verification function
- Logout functionality
- Loading states

### Navigation

The app uses a custom navigation system that:
- Manages screen transitions
- Handles back navigation
- Maintains screen history
- Automatically shows appropriate screens based on authentication state

## Flow Description

### 1. Login Screen
- User enters phone number
- Basic validation (10+ digits, common phone formats)
- Calls `login()` function from AuthContext
- Navigates to OTP screen on success

### 2. OTP Screen
- Displays 6-digit OTP input fields
- Auto-focuses next field when digit is entered
- 60-second countdown timer for resend
- Calls `verifyOTP()` function
- Navigates to Home screen on successful verification
- Allows resending OTP after timer expires

### 3. Home Screen
- Displays welcome message with phone number
- Shows app features and quick actions
- Provides logout functionality
- Returns to Login screen after logout

## Key Features

### Security
- Phone number masking in OTP screen
- Secure OTP validation
- Session management

### User Experience
- Smooth transitions between screens
- Loading indicators during API calls
- Error handling with user-friendly messages
- Auto-focus and keyboard handling
- Responsive design for both iOS and Android

### Validation
- Phone number format validation
- OTP length and format validation
- Input sanitization

## Usage

### Running the App

1. Start the Metro bundler:
   ```bash
   npm start
   ```

2. Run on Android:
   ```bash
   npm run android
   ```

3. Run on iOS:
   ```bash
   npm run ios
   ```

### Testing the Flow

1. Enter any valid phone number (10+ digits)
2. Use any 6-digit number as OTP (demo mode)
3. Access the home screen
4. Test logout functionality

## Customization

### Styling
- All styles are defined in each component's StyleSheet
- Colors and spacing can be easily modified
- Supports both light and dark themes

### Backend Integration
- Replace mock API calls in `AuthContext.tsx`
- Update OTP validation logic
- Add proper error handling for network requests

### Additional Features
- Add biometric authentication
- Implement "Remember Me" functionality
- Add social login options
- Include password reset flow

## Dependencies

The authentication flow uses only React Native core components and the existing `react-native-safe-area-context` dependency. No additional navigation libraries are required.

## Security Considerations

For production use, consider:
- Implementing proper OTP generation and validation
- Adding rate limiting for OTP requests
- Using secure storage for sensitive data
- Implementing proper session management
- Adding network security measures


