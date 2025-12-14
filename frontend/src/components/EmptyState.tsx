import React from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "📚",
  title,
  description,
  action,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button
          className="btn btn-primary"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

