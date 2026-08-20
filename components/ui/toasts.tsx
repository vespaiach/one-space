"use client";

import * as stylex from "@stylexjs/stylex";
import type React from "react";
import { colors, shadow, space } from "@/styles/tokens.stylex";

const styles = stylex.create({
  toastContainer: {
    position: "fixed",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    maxWidth: "calc(-40px + 100vw)",
    pointerEvents: "none",
    top: "20px",
    right: "20px",
  },

  errorToast: {
    pointerEvents: "auto",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    gap: space.s3,
    alignItems: "flex-start",
    padding: space.s5,
    background: colors.card,
    border: "1px solid rgb(237, 226, 207)",
    borderRadius: "12px",
    boxShadow: shadow.lg,
    transition: "transform 0.26s, opacity 0.26s",
    animation: "0.3s cubic-bezier(0.2, 0.85, 0.3, 1) 0s 1 normal none running tw-in-right",
    transform: "translateX(0px)",
    opacity: 1,
  },
});

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="toast-container"
      {...styles.toastContainer}>
      {children}
    </div>
  );
}

export function ErrorToast({ title, message }: { title: string; message?: string }) {
  return (
    <div className="bg-red-500 text-white p-4 rounded shadow-md">
      <strong>{title}</strong>
      {message && <p>{message}</p>}
    </div>
  );
}