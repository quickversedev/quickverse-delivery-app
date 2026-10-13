// NOTE: Login Screen With Scroll
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   Keyboard,
//   TouchableWithoutFeedback,
//   StatusBar,
//   ScrollView,
//   Animated,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import useAuthStore from '../hooks/useAuthStore';
// import { AuthError } from '../services/auth.service';
// import { FONT_FAMILY } from '../theme/typography';

// interface LoginScreenProps {
//   navigation: any;
// }

// const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
//   const [phoneNumber, setPhoneNumber] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [fieldError, setFieldError] = useState('');
//   const [apiError, setApiError] = useState('');
//   const [isFocused, setIsFocused] = useState(false);
//   const { login } = useAuthStore();

//   // ── Animated values ──
//   const headerY = useRef(new Animated.Value(-40)).current;
//   const headerO = useRef(new Animated.Value(0)).current;
//   const cardY = useRef(new Animated.Value(40)).current;
//   const cardO = useRef(new Animated.Value(0)).current;
//   const badgesY = useRef(new Animated.Value(40)).current;
//   const badgesO = useRef(new Animated.Value(0)).current;
//   const inputScale = useRef(new Animated.Value(1)).current;
//   const errorO = useRef(new Animated.Value(0)).current;
//   const buttonScale = useRef(new Animated.Value(1)).current;

//   // Mount animation
//   useEffect(() => {
//     Animated.stagger(120, [
//       Animated.parallel([
//         Animated.spring(headerY, {
//           toValue: 0,
//           tension: 60,
//           friction: 10,
//           useNativeDriver: true,
//         }),
//         Animated.timing(headerO, {
//           toValue: 1,
//           duration: 400,
//           useNativeDriver: true,
//         }),
//       ]),
//       Animated.parallel([
//         Animated.spring(cardY, {
//           toValue: 0,
//           tension: 60,
//           friction: 10,
//           useNativeDriver: true,
//         }),
//         Animated.timing(cardO, {
//           toValue: 1,
//           duration: 400,
//           useNativeDriver: true,
//         }),
//       ]),
//       Animated.parallel([
//         Animated.spring(badgesY, {
//           toValue: 0,
//           tension: 60,
//           friction: 10,
//           useNativeDriver: true,
//         }),
//         Animated.timing(badgesO, {
//           toValue: 1,
//           duration: 400,
//           useNativeDriver: true,
//         }),
//       ]),
//     ]).start();
//   }, []);

//   // Error shake animation
//   const shakeX = useRef(new Animated.Value(0)).current;
//   const triggerShake = () => {
//     shakeX.setValue(0);
//     Animated.sequence([
//       Animated.timing(shakeX, {
//         toValue: 8,
//         duration: 60,
//         useNativeDriver: true,
//       }),
//       Animated.timing(shakeX, {
//         toValue: -8,
//         duration: 60,
//         useNativeDriver: true,
//       }),
//       Animated.timing(shakeX, {
//         toValue: 6,
//         duration: 60,
//         useNativeDriver: true,
//       }),
//       Animated.timing(shakeX, {
//         toValue: -6,
//         duration: 60,
//         useNativeDriver: true,
//       }),
//       Animated.timing(shakeX, {
//         toValue: 0,
//         duration: 60,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   };

//   // Error fade in
//   useEffect(() => {
//     if (fieldError || apiError) {
//       triggerShake();
//       Animated.timing(errorO, {
//         toValue: 1,
//         duration: 250,
//         useNativeDriver: true,
//       }).start();
//     } else {
//       Animated.timing(errorO, {
//         toValue: 0,
//         duration: 150,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [fieldError, apiError]);

//   // Input focus animation
//   const handleFocus = () => {
//     setIsFocused(true);
//     Animated.spring(inputScale, {
//       toValue: 1.02,
//       tension: 100,
//       friction: 8,
//       useNativeDriver: true,
//     }).start();
//   };
//   const handleBlur = () => {
//     setIsFocused(false);
//     Animated.spring(inputScale, {
//       toValue: 1,
//       tension: 100,
//       friction: 8,
//       useNativeDriver: true,
//     }).start();
//   };

