import { createContext, useContext } from "react";
import "./radio-group.css";

const RadioGroupContext = createContext();

export function RadioGroup({
  value,
  onValueChange,
  children,
  className = "",
  ...props
}) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={`radio-group ${className}`} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export function RadioGroupItem({ value, name, ...props }) {
  const context = useContext(RadioGroupContext);

  const handleChange = (e) => {
    if (context?.onValueChange && e.target.checked) {
      context.onValueChange(value);
    }
  };

  return (
    <input
      type="radio"
      className="radio-item"
      value={value}
      name={name}
      checked={context?.value === value}
      onChange={handleChange}
      {...props}
    />
  );
}
