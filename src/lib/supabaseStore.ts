/**
 * Supabase wrapper for email subscriptions
 * Replaces kvStore.ts with PostgreSQL storage
 */

import { supabase, EmailSubscription } from "./supabase";
import { encrypt, decrypt, hashEmail, generateUnsubscribeToken } from "./encryption";

// Public subscription info (no email)
export interface Subscription {
  emailHash: string;
  reminderMinutes: number;
  launchId: string | null;
  siteIds: string[] | null;
  createdAt: Date;
}

// Decrypted subscription for cron job
export interface DecryptedSubscription {
  id: string;
  email: string;
  reminderMinutes: number;
  launchId: string | null;
  siteIds: string[] | null;
  unsubscribeToken: string;
  lastNotifiedAt: Date | null;
}

/**
 * Subscribe an email to launch alerts
 * @returns Unsubscribe token
 */
export async function createSubscription(
  email: string,
  reminderMinutes: number,
  launchId: string | null = null,
  siteIds: string[] | null = null
): Promise<{ success: boolean; unsubscribeToken?: string; error?: string }> {
  try {
    const emailHash = await hashEmail(email);
    const encryptedEmail = await encrypt(email);
    const unsubscribeToken = generateUnsubscribeToken();

    const insertData: Record<string, unknown> = {
      email_hash: emailHash,
      encrypted_email: encryptedEmail,
      reminder_minutes: reminderMinutes,
      launch_id: launchId,
      unsubscribe_token: unsubscribeToken,
    };
    if (siteIds) {
      insertData.site_ids = JSON.stringify(siteIds);
    }

    const { error } = await supabase.from("email_subscriptions").insert(insertData);

    if (error) {
      // Check for unique constraint violation (already subscribed)
      if (error.code === "23505") {
        return { success: false, error: "Email already subscribed" };
      }
      console.error("Failed to create subscription:", error);
      return { success: false, error: error.message };
    }

    return { success: true, unsubscribeToken };
  } catch (error) {
    console.error("Failed to create subscription:", error);
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Get subscription by email
 */
export async function getSubscription(email: string): Promise<Subscription | null> {
  try {
    const emailHash = await hashEmail(email);

    const { data, error } = await supabase
      .from("email_subscriptions")
      .select("*")
      .eq("email_hash", emailHash)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;

    const subscription = data as EmailSubscription;
    return {
      emailHash: subscription.email_hash,
      reminderMinutes: subscription.reminder_minutes,
      launchId: subscription.launch_id,
      siteIds: subscription.site_ids ? JSON.parse(subscription.site_ids) : null,
      createdAt: new Date(subscription.created_at),
    };
  } catch (error) {
    console.error("Failed to get subscription:", error);
    return null;
  }
}

/**
 * Check if an email is subscribed
 */
export async function isSubscribed(email: string): Promise<boolean> {
  try {
    const emailHash = await hashEmail(email);

    const { count, error } = await supabase
      .from("email_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("email_hash", emailHash)
      .eq("is_active", true);

    if (error) {
      console.error("Failed to check subscription:", error);
      return false;
    }

    return (count ?? 0) > 0;
  } catch (error) {
    console.error("Failed to check subscription:", error);
    return false;
  }
}

/**
 * Unsubscribe using token (hard delete — actually removes all data)
 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("email_subscriptions")
      .delete()
      .eq("unsubscribe_token", token)
      .eq("is_active", true)
      .select();

    if (error) {
      console.error("Failed to unsubscribe:", error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error("Failed to unsubscribe:", error);
    return false;
  }
}

/**
 * Get all active subscriptions (for cron job)
 * Returns subscriptions with decrypted emails
 */
export async function getAllActiveSubscriptions(): Promise<DecryptedSubscription[]> {
  try {
    const { data, error } = await supabase
      .from("email_subscriptions")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Failed to get subscriptions:", error);
      return [];
    }

    const subscriptions: DecryptedSubscription[] = [];

    for (const row of data as EmailSubscription[]) {
      try {
        const email = await decrypt(row.encrypted_email);
        subscriptions.push({
          id: row.id,
          email,
          reminderMinutes: row.reminder_minutes,
          launchId: row.launch_id,
          siteIds: row.site_ids ? JSON.parse(row.site_ids) : null,
          unsubscribeToken: row.unsubscribe_token,
          lastNotifiedAt: row.last_notified_at ? new Date(row.last_notified_at) : null,
        });
      } catch (decryptError) {
        console.error("Failed to decrypt email for subscription:", row.id);
      }
    }

    return subscriptions;
  } catch (error) {
    console.error("Failed to get all subscriptions:", error);
    return [];
  }
}

/**
 * Update last notified timestamp for a subscription
 */
export async function updateLastNotified(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("email_subscriptions")
      .update({ last_notified_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Failed to update last_notified_at:", error);
    }
  } catch (error) {
    console.error("Failed to update last_notified_at:", error);
  }
}

/**
 * Update subscription reminder time
 */
export async function updateSubscription(
  email: string,
  reminderMinutes: number
): Promise<boolean> {
  try {
    const emailHash = await hashEmail(email);

    const { data, error } = await supabase
      .from("email_subscriptions")
      .update({ reminder_minutes: reminderMinutes })
      .eq("email_hash", emailHash)
      .eq("is_active", true)
      .select();

    if (error) {
      console.error("Failed to update subscription:", error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error("Failed to update subscription:", error);
    return false;
  }
}