//   const digitPhone = phoneNumber.replace(/\D/g, '').slice(0, 10);
//   const isPhoneValid = /^[0-9]{10}$/.test(digitPhone);

//   const toAuthMessage = (error: unknown): string => {
//     const err = error as Partial<AuthError>;
//     if (err?.isCancelled) return 'Request was cancelled. Please try again.';
//     if (typeof err?.message === 'string' && err.message.trim().length > 0)
//       return err.message;
//     return 'Failed to send OTP. Please try again.';
//   };

//   const handlePhoneChange = (value: string) => {
//     const cleaned = value.replace(/\D/g, '').slice(0, 10);
//     setPhoneNumber(cleaned);
//     if (fieldError) setFieldError('');
//     if (apiError) setApiError('');
//   };

//   const handlePressIn = () =>
//     Animated.spring(buttonScale, {
//       toValue: 0.96,
//       useNativeDriver: true,
//     }).start();
//   const handlePressOut = () =>
//     Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();

//   const handleLogin = async () => {
//     if (!digitPhone) {
//       setFieldError('Please enter your phone number.');
//       return;
//     }
//     if (!isPhoneValid) {
//       setFieldError('Please enter a valid 10-digit phone number.');
//       return;
//     }
//     try {
//       setIsLoading(true);
//       setFieldError('');
//       setApiError('');
//       await login(digitPhone);
//       navigation.navigate('OTP');
//     } catch (error) {
//       setApiError(toAuthMessage(error));
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
//       <StatusBar barStyle="light-content" backgroundColor="#1A6BFF" />

//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={styles.scrollContent}
//         keyboardShouldPersistTaps="handled"
//         showsVerticalScrollIndicator={false}
//         keyboardDismissMode="interactive"
//       >
//         <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
//           <View>
//             {/* ── Hero Blue Band (inside scroll, no overflow:hidden so card is never clipped) ── */}
//             <View style={styles.heroBand}>
//               {/* Decorative circles */}
//               <View style={[styles.circle, styles.circleL]} />
//               <View style={[styles.circle, styles.circleR]} />
//               {/* Dotted grid pattern top-right */}
//               <View style={styles.dotGrid}>
//                 {Array.from({ length: 15 }).map((_, i) => (
//                   <View key={i} style={styles.dot} />
//                 ))}
//               </View>

//               <Animated.View
//                 style={[
//                   styles.heroContent,
//                   { opacity: headerO, transform: [{ translateY: headerY }] },
//                 ]}
//               >
//                 {/* Logo Row */}
//                 <View style={styles.logoRow}>
//                   <View style={styles.logoIcon}>
//                     <Text style={styles.logoIconText}>QV</Text>
//                   </View>
//                   <Text style={styles.logoLabel}>QuickVerse Transporter</Text>
//                 </View>

//                 {/* Title with wave emoji */}
//                 <View style={styles.titleRow}>
//                   <Text style={styles.heroTitle}>Welcome back</Text>
//                   <View style={styles.waveContainer}>
//                     <Text style={styles.waveEmoji}>👋</Text>
//                   </View>
//                 </View>
//                 <Text style={styles.heroSubtitle}>
//                   Sign in to manage your deliveries
//                 </Text>
//               </Animated.View>
//             </View>

//             {/* ── Card wrapper — sits outside heroBand, pulled up with negative margin ── */}
//             <View style={styles.cardWrapper}>
//               {/* ── Card ── */}
//               <Animated.View
//                 style={[
//                   styles.card,
//                   { opacity: cardO, transform: [{ translateY: cardY }] },
//                 ]}
//               >
//                 {/* Phone icon + section label */}
//                 <View style={styles.sectionHeader}>
//                   <View style={styles.phoneIconCircle}>
//                     <Text style={styles.phoneIconEmoji}>📞</Text>
//                   </View>
//                   <View style={styles.sectionTextBlock}>
//                     <Text style={styles.sectionLabel}>Mobile Number</Text>
//                     <Text style={styles.sectionHint}>
//                       We'll send a one-time password to verify your identity.
//                     </Text>
//                   </View>
//                 </View>

