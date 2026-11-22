import React from 'react';
import { View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { T } from '../theme/tokens';

interface GlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export const GlassView: React.FC<GlassViewProps> = ({
  children,
  style,
  borderRadius = T.rCard,
}) => {
  return (
    <View
      style={[
        styles.glass,
        { borderRadius },
        T.shadowCard,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  glass: {
    backgroundColor: T.glass,
    borderColor: T.border,
    borderWidth: 1,
    borderTopColor: T.borderTop,
    overflow: 'hidden',
  },
});
