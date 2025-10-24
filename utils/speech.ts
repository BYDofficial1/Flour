
export const speak = (text: string) => {
    if ('speechSynthesis' in window) {
        // Stop any currently speaking utterances to prevent overlap
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Optional: Configure voice, rate, pitch
        utterance.lang = 'en-IN'; // Set language to Indian English for better pronunciation of names/currency
        utterance.pitch = 1;
        utterance.rate = 1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);
    } else {
        console.error("Sorry, your browser doesn't support text-to-speech.");
    }
};
