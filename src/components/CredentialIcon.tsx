import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { resolveBrand, extractHostname } from '../data/brands';
import { IconCacheService } from '../services/IconCacheService';

export interface CredentialIconProps {
  name?: string;
  url?: string;
  androidPackage?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  customColor?: string;
  customLetter?: string;
  style?: any;
}

// ── Stable Deterministic Color Palette ──────────────────────────────────────
const STABLE_PALETTE = [
  '#06d6a0', // emerald
  '#118ab2', // cyan-blue
  '#073b4c', // deep ocean
  '#f5a623', // warm amber
  '#ef476f', // coral pink
  '#7209b7', // royal purple
  '#3a0ca3', // indigo
  '#4361ee', // electric blue
  '#4cc9f0', // sky blue
  '#f72585', // magenta
  '#f3722c', // vibrant orange
  '#2a9d8f', // sage teal
  '#e76f51', // terracotta
  '#8338ec', // neon violet
  '#3a86ff', // cobalt
  '#10b981', // mint green
];

export function getStableColor(name?: string): string {
  if (!name || !name.trim()) return '#06d6a0';
  const clean = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % STABLE_PALETTE.length;
  return STABLE_PALETTE[idx];
}

export function getCleanInitial(name?: string): string {
  if (!name || !name.trim()) return '?';
  // Strip non-alphanumeric leading symbols/emojis
  const clean = name.trim().replace(/^[^a-zA-Z0-9]+/, '');
  return (clean.charAt(0) || name.trim().charAt(0) || '?').toUpperCase();
}

const CredentialIconBase: React.FC<CredentialIconProps> = ({
  name,
  url,
  androidPackage,
  size = 'md',
  customColor,
  customLetter,
  style,
}) => {
  // Dimensions resolution
  const { boxSize, iconSize, fontSize, borderRadius } = useMemo(() => {
    let px = 40;
    if (typeof size === 'number') {
      px = size;
    } else {
      switch (size) {
        case 'xs':
          px = 24;
          break;
        case 'sm':
          px = 32;
          break;
        case 'md':
          px = 40;
          break;
        case 'lg':
          px = 52;
          break;
        case 'xl':
          px = 68;
          break;
      }
    }
    return {
      boxSize: px,
      iconSize: Math.max(12, Math.round(px * 0.54)),
      fontSize: Math.max(10, Math.round(px * 0.44)),
      borderRadius: Math.max(6, Math.round(px * 0.28)),
    };
  }, [size]);

  // STEP 1: RESOLVE THE BRAND (no network)
  const matchedBrand = useMemo(() => {
    return resolveBrand({ name, url, androidPackage });
  }, [name, url, androidPackage]);

  // STEP 2: OPTIONAL ONLINE ICON (off by default)
  const [onlineIconUrl, setOnlineIconUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Only attempt online fetch if NO bundled brand matched and a real domain is known
    if (matchedBrand) {
      setOnlineIconUrl(null);
      return;
    }

    const domain = IconCacheService.sanitizeDomainOnly(url);
    if (!domain) {
      setOnlineIconUrl(null);
      return;
    }

    IconCacheService.isOnlineIconsEnabled().then((enabled) => {
      if (!isMounted || !enabled) return;

      IconCacheService.resolveOnlineIcon(domain).then((uri) => {
        if (isMounted && uri) {
          setOnlineIconUrl(uri);
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [matchedBrand, url]);

  // STEP 3: LETTER FALLBACK
  const stableColor = customColor || (matchedBrand ? matchedBrand.brandColor : getStableColor(name));
  const letter = customLetter || getCleanInitial(name);

  // 1. Bundled Brand Logo (Zero Network)
  if (matchedBrand) {
    return (
      <View
        style={[
          s.container,
          {
            width: boxSize,
            height: boxSize,
            borderRadius,
            backgroundColor: `${matchedBrand.brandColor}1c`,
            borderColor: `${matchedBrand.brandColor}38`,
          },
          style,
        ]}
      >
        <Svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={matchedBrand.brandColor}
        >
          <Path d={matchedBrand.svgPath} />
        </Svg>
      </View>
    );
  }

  // 2. Online Favicon (If enabled, fetched, and not in error state)
  if (onlineIconUrl && !imgError) {
    return (
      <View
        style={[
          s.container,
          {
            width: boxSize,
            height: boxSize,
            borderRadius,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
          },
          style,
        ]}
      >
        <Image
          source={{ uri: onlineIconUrl }}
          style={{ width: iconSize, height: iconSize, borderRadius: 4 }}
          resizeMode="contain"
          onError={() => {
            setImgError(true);
            const domain = extractHostname(url);
            if (domain) {
              IconCacheService.markNoIcon(domain);
            }
          }}
        />
      </View>
    );
  }

  // 3. Fallback: Coloured circle with stable hash letter
  return (
    <View
      style={[
        s.container,
        {
          width: boxSize,
          height: boxSize,
          borderRadius,
          backgroundColor: `${stableColor}20`,
          borderColor: `${stableColor}45`,
        },
        style,
      ]}
    >
      <Text
        style={[
          s.letter,
          {
            color: stableColor,
            fontSize,
          },
        ]}
      >
        {letter}
      </Text>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  letter: {
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
});

// Memoized for smooth 60fps scrolling in large lists
export const CredentialIcon = React.memo(CredentialIconBase);
