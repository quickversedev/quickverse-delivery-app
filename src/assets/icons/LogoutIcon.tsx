import React from 'react';
import Svg, { Path } from 'react-native-svg';

type LogoutIconProps = {
  size?: number;
  color?: string;
};

const LogoutIcon: React.FC<LogoutIconProps> = ({
  size = 18,
  color = '#0E6DFD',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 3H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H15"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 12H10"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 9L19 12L16 15"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default LogoutIcon;
