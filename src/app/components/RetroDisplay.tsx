"use client";

import { motion } from "framer-motion";

interface LEDTextProps {
  text: string;
  color?: "green" | "orange" | "blue" | "amber" | "red";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  glow?: boolean;
}

export function LEDText({
  text,
  color = "green",
  size = "md",
  className = "",
  glow = true,
}: LEDTextProps) {
  const colorClasses = {
    green: "text-mission-green",
    orange: "text-retro-orange",
    blue: "text-nasa-blue",
    amber: "text-amber",
    red: "text-red-500",
  };

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-3xl",
  };

  return (
    <span
      className={`
        font-mono uppercase tracking-wider
        ${colorClasses[color]}
        ${sizeClasses[size]}
        ${glow ? "led-text" : ""}
        ${className}
      `}
    >
      {text}
    </span>
  );
}

interface StatusIndicatorProps {
  status: "nominal" | "warning" | "critical" | "offline";
  label: string;
  blinking?: boolean;
}

export function StatusIndicator({
  status,
  label,
  blinking = false,
}: StatusIndicatorProps) {
  const statusColors = {
    nominal: "bg-mission-green",
    warning: "bg-amber",
    critical: "bg-retro-orange",
    offline: "bg-gray-500",
  };

  const statusLabels = {
    nominal: "NOMINAL",
    warning: "CAUTION",
    critical: "ALERT",
    offline: "OFFLINE",
  };

  return (
    <div className="flex items-center gap-3">
      <motion.div
        className={`w-3 h-3 rounded-full ${statusColors[status]} ${blinking ? "blink" : ""}`}
        style={{
          boxShadow:
            status !== "offline"
              ? `0 0 10px currentColor, 0 0 20px currentColor`
              : "none",
        }}
        animate={
          blinking
            ? {
                opacity: [1, 0.3, 1],
              }
            : {}
        }
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="flex flex-col">
        <span className="text-xs text-off-white/60 uppercase tracking-wider">
          {label}
        </span>
        <LEDText
          text={statusLabels[status]}
          color={
            status === "nominal"
              ? "green"
              : status === "warning"
                ? "amber"
                : status === "critical"
                  ? "orange"
                  : "blue"
          }
          size="sm"
          glow={status !== "offline"}
        />
      </div>
    </div>
  );
}

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  status?: "nominal" | "warning" | "critical" | "offline";
}

export function PanelHeader({ title, subtitle, status }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-nasa-blue/30 pb-3 mb-4">
      <div>
        <h3 className="font-mono text-lg uppercase tracking-wider text-off-white">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-off-white/50 mt-1">{subtitle}</p>
        )}
      </div>
      {status && (
        <div
          className={`
          w-2 h-2 rounded-full
          ${status === "nominal" ? "bg-mission-green" : ""}
          ${status === "warning" ? "bg-amber" : ""}
          ${status === "critical" ? "bg-retro-orange" : ""}
          ${status === "offline" ? "bg-gray-500" : ""}
          ${status !== "offline" ? "pulse-glow" : ""}
        `}
        />
      )}
    </div>
  );
}

interface DataRowProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export function DataRow({ label, value, unit, highlight = false }: DataRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-nasa-blue/10 last:border-0">
      <span className="text-sm text-off-white/60 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className={`font-mono ${highlight ? "text-mission-green led-text" : "text-off-white"}`}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-off-white/40">{unit}</span>}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: "green" | "orange" | "blue" | "amber";
  showPercentage?: boolean;
  height?: "sm" | "md" | "lg";
}

export function ProgressBar({
  value,
  max = 100,
  color = "green",
  showPercentage = true,
  height = "md",
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const colorClasses = {
    green: "bg-mission-green",
    orange: "bg-retro-orange",
    blue: "bg-nasa-blue",
    amber: "bg-amber",
  };

  const glowColors = {
    green: "0 0 10px rgba(0, 255, 65, 0.5)",
    orange: "0 0 10px rgba(255, 107, 53, 0.5)",
    blue: "0 0 10px rgba(11, 61, 145, 0.5)",
    amber: "0 0 10px rgba(255, 184, 0, 0.5)",
  };

  const heightClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex-1 bg-nasa-blue/20 rounded-full overflow-hidden ${heightClasses[height]}`}
      >
        <motion.div
          className={`h-full rounded-full ${colorClasses[color]}`}
          style={{ boxShadow: glowColors[color] }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      {showPercentage && (
        <span className="font-mono text-sm text-off-white/70 w-12 text-right">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

interface RetroButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "orange";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export function RetroButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
  className = "",
  type = "button",
}: RetroButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        px-6 py-3 font-mono text-sm uppercase tracking-wider
        border rounded transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === "primary" ? "retro-button text-off-white" : ""}
        ${variant === "secondary" ? "bg-transparent border-nasa-blue/50 text-nasa-blue hover:bg-nasa-blue/10" : ""}
        ${variant === "orange" ? "retro-button-orange text-off-white" : ""}
        ${className}
      `}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <motion.span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          Processing...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
