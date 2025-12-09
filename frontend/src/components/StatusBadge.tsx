import React from "react";

export type BadgeVariant = "success" | "info" | "warning" | "neutral" | "error";

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  children,
  size = "sm",
}) => (
  <span className={`badge badge-${variant} badge-${size}`}>{children}</span>
);

