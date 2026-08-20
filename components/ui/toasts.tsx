"use client";

import * as stylex from "@stylexjs/stylex";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CircleExclamation, TriangleExclamation } from "@/components/icons/exclamations";
import Tick from "@/components/icons/tick";
import X from "@/components/icons/x";
import { colors, radius, shadow, space } from "@/styles/tokens.stylex";

const twInRight = stylex.keyframes({
  "0%": { transform: "translateX(120%)", opacity: 0 },
  "100%": { transform: "translateX(0)", opacity: 1 },
});

const styles = stylex.create({
  toastContainer: {
    position: "fixed",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "340px",
    maxWidth: "calc(-40px + 100vw)",
    pointerEvents: "none",
    top: "20px",
    right: "20px",
  },

  toastPanel: {
    pointerEvents: "auto",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    gap: space.s3,
    alignItems: "flex-start",
    padding: space.s5,
    backgroundColor: colors.card,
    border: "1px solid rgb(237, 226, 207)",
    borderRadius: "12px",
    boxShadow: shadow.lg,
    transition: "transform 0.26s, opacity 0.26s",
    animationName: twInRight,
    animationDuration: "0.3s",
    animationTimingFunction: "cubic-bezier(0.2, 0.85, 0.3, 1)",
    animationIterationCount: 1,
    animationFillMode: "both",
    transform: "translateX(0px)",
    opacity: 1,
  },

  toastIconWrap: (type: "success" | "error" | "info" | "warning") => ({
    flex: "0 0 auto",
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color:
      type === "success"
        ? colors.success
        : type === "error"
          ? colors.destructive
          : type === "info"
            ? colors.info
            : type === "warning"
              ? colors.warning
              : colors.textBody,
    backgroundColor:
      type === "success"
        ? colors.successBackground
        : type === "error"
          ? colors.destructiveBackground
          : type === "info"
            ? colors.infoBackground
            : type === "warning"
              ? colors.warningBackground
              : colors.card,
  }),

  dismissButton: {
    flex: "0 0 auto",
    width: "24px",
    height: "24px",
    margin: "-2px -2px 0px 0px",
    borderWidth: "medium",
    borderStyle: "none",
    borderColor: "currentcolor",
    borderImage: "none",
    borderRadius: radius.sm,
    backgroundColor: "transparent",
    color: colors.textFaint,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  title: {
    fontSize: "13.5px",
    fontWeight: 700,
    color: "rgb(51, 38, 28)",
    letterSpacing: "-0.01em",
    marginBottom: "2px",
  },

  message: (type: "success" | "error" | "info" | "warning") => ({
    fontSize: "12.5px",
    lineHeight: "1.5",
    color:
      type === "success"
        ? colors.success
        : type === "error"
          ? colors.destructive
          : type === "info"
            ? colors.info
            : type === "warning"
              ? colors.warning
              : colors.textBody,
  }),
});

export function ToastContainer() {
  return (
    <div
      id="toast-container"
      {...stylex.props(styles.toastContainer)}
    />
  );
}

function BaseToast({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "success" | "error" | "info" | "warning";
}) {
  const [hide, setHide] = useState(true);

  useEffect(() => {
    const container = document.getElementById("toast-container");
    if (!container) return;

    setHide(false);
    const timer = setTimeout(() => {
      setHide(true);
    }, 500000);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  let icon = null;
  switch (type) {
    case "success":
      icon = <Tick />;
      break;
    case "error":
      icon = <X />;
      break;
    case "info":
      icon = <CircleExclamation />;
      break;
    case "warning":
      icon = <TriangleExclamation />;
      break;
  }

  if (hide) return null;

  return createPortal(
    <div {...stylex.props(styles.toastPanel)}>
      <div {...stylex.props(styles.toastIconWrap(type))}>{icon}</div>
      <div>{children}</div>
      <button
        {...stylex.props(styles.dismissButton)}
        onClick={() => {
          setHide(true);
        }}>
        ×
      </button>
    </div>,
    document.getElementById("toast-container") ?? document.body,
  );
}

export function ErrorToast({ title, message }: { title: string; message: string }) {
  return (
    <BaseToast type="error">
      <h5 {...stylex.props(styles.title)}>{title}</h5>
      <p {...stylex.props(styles.message("error"))}>{message}</p>
    </BaseToast>
  );
}

export function SuccessToast({ title, message }: { title: string; message: string }) {
  return (
    <BaseToast type="success">
      <h5 {...styles.title}>{title}</h5>
      <p {...styles.message("success")}>{message}</p>
    </BaseToast>
  );
}

export function InfoToast({ title, message }: { title: string; message: string }) {
  return (
    <BaseToast type="info">
      <h5 {...styles.title}>{title}</h5>
      <p {...styles.message("info")}>{message}</p>
    </BaseToast>
  );
}

export function WarningToast({ title, message }: { title: string; message: string }) {
  return (
    <BaseToast type="warning">
      <h5 {...styles.title}>{title}</h5>
      <p {...styles.message("warning")}>{message}</p>
    </BaseToast>
  );
}