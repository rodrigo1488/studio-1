export async function getMediaStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
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