//                 {/* ── Input ── */}
//                 <Animated.View
//                   style={[
//                     styles.inputWrapper,
//                     isFocused && styles.inputWrapperFocused,
//                     {
//                       transform: [
//                         { translateX: shakeX },
//                         { scale: inputScale },
//                       ],
//                     },
//                   ]}
//                 >
//                   <View style={styles.countryBadge}>
//                     <Text style={styles.flagEmoji}>🇮🇳</Text>
//                     <Text style={styles.countryCode}>+91</Text>
//                     <View style={styles.divider} />
//                   </View>
//                   <TextInput
//                     style={styles.input}
//                     placeholder="00000 00000"
//                     placeholderTextColor="#C5CEDB"
//                     value={phoneNumber}
//                     onChangeText={handlePhoneChange}
//                     onFocus={handleFocus}
//                     onBlur={handleBlur}
//                     keyboardType="number-pad"
//                     autoCapitalize="none"
//                     autoCorrect={false}
//                     maxLength={10}
//                   />
//                   {phoneNumber.length > 0 && (
//                     <TouchableOpacity
//                       onPress={() => {
//                         setPhoneNumber('');
//                         setFieldError('');
//                       }}
//                       style={styles.clearBtn}
//                     >
//                       <Text style={styles.clearBtnText}>✕</Text>
//                     </TouchableOpacity>
//                   )}
//                 </Animated.View>

//                 {/* ── Errors ── */}
//                 {(!!fieldError || !!apiError) && (
//                   <Animated.View style={[styles.errorBox, { opacity: errorO }]}>
//                     <Text style={styles.errorIcon}>⚠</Text>
//                     <Text style={styles.errorText}>
//                       {fieldError || apiError}
//                     </Text>
//                   </Animated.View>
//                 )}

//                 {/* ── Send OTP Button ── */}
//                 <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
//                   <TouchableOpacity
//                     style={[
//                       styles.button,
//                       (!isPhoneValid || isLoading) && styles.buttonDisabled,
//                     ]}
//                     onPress={handleLogin}
//                     onPressIn={handlePressIn}
//                     onPressOut={handlePressOut}
//                     disabled={isLoading || !isPhoneValid}
//                     activeOpacity={0.9}
//                   >
//                     {isLoading ? (
//                       <ActivityIndicator color="#FFFFFF" />
//                     ) : (
//                       <>
//                         <Text style={styles.buttonText}>Send OTP</Text>
//                         <View style={styles.arrowCircle}>
//                           <Text style={styles.buttonArrow}>→</Text>
//                         </View>
//                       </>
//                     )}
//                   </TouchableOpacity>
//                 </Animated.View>

//                 {/* ── Secure & Trusted divider ── */}
//                 <View style={styles.secureDivider}>
//                   <View style={styles.secureLine} />
//                   <View style={styles.secureBadge}>
//                     <Text style={styles.secureIcon}>🛡</Text>
//                     <Text style={styles.secureText}>Secure & Trusted</Text>
//                   </View>
//                   <View style={styles.secureLine} />
//                 </View>

//                 {/* ── Footer ── */}
//                 <View style={styles.footerRow}>
//                   <View style={styles.greenShieldBadge}>
//                     <Text style={styles.greenShieldIcon}>✓</Text>
//                   </View>
//                   <Text style={styles.footerText}>
//                     By continuing, you agree to our{' '}
//                     <Text style={styles.footerLink}>Terms</Text> and{' '}
//                     <Text style={styles.footerLink}>Privacy Policy</Text>.
//                   </Text>
//                 </View>
//               </Animated.View>

//               {/* ── Feature Badges ── */}
//               <Animated.View
//                 style={[
//                   styles.badgesRow,
//                   { opacity: badgesO, transform: [{ translateY: badgesY }] },
//                 ]}
//               >
//                 {/* Secure Login */}
//                 <View style={styles.badge}>
//                   <View style={[styles.badgeIconCircle, styles.badgeBlue]}>
//                     <Text style={styles.badgeIconText}>🛡</Text>
//                   </View>
//                   <Text style={styles.badgeTitle}>Secure Login</Text>
//                   <Text style={styles.badgeDesc}>Your data is protected</Text>
//                 </View>

//                 {/* Quick Access */}
//                 <View style={styles.badge}>
//                   <View style={[styles.badgeIconCircle, styles.badgeGreen]}>
//                     <Text style={styles.badgeIconText}>⚡</Text>
//                   </View>
//                   <Text style={styles.badgeTitle}>Quick Access</Text>
//                   <Text style={styles.badgeDesc}>Get started in seconds</Text>
//                 </View>

//                 {/* Privacy First */}
//                 <View style={styles.badge}>
//                   <View style={[styles.badgeIconCircle, styles.badgePurple]}>
//                     <Text style={styles.badgeIconText}>🔒</Text>
//                   </View>
//                   <Text style={styles.badgeTitle}>Privacy First</Text>
//                   <Text style={styles.badgeDesc}>We respect your privacy</Text>
//                 </View>
//               </Animated.View>
//             </View>
//           </View>
//         </TouchableWithoutFeedback>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   // ── Hero Band ──
//   heroBand: {
//     backgroundColor: '#1A6BFF',
//     paddingTop: 20,
//     paddingBottom: 72, // extra bottom so card overlaps visually
//     paddingHorizontal: 24,
//     borderBottomLeftRadius: 32,
//     borderBottomRightRadius: 32,
//     // NO overflow:hidden — that was clipping the card shadow/overlap
//   },
//   circle: {
//     position: 'absolute',
//     borderRadius: 999,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//   },
//   circleL: {
//     width: 200,
//     height: 200,
//     top: -70,
//     left: -60,
//   },
//   circleR: {
//     width: 150,
//     height: 150,
//     bottom: -50,
//     right: -30,
//   },

//   // Dot grid pattern
//   dotGrid: {
//     position: 'absolute',
//     top: 12,
//     right: 20,
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     width: 60,
//     gap: 8,
//     opacity: 0.35,
//   },
//   dot: {
//     width: 4,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: '#FFFFFF',
//   },

//   heroContent: {
//     zIndex: 1,
//   },
//   logoRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   logoIcon: {
//     width: 44,
//     height: 44,
//     borderRadius: 12,
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 12,
//   },
//   logoIconText: {
//     fontSize: 14,
//     fontFamily: FONT_FAMILY.bricolageBold,
//     color: '#FFFFFF',
//     letterSpacing: 0.5,
//   },
//   logoLabel: {
//     fontSize: 16,
//     fontFamily: FONT_FAMILY.outfitRegular,
//     color: 'rgba(255,255,255,0.9)',
//     letterSpacing: 0.3,
//   },
//   titleRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     marginBottom: 8,
//   },
//   heroTitle: {
//     fontSize: 34,
//     fontFamily: FONT_FAMILY.bricolageBold,
//     color: '#FFFFFF',
//   },
//   waveContainer: {
//     width: 46,
//     height: 46,
//     borderRadius: 23,
//     backgroundColor: 'rgba(255,255,255,0.18)',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   waveEmoji: {
//     fontSize: 22,
//   },
//   heroSubtitle: {
//     fontSize: 15,
//     fontFamily: FONT_FAMILY.outfitRegular,
//     color: 'rgba(255,255,255,0.78)',
//     lineHeight: 22,
//   },

//   safeArea: {
//     flex: 1,
//     backgroundColor: '#1A6BFF', // matches hero so status bar area blends
//   },
//   scrollView: {
//     flex: 1,
//     backgroundColor: '#F0F4FB',
//   },
//   scrollContent: {
//     paddingBottom: 40,
//     backgroundColor: '#F0F4FB',
//   },

//   // cardWrapper sits outside heroBand in DOM order, so card is never clipped
//   cardWrapper: {
//     paddingHorizontal: 16,
//     marginTop: -40, // pulls the whole card+badges block up over the hero band
//     zIndex: 10,
//   },

//   // ── Card ──
//   card: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 28,
//     paddingHorizontal: 22,
//     paddingVertical: 26,
//     shadowColor: '#0A1730',
//     shadowOpacity: 0.12,
//     shadowRadius: 24,
//     shadowOffset: { width: 0, height: 8 },
//     elevation: 10,
//     zIndex: 10,
//   },

