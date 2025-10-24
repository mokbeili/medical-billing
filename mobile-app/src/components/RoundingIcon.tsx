import * as React from "react";
import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";

const RoundingIcon = ({ size = 128, color = "#000" }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    // xmlns="http://www.w3.org/2000/svg"
  >
    <Circle cx="70" cy="70" r="15" fill="#3c1a5b" />
    <Circle cx="120" cy="60" r="20" fill="#3c1a5b" />
    <Rect x="55" y="85" width="30" height="40" rx="12" fill="#3c1a5b" />
    <Rect x="100" y="80" width="40" height="58" rx="17" fill="#3c1a5b" />
    <Path
      d="M40 130
        A40 40 0 0 1 165 45"
      fill="none"
      stroke="#3c1a5b"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <Polygon points="173,59 153,50 172,35" fill="#3c1a5b" />
    <Path
      d="M165 45
        A40 40 0 0 1 40 130"
      fill="none"
      stroke="#3c1a5b"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <Polygon points="37,127 60,135 43,154" fill="#3c1a5b" />
  </Svg>
);

export default RoundingIcon;
