export async function getMediaStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Media devices not supported. Please ensure you are using a secure context (HTTPS) or localhost.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: video ? { facingMode: 'user' } : false,
            audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
        });
        return stream;
    } catch (error) {
        console.error('Error getting media stream:', error);
        throw error;
    }
}

export function stopMediaStream(stream: MediaStream | null) {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
}
