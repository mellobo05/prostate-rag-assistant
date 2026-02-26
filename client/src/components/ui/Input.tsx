import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    const inputId = id || React.useId();
    
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-foreground/80 ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-3 rounded-xl bg-white border-2 border-border
            text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10
            transition-all duration-200
            ${error ? "border-destructive focus:border-destructive focus:ring-destructive/10" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-sm text-destructive font-medium ml-1">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
