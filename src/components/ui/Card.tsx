// src/components/ui/Card.tsx
"use client";

import React from "react";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Optional header title */
  title?: React.ReactNode;
  /** Optional footer actions */
  footer?: React.ReactNode;
}

/**
 * Card component using design‑system tokens for background, shadow and radius.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  function Card({ title, footer, children, className = "", ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={`rb-card bg-card shadow-card rb-interactive-card ${className}`}
        {...rest}
      >
        {title && <div className="rb-card-header px-4 py-2 border-b border-rule">{title}</div>}
        <div className="rb-card-body p-4">{children}</div>
        {footer && <div className="rb-card-footer px-4 py-2 border-t border-rule">{footer}</div>}
      </div>
    );
  }
);

Card.displayName = "Card";
