export const playNotificationSound = () => {
    // Check for context to avoid errors in environments where it might not be available.
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
        console.warn("Web Audio API is not supported in this browser.");
        return;
    }

    try {
        const audioContext = new AudioContext();

        // Create an oscillator node to generate the sound wave.
        const oscillator = audioContext.createOscillator();
        // Create a gain node to control the volume.
        const gainNode = audioContext.createGain();

        // Connect the oscillator to the gain node, and the gain node to the output.
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configure the sound
        oscillator.type = 'triangle'; // 'sine', 'square', 'sawtooth', 'triangle'
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 pitch, a bit higher than a standard beep.
        
        // Control the volume to avoid a harsh click at the start/end
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05); // Fade in quickly
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5); // Fade out

        // Start and stop the sound
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5); // Play for 0.5 seconds

    } catch (error) {
        console.error("Could not play notification sound:", error);
    }
};