//   // Section header with phone icon
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     marginBottom: 22,
//     gap: 14,
//   },
//   phoneIconCircle: {
//     width: 52,
//     height: 52,
//     borderRadius: 26,
//     backgroundColor: '#EEF3FF',
//     alignItems: 'center',
//     justifyContent: 'center',
//     flexShrink: 0,
//   },
//   phoneIconEmoji: {
//     fontSize: 22,
//   },
//   sectionTextBlock: {
//     flex: 1,
//     paddingTop: 2,
//   },
//   sectionLabel: {
//     fontSize: 18,
//     fontFamily: FONT_FAMILY.bricolageBold,
//     color: '#121A2B',
//     marginBottom: 4,
//   },
//   sectionHint: {
//     fontSize: 13,
//     fontFamily: FONT_FAMILY.outfitRegular,
//     color: '#7A8699',
//     lineHeight: 19,
//   },

//   // ── Input ──
//   inputWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1.5,
//     borderColor: '#DDE5F0',
//     borderRadius: 16,
//     backgroundColor: '#F8FAFD',
//     paddingHorizontal: 4,
//     height: 60,
//     marginBottom: 4,
//   },
//   inputWrapperFocused: {
//     borderColor: '#1A6BFF',
//     backgroundColor: '#FFFFFF',
//     shadowColor: '#1A6BFF',
//     shadowOpacity: 0.12,
//     shadowRadius: 8,
//     shadowOffset: { width: 0, height: 2 },
//     elevation: 3,
//   },
//   countryBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//     gap: 6,
//   },
//   flagEmoji: {
//     fontSize: 18,
//   },
//   countryCode: {
//     fontSize: 15,
//     fontFamily: FONT_FAMILY.outfitBold,
//     color: '#1A2B4A',
//   },
//   divider: {
//     width: 1.5,
//     height: 22,
//     backgroundColor: '#DDE5F0',
//     marginLeft: 6,
//   },
//   input: {
//     flex: 1,
//     fontSize: 18,
//     fontFamily: FONT_FAMILY.outfitRegular,
//     color: '#121A2B',
//     paddingVertical: 0,
//     letterSpacing: 2,
//   },
//   clearBtn: {
//     padding: 10,
//     marginRight: 4,
//   },
//   clearBtnText: {
//     fontSize: 13,
//     color: '#94A3B8',
//   },

//   // ── Error Box ──
//   errorBox: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     gap: 8,
//     backgroundColor: '#FFF1F2',
//     borderWidth: 1,
//     borderColor: '#FECDD3',
//     borderRadius: 12,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     marginTop: 10,
//     marginBottom: 4,
//   },
//   errorIcon: {
//     fontSize: 13,
//     color: '#E11D48',
//     marginTop: 1,
//   },
//   errorText: {
//     flex: 1,
//     fontSize: 13,
//     fontFamily: FONT_FAMILY.outfitRegular,
//     color: '#BE123C',
//     lineHeight: 18,
//   },

//   // ── Button ──
//   button: {
//     marginTop: 18,
//     backgroundColor: '#1A6BFF',
//     borderRadius: 16,
//     height: 58,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     shadowColor: '#1A6BFF',
//     shadowOpacity: 0.35,
//     shadowRadius: 12,
//     shadowOffset: { width: 0, height: 4 },
//     elevation: 6,
//   },
//   buttonDisabled: {
//     backgroundColor: '#C5D8F8',
//     shadowOpacity: 0,
//     elevation: 0,
//   },
//   buttonText: {
//     color: '#FFFFFF',
//     fontSize: 17,
//     fontFamily: FONT_FAMILY.outfitExtraBold,
//     letterSpacing: 0.3,
//   },
//   arrowCircle: {
//     width: 30,
//     height: 30,
//     borderRadius: 15,
//     backgroundColor: 'rgba(255,255,255,0.22)',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   buttonArrow: {
//     color: '#FFFFFF',
//     fontSize: 17,
//     fontFamily: FONT_FAMILY.outfitRegular,
//   },

