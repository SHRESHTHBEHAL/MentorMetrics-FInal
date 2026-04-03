interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  loading?: boolean;
}

export default function Button({ 
  variant = "primary", 
  loading, 
  children, 
  className = "",
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = "font-bold uppercase tracking-wider border-2 border-black transition-all active:translate-y-0.5 inline-flex items-center justify-center";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-black",
    secondary: "bg-white text-black hover:bg-gray-100",
    outline: "bg-transparent text-black hover:bg-black hover:text-white",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} px-6 py-2 ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}
