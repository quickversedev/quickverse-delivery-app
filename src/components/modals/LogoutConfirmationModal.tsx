import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { LogOut } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';

type LogoutConfirmationModalProps = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Logout Icon Header */}
              <View style={styles.iconWrap}>
                <LogOut size={28} color="#DC2626" strokeWidth={2.5} />
              </View>

              <Text style={styles.title}>Logout confirmation</Text>
              <Text style={styles.message}>
                Are you sure you want to logout?
              </Text>

              {/* Decorative Divider */}
              <View style={styles.divider} />

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.button,
                    styles.cancelButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.cancelText}>No</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    styles.button,
                    styles.confirmButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.confirmText}>Yes</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 23, 48, 0.7)', // Slightly darker overlay for focus
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 32, // More rounded corners per screenshot
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2', // Light red tint
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0D1526',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#F1F5F9',
    marginTop: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 54, // Taller buttons
    borderRadius: 18, // Pill-style rounding
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#EFF4FF', // Soft blue tint
  },
  confirmButton: {
    backgroundColor: '#1A6BFF', // Primary blue
  },
  cancelText: {
    color: '#123A7A',
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }], // Subtle feedback
  },
});

export default LogoutConfirmationModal;
