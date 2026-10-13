import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ParamList = {
  OrderWebView: { url: string; title?: string };
};

const OrderWebViewScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, 'OrderWebView'>>();
  const { url, title } = route.params;
  const webViewRef = useRef<WebView>(null);
  const [crashed, setCrashed] = useState(false);

  const handleReload = () => {
    setCrashed(false);
    webViewRef.current?.reload();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || 'Order Details'}
        </Text>
        <View style={styles.backButton} />
      </View>
      {crashed ? (
        <View style={styles.crashContainer}>
          <Text style={styles.crashText}>Page failed to load</Text>
          <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.reloadText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webview}
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator size="large" color="#0E6DFD" style={styles.loader} />
          )}
          onRenderProcessGone={() => setCrashed(true)}
          onContentProcessDidTerminate={() => setCrashed(true)}
          onError={() => setCrashed(true)}
          {...(Platform.OS === 'android' && { androidLayerType: 'software' })}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  webview: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
  },
  crashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  crashText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
    marginBottom: 16,
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E6DFD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  reloadText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
  },
});

export default OrderWebViewScreen;
