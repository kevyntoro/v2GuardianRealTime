import React from "react";

export default function Button({
  icon,
  children,
  onClick,
  onMouseDown,
  onMouseUp,
  onTouchStart,
  onTouchEnd,
  className = "",
  ...rest
}) {
  const handleMouseDown = (e) => {
    console.log("Button: onMouseDown triggered");
    if (onMouseDown) {
      onMouseDown(e);
    }
  };

  const handleMouseUp = (e) => {
    console.log("Button: onMouseUp triggered");
    if (onMouseUp) {
      onMouseUp(e);
    }
  };

  const handleTouchStart = (e) => {
    console.log("Button: onTouchStart triggered");
    if (onTouchStart) {
      onTouchStart(e);
    }
  };

  const handleTouchEnd = (e) => {
    console.log("Button: onTouchEnd triggered");
    if (onTouchEnd) {
      onTouchEnd(e);
    }
  };

  const handleClick = (e) => {
    console.log("Button: onClick triggered");
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`bg-gray-800 text-white rounded-full p-4 flex items-center gap-1 hover:opacity-90 ${className}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
