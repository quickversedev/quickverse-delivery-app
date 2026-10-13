import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';
import deliveryPartnerService from '../../services/delivery-partner.service';
import useAuthStore from '../../hooks/useAuthStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
};

const NotificationSettingsModal: React.FC<Props> = ({ visible, onClose, onSaveSuccess }) => {
  const { authData, partnerProfile } = useAuthStore();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // For custom animated toggle
  const toggleAnim = React.useRef(new Animated.Value(0)).current;

  // For swipe-down-to-close animation
  const translateY = React.useRef(new Animated.Value(0)).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10; // Only capture if moving down
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Swipe down threshold crossed, close modal
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          // Reset position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Reset position and state when modal opens
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      setErrorMsg('');
      fetchSettings();
    }
  }, [visible]);

  // Sync animation with isEnabled
  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: isEnabled ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isEnabled]);

  const fetchSettings = async () => {
    if (!authData?.partnerId) return;
    try {
      const settings = await deliveryPartnerService.getNotificationSettings(authData.partnerId);
      setIsEnabled(settings.liveOrderPoolNotifications ?? true);
    } catch (e) {
      // Fallback
      console.log('Failed to fetch settings', e);
    }
  };

  const handleSave = async () => {
    if (!authData?.partnerId) return;
    setIsSaving(true);
    setErrorMsg('');
    try {
      await deliveryPartnerService.updateNotificationSettings(authData.partnerId, {
        liveOrderPoolNotifications: isEnabled,
      });
      onClose();
      onSaveSuccess();
    } catch (e) {
      console.error('Failed to update settings', e);
      setErrorMsg('Failed! Try again');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = () => {
    setIsEnabled(prev => !prev);
    setErrorMsg('');
  };

  const trackColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E2E8F0', '#1D6BFC'],
  });

  const thumbPosition = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTapArea} onPress={onClose} activeOpacity={1} />
        
        <Animated.View
          style={[styles.modalContainer, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <Text style={styles.title}>Notification Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Live Order Pool Notifications</Text>
              <Text style={styles.settingSubtitle}>
                Get real-time alerts for new orders in your area.
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={handleToggle}>
              <Animated.View style={[styles.toggleTrack, { backgroundColor: trackColor }]}>
                <Animated.View style={[styles.toggleThumb, { transform: [{ translateX: thumbPosition }] }]} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {!!errorMsg && (
            <Text style={styles.errorText}>{errorMsg}</Text>
          )}

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  overlayTapArea: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 16,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#1D6BFC',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    textAlign: 'center',
    marginBottom: 16,
  }
});

export default NotificationSettingsModal;