//   // ── Secure & Trusted ──
//   secureDivider: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 20,
//     marginBottom: 16,
//     gap: 8,
//   },
//   secureLine: {
//     flex: 1,
//     height: 1,
//     backgroundColor: '#EEF2F8',
//   },
//   secureBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 5,
//   },
//   secureIcon: {
//     fontSize: 13,
//     color: '#94A3B8',
//   },
//   secureText: {
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.outfitRegular,
//     color: '#94A3B8',
//     letterSpacing: 0.3,
//   },

//   // ── Footer ──
//   footerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//   },
//   greenShieldBadge: {
//     width: 28,
//     height: 28,
//     borderRadius: 14,
//     backgroundColor: '#DCFCE7',
//     alignItems: 'center',
//     justifyContent: 'center',
//     flexShrink: 0,
//   },
//   greenShieldIcon: {
//     fontSize: 13,
//     color: '#16A34A',
//     fontFamily: FONT_FAMILY.outfitBold,
//   },
//   footerText: {
//     flex: 1,
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.outfitRegular,
//     color: '#64748B',
//     lineHeight: 18,
//   },
//   footerLink: {
//     color: '#1A6BFF',
//     fontFamily: FONT_FAMILY.outfitBold,
//   },

//   // ── Feature Badges ──
//   badgesRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 20,
//     paddingHorizontal: 4,
//     paddingBottom: 10,
//   },
//   badge: {
//     flex: 1,
//     alignItems: 'center',
//     gap: 8,
//     paddingHorizontal: 4,
//   },
//   badgeIconCircle: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 2,
//   },
//   badgeBlue: {
//     backgroundColor: '#EEF3FF',
//   },
//   badgeGreen: {
//     backgroundColor: '#DCFCE7',
//   },
//   badgePurple: {
//     backgroundColor: '#F3EEFF',
//   },
//   badgeIconText: {
//     fontSize: 20,
//   },
//   badgeTitle: {
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.outfitBold,
//     color: '#1A2B4A',
//     textAlign: 'center',
//   },
//   badgeDesc: {
//     fontSize: 11,
//     fontFamily: FONT_FAMILY.outfitRegular,
//     color: '#94A3B8',
//     textAlign: 'center',
//     lineHeight: 15,
//   },
// });

// export default LoginScreen;

