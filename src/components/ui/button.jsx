import "./button.css";

export function Button({ children, className = "", onClick, ...props }) {
  return (
    <button className={`button ${className}`} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
