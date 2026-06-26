import React from 'react';
import { View, Text, StyleSheet, Image, Switch } from 'react-native';
import { FONT_FAMILY } from '../../theme/typography';

type Props = {
  name: string;
  id: string;
  type: string;
  isOnline: boolean;
  onToggleOnline: (value: boolean) => void;
  avatarUri?: string;
};

const ProfileHeader: React.FC<Props> = ({
  name,
  id,
  type,
  isOnline,
  onToggleOnline,
  avatarUri,
}) => (
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
    <View style={styles.right}>
      <Text style={[styles.onlineLabel, isOnline && styles.onlineLabelActive]}>
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </Text>
      <Switch
        value={isOnline}
        onValueChange={onToggleOnline}
        trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }}
        thumbColor={isOnline ? '#16A34A' : '#94A3B8'}
      />
    </View>
  </View>
);

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
