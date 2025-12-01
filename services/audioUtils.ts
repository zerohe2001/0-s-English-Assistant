export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function convertFloat32ToInt16(float32Array: Float32Array): Promise<ArrayBuffer> {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to range [-1, 1] then scale to Int16
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array.buffer;
}

// Resample audio if context rate doesn't match target rate (16kHz for Gemini Input)
export async function downsampleBuffer(buffer: AudioBuffer, targetRate: number = 16000): Promise<Float32Array> {
  if (buffer.sampleRate === targetRate) {
    return buffer.getChannelData(0);
  }
  const ratio = buffer.sampleRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  const offsetResult = 0;
  const offsetBuffer = 0;
  
  // Linear interpolation simple implementation
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < newLength; i++) {
      const nextRatio = Math.floor(i * ratio);
      result[i] = channelData[nextRatio];
  }
  return result;
}
