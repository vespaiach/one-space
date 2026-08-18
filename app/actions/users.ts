"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireSession } from "@/lib/auth/guards";
import { AvatarProcessingError } from "@/lib/avatar/processor";
import { updateProfileWithAvatar } from "@/lib/avatar/profile";
import { readRuntimeConfig } from "@/lib/config/env";
import { db } from "@/lib/db";
import {
  forceMemberPasswordReset,
  promoteMember,
  reinstateMember,
  suspendMember,
} from "@/lib/db/queries/member-management";

export async function updateProfile(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const avatarActionValue = String(formData.get("avatarAction") ?? "keep");
  if (!["keep", "replace", "remove"].includes(avatarActionValue)) {
    redirect(`/users/${targetUserId}/edit?error=invalid-avatar-intent`);
  }
  const avatarAction = avatarActionValue as "keep" | "replace" | "remove";
  const avatarFile = formData.get("avatarFile");
  if (avatarAction === "replace" && avatarFile instanceof File && avatarFile.size > 5 * 1024 * 1024) {
    redirect(`/users/${targetUserId}/edit?error=input-too-large`);
  }
  const avatar =
    avatarAction === "replace" && avatarFile instanceof File && avatarFile.size > 0
      ? { bytes: Buffer.from(await avatarFile.arrayBuffer()), contentType: avatarFile.type }
      : undefined;
  let result: Awaited<ReturnType<typeof updateProfileWithAvatar>>;
  try {
    result = await updateProfileWithAvatar(db, {
      storagePath: readRuntimeConfig().avatarStoragePath,
      actor: { userId: actor.userId, role: actor.role },
      targetUserId,
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
      slackHandle: String(formData.get("slackHandle") ?? ""),
      avatarAction,
      avatar,
    });
  } catch (error) {
    const code = error instanceof AvatarProcessingError ? error.code : "save-failed";
    redirect(`/users/${targetUserId}/edit?error=${code}`);
  }
  if (result.status !== "updated") {
    const field = "field" in result ? `&field=${result.field}` : "";
    redirect(`/users/${targetUserId}/edit?error=${result.status}${field}`);
  }
  revalidatePath("/users");
  revalidatePath(`/users/${targetUserId}`);
  redirect(`/users/${targetUserId}?updated=true`);
}

async function runMemberTransition(
  formData: FormData,
  transition: typeof suspendMember,
  success: string,
): Promise<void> {
  const admin = await requireAdmin();
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const result = await transition(db, admin.userId, targetUserId);
  revalidatePath("/users");
  revalidatePath(`/users/${targetUserId}`);
  redirect(`/users/${targetUserId}?result=${result.status === "updated" ? success : "conflict"}`);
}

export async function suspendUser(formData: FormData): Promise<void> {
  return runMemberTransition(formData, suspendMember, "suspended");
}

export async function reinstateUser(formData: FormData): Promise<void> {
  return runMemberTransition(formData, reinstateMember, "reinstated");
}

export async function forcePasswordReset(formData: FormData): Promise<void> {
  return runMemberTransition(formData, forceMemberPasswordReset, "forced-reset");
}

export async function promoteToAdmin(formData: FormData): Promise<void> {
  return runMemberTransition(formData, promoteMember, "promoted");
}