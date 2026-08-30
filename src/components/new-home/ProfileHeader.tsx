import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Switch } from 'react-native';
import { FONT_FAMILY } from '../../theme/typography';

type Props = {
  name: string;
  id: string;
  type: string;
  isOnline: boolean;
  onToggleOnline: (value: boolean) => void;
  avatarUri?: string;
  isActive?: boolean;
};

const ProfileHeader: React.FC<Props> = ({
  name,
  id,
  type,
  isOnline,
  onToggleOnline,
  avatarUri,
  isActive,
}) => {
  const [showDeactivatedWarning, setShowDeactivatedWarning] = useState(false);

  const handleToggle = (value: boolean) => {
    if (isActive === false) {
      setShowDeactivatedWarning(true);
      setTimeout(() => setShowDeactivatedWarning(false), 4000);
      return;
    }
    onToggleOnline(value);
  };

  return (
  <View style={styles.container}>
    <View style={styles.left}>
      <View style={styles.avatarWrapper}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>1</Text>
        </View>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{name.charAt(0)}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>
          ID: {id} • {type}
        </Text>
      </View>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <View style={styles.right}>
        <Text style={[styles.onlineLabel, isActive === false ? { color: '#EF4444' } : (isOnline && styles.onlineLabelActive)]}>
          {isActive === false ? 'DEACTIVATED' : (isOnline ? 'ONLINE' : 'OFFLINE')}
        </Text>
        <Switch
          value={isOnline}
          onValueChange={handleToggle}
        trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }}
        thumbColor={isOnline ? '#16A34A' : '#94A3B8'}
        />
      </View>
      {showDeactivatedWarning && (
        <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, padding: 8, borderRadius: 6, marginTop: 10, position: 'absolute', top: 40, right: 0, width: 220, zIndex: 10 }}>
          <Text style={{ color: '#EF4444', fontSize: 11, textAlign: 'center', fontFamily: 'Outfit-Medium' }}>
            You are deactivated by admin, can't go online, ask admin!
          </Text>
        </View>
      )}
    </View>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  levelBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    zIndex: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0E6DFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#0E6DFD',
  },
  avatarPlaceholder: {
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0E6DFD',
  },
  info: {
    flexShrink: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  meta: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
  },
  onlineLabelActive: {
    color: '#16A34A',
  },
});

export default ProfileHeader;
