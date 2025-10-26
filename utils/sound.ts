export type SoundType = 'success' | 'error' | 'info';

export const playNotificationSound = (type: SoundType = 'info') => {
    // Check for context to avoid errors in environments where it might not be available.
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
        console.warn("Web Audio API is not supported in this browser.");
        return;
    }

    try {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);

        switch (type) {
            case 'success':
                oscillator.type = 'sine';
                // A short, pleasant, ascending two-tone chime
                oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.02);
                oscillator.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.20);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.20);
                break;
            case 'error':
                oscillator.type = 'sawtooth';
                // A short, low, dissonant buzz
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
                oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.15);
                gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.25);
                break;
            case 'info':
            default:
                oscillator.type = 'triangle';
                // A single, clean "blip"
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
        }
    } catch (error) {
        console.error("Could not play notification sound:", error);
    }
};