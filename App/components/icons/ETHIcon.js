// components/icons/ETHIcon.js
import React from "react";
import Svg, { Path } from "react-native-svg";

export default function ETHIcon({ width = 24, height = 24 }) {
  return (
    <Svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path fill="#8FFCF3" d="M12 3v6.65l5.625 2.516z" />
      <Path fill="#CABCF8" d="m12 3-5.625 9.166L12 9.651z" />
      <Path fill="#CBA7F5" d="M12 16.477v4.522l5.625-7.784z" />
      <Path fill="#74A0F3" d="M12 21v-4.523l-5.625-3.262z" />
      <Path fill="#CBA7F5" d="m12 15.43 5.625-3.263L12 9.65z" />
      <Path fill="#74A0F3" d="M6.375 12.167 12 15.429V9.651z" />
      <Path fill="#202699" fillRule="evenodd" clipRule="evenodd" d="m12 15.429-5.625-3.263L12 3l5.625 9.166zM6.749 11.9l5.16-8.41v6.115zm-.077.23 5.238-2.327v5.364zm5.418-2.327v5.364l5.233-3.038zm0-.198 5.16 2.295-5.16-8.41z" />
      <Path fill="#202699" fillRule="evenodd" clipRule="evenodd" d="M12 16.406 6.375 13.21 12 21l5.625-7.79zm-4.995-2.633 4.905 2.79v4.005zm5.085 2.79v4.005l4.905-6.795z" />
    </Svg>
  );
}
