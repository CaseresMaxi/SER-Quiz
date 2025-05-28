import { useState } from "react";
import "./checkbox.css";

export function Checkbox({ checked, onCheckedChange, ...props }) {
  const handleChange = (e) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <input
      type="checkbox"
      className="checkbox"
      checked={checked}
      onChange={handleChange}
      {...props}
    />
  );
}