// NOTE: Login Screen Without Scroll
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../hooks/useAuthStore';
import { AuthError } from '../services/auth.service';
import { FONT_FAMILY } from '../theme/typography';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { login } = useAuthStore();

  // ── Animated values ──
  const headerY = useRef(new Animated.Value(-40)).current;
  const headerO = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(40)).current;
  const cardO = useRef(new Animated.Value(0)).current;
  const badgesY = useRef(new Animated.Value(40)).current;
  const badgesO = useRef(new Animated.Value(0)).current;
  const inputScale = useRef(new Animated.Value(1)).current;
  const errorO = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Mount animation
  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.spring(headerY, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(headerO, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(cardY, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(cardO, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(badgesY, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(badgesO, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Error shake animation
  const shakeX = useRef(new Animated.Value(0)).current;
  const triggerShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Error fade in
  useEffect(() => {
    if (fieldError || apiError) {
      triggerShake();
      Animated.timing(errorO, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(errorO, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [fieldError, apiError]);

  // Input focus animation
  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(inputScale, {
      toValue: 1.02,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };
  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(inputScale, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const digitPhone = phoneNumber.replace(/\D/g, '').slice(0, 10);
  const isPhoneValid = /^[0-9]{10}$/.test(digitPhone);

  const toAuthMessage = (error: unknown): string => {
    const err = error as Partial<AuthError>;
    if (err?.isCancelled) return 'Request was cancelled. Please try again.';
    if (typeof err?.message === 'string' && err.message.trim().length > 0)
      return err.message;
    return 'Failed to send OTP. Please try again.';
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(cleaned);
    if (fieldError) setFieldError('');
    if (apiError) setApiError('');
  };

  const handlePressIn = () =>
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  const handlePressOut = () =>
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();

  const handleLogin = async () => {
    if (!digitPhone) {
      setFieldError('Please enter your phone number.');
      return;
    }
    if (!isPhoneValid) {
      setFieldError('Please enter a valid 10-digit phone number.');
      return;
    }
    try {
      setIsLoading(true);
      setFieldError('');
      setApiError('');
      await login(digitPhone);
      navigation.navigate('OTP');
    } catch (error) {
      setApiError(toAuthMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1A6BFF"
        translucent
      />
      <KeyboardAvoidingView
        style={styles.scrollView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={styles.heroBand}>
              <View style={[styles.circle, styles.circleL]} />
              <View style={[styles.circle, styles.circleR]} />
              <View style={styles.dotGrid}>
                {Array.from({ length: 15 }).map((_, i) => (
                  <View key={i} style={styles.dot} />
                ))}
              </View>

              <Animated.View
                style={[
                  styles.heroContent,
                  { opacity: headerO, transform: [{ translateY: headerY }] },
                ]}
              >
                {/* Logo Row */}
                <View style={styles.logoRow}>
                  <View style={styles.logoIcon}>
                    <Text style={styles.logoIconText}>QV</Text>
                  </View>
                  <Text style={styles.logoLabel}>QuickVerse Transporter</Text>
                </View>

                {/* Title with wave emoji */}
                <View style={styles.titleRow}>
                  <Text style={styles.heroTitle}>Welcome back</Text>
                  <View style={styles.waveContainer}>
                    <Text style={styles.waveEmoji}>👋</Text>
                  </View>
                </View>
                <Text style={styles.heroSubtitle}>
                  Sign in to manage your deliveries
                </Text>
              </Animated.View>
            </View>

            <View style={styles.cardWrapper}>
              <Animated.View
                style={[
                  styles.card,
                  { opacity: cardO, transform: [{ translateY: cardY }] },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.phoneIconCircle}>
                    <Text style={styles.phoneIconEmoji}>📞</Text>
                  </View>
                  <View style={styles.sectionTextBlock}>
                    <Text style={styles.sectionLabel}>Mobile Number</Text>
                    <Text style={styles.sectionHint}>
                      We'll send a one-time password to verify your identity.
                    </Text>
                  </View>
                </View>

                <Animated.View
                  style={[
                    styles.inputWrapper,
                    isFocused && styles.inputWrapperFocused,
                    {
                      transform: [
                        { translateX: shakeX },
                        { scale: inputScale },
                      ],
                    },
                  ]}
                >
                  <View style={styles.countryBadge}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.countryCode}>+91</Text>
                    <View style={styles.divider} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Mobile Number"
                    placeholderTextColor="#C5CEDB"
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={10}
                  />
                  {phoneNumber.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setPhoneNumber('');
                        setFieldError('');
                      }}
                      style={styles.clearBtn}
                    >
                      <Text style={styles.clearBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>

                {(!!fieldError || !!apiError) && (
                  <Animated.View style={[styles.errorBox, { opacity: errorO }]}>
                    <Text style={styles.errorIcon}>⚠</Text>
                    <Text style={styles.errorText}>
                      {fieldError || apiError}
                    </Text>
                  </Animated.View>
                )}

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      (!isPhoneValid || isLoading) && styles.buttonDisabled,
                    ]}
                    onPress={handleLogin}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isLoading || !isPhoneValid}
                    activeOpacity={0.9}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Send OTP</Text>
                        <View style={styles.arrowCircle}>
                          <Text style={styles.buttonArrow}>→</Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                <View style={styles.secureDivider}>
                  <View style={styles.secureLine} />
                  <View style={styles.secureBadge}>
                    <Text style={styles.secureIcon}>🛡</Text>
                    <Text style={styles.secureText}>Secure & Trusted</Text>
                  </View>
                  <View style={styles.secureLine} />
                </View>

                <View style={styles.footerRow}>
                  <View style={styles.greenShieldBadge}>
                    <Text style={styles.greenShieldIcon}>✓</Text>
                  </View>
                  <Text style={styles.footerText}>
                    By continuing, you agree to our{' '}
                    <Text style={styles.footerLink}>Terms</Text> and{' '}
                    <Text style={styles.footerLink}>Privacy Policy</Text>.
                  </Text>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.badgesRow,
                  { opacity: badgesO, transform: [{ translateY: badgesY }] },
                ]}
              >
                <View style={styles.badge}>
                  <View style={[styles.badgeIconCircle, styles.badgeBlue]}>
                    <Text style={styles.badgeIconText}>🛡</Text>
                  </View>
                  <Text style={styles.badgeTitle}>Secure Login</Text>
                  <Text style={styles.badgeDesc}>Your data is protected</Text>
                </View>

                <View style={styles.badge}>
                  <View style={[styles.badgeIconCircle, styles.badgeGreen]}>
                    <Text style={styles.badgeIconText}>⚡</Text>
                  </View>
                  <Text style={styles.badgeTitle}>Quick Access</Text>
                  <Text style={styles.badgeDesc}>Get started in seconds</Text>
                </View>

                <View style={styles.badge}>
                  <View style={[styles.badgeIconCircle, styles.badgePurple]}>
                    <Text style={styles.badgeIconText}>🔒</Text>
                  </View>
                  <Text style={styles.badgeTitle}>Privacy First</Text>
                  <Text style={styles.badgeDesc}>We respect your privacy</Text>
                </View>
              </Animated.View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  heroBand: {
    backgroundColor: '#1A6BFF',
    paddingTop: 20,
    paddingBottom: 72,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circleL: {
    width: 200,
    height: 200,
    top: -70,
    left: -60,
  },
  circleR: {
    width: 150,
    height: 150,
    bottom: -50,
    right: -30,
  },

  dotGrid: {
    position: 'absolute',
    top: 12,
    right: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 60,
    gap: 8,
    opacity: 0.35,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },

  heroContent: {
    zIndex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoIconText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoLabel: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 34,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#FFFFFF',
  },
  waveContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveEmoji: {
    fontSize: 22,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 22,
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#1A6BFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F0F4FB',
  },

  cardWrapper: {
    paddingHorizontal: 16,
    marginTop: -40,
    zIndex: 10,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 26,
    shadowColor: '#0A1730',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 10,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
    gap: 14,
  },
  phoneIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  phoneIconEmoji: {
    fontSize: 22,
  },
  sectionTextBlock: {
    flex: 1,
    paddingTop: 2,
  },
  sectionLabel: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#7A8699',
    lineHeight: 19,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DDE5F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFD',
    paddingHorizontal: 4,
    height: 60,
    marginBottom: 4,
  },
  inputWrapperFocused: {
    borderColor: '#1A6BFF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A6BFF',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  flagEmoji: {
    fontSize: 18,
  },
  countryCode: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1A2B4A',
  },
  divider: {
    width: 1.5,
    height: 22,
    backgroundColor: '#DDE5F0',
    marginLeft: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#121A2B',
    paddingVertical: 0,
    letterSpacing: 2,
  },
  clearBtn: {
    padding: 10,
    marginRight: 4,
  },
  clearBtnText: {
    fontSize: 13,
    color: '#94A3B8',
  },

  // ── Error Box ──
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  errorIcon: {
    fontSize: 13,
    color: '#E11D48',
    marginTop: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#BE123C',
    lineHeight: 18,
  },

  button: {
    marginTop: 18,
    backgroundColor: '#1A6BFF',
    borderRadius: 16,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#1A6BFF',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#C5D8F8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    letterSpacing: 0.3,
  },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONT_FAMILY.outfitRegular,
  },

  secureDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    gap: 8,
  },
  secureLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEF2F8',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  secureIcon: {
    fontSize: 13,
    color: '#94A3B8',
  },
  secureText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    letterSpacing: 0.3,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greenShieldBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  greenShieldIcon: {
    fontSize: 13,
    color: '#16A34A',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    lineHeight: 18,
  },
  footerLink: {
    color: '#1A6BFF',
    fontFamily: FONT_FAMILY.outfitBold,
  },

  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  badge: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  badgeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  badgeBlue: {
    backgroundColor: '#EEF3FF',
  },
  badgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  badgePurple: {
    backgroundColor: '#F3EEFF',
  },
  badgeIconText: {
    fontSize: 20,
  },
  badgeTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1A2B4A',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 15,
  },
});

export default LoginScreen;
