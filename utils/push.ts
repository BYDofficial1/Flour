import { supabase } from './supabase';

// This VAPID public key is for the push notification service.
// In a real app, this should come from your environment variables.
const VAPID_PUBLIC_KEY = 'BPhgcyS8R3aB_a2d2l8yXCEV8CmJg41pDeJ-s2gq_GacVtF-vj2WrtNBx_yr2jU68_22ozt2u58H1s02Y9k9oPA';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeUser(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push messaging is not supported.');
    }

    const registration = await navigator.serviceWorker.ready;
    
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('Push notification permission was not granted.');
    }

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
        console.log('User is already subscribed.');
        return existingSubscription;
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user && subscription) {
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({ 
                user_id: user.id, 
                subscription: subscription.toJSON() 
            }, { onConflict: 'user_id' }); 
        
        if (error) {
            console.error('Failed to save subscription:', error);
            await subscription.unsubscribe();
            throw new Error('Failed to save push subscription. Ensure the `push_subscriptions` table exists with correct RLS policies.');
        }
    } else {
        throw new Error('User not authenticated or subscription failed.');
    }

    return subscription;
}

export async function unsubscribeUser(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from('push_subscriptions')
                .delete()
                .match({ user_id: user.id });

            if (error) {
                console.error('Failed to delete subscription from server:', error);
            }
        }
        
        await subscription.unsubscribe();
    }
}
