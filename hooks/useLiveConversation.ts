
import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { TranscriptionTurn } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

// Constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

export const useLiveConversation = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionTurn[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartTime = useRef(0);
    const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());

    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');

    const startConversation = useCallback(async () => {
        if (isRecording || isConnecting) return;
        
        setIsConnecting(true);
        setError(null);
        setTranscriptionHistory([]);
        currentInputTranscription.current = '';
        currentOutputTranscription.current = '';

        try {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY environment variable not set");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        setIsRecording(true);
                        
                        const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        mediaStreamSourceRef.current = source;
                        
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(BUFFER_SIZE, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            
                            // FIX: Improved performance of PCM blob creation.
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }

                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                            };
                            
                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcription
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                        }

                        if(message.serverContent?.turnComplete) {
                            // FIX: Batched state updates to avoid race conditions.
                            const userInput = currentInputTranscription.current.trim();
                            const modelOutput = currentOutputTranscription.current.trim();
                            const timestamp = Date.now();

                            if (userInput || modelOutput) {
                                setTranscriptionHistory(prev => {
                                    const newTurns: TranscriptionTurn[] = [];
                                    if (userInput) {
                                        newTurns.push({id: `${timestamp}-user`, type: 'user', text: userInput});
                                    }
                                    if (modelOutput) {
                                        newTurns.push({id: `${timestamp}-model`, type: 'model', text: modelOutput});
                                    }
                                    return [...prev, ...newTurns];
                                });
                            }
                            
                            currentInputTranscription.current = '';
                            currentOutputTranscription.current = '';
                        }

                        // Handle audio playback
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            const audioBuffer = await decodeAudioData(
                                decode(base64Audio),
                                outputAudioContextRef.current!,
                                OUTPUT_SAMPLE_RATE,
                                1
                            );
                            
                            const now = outputAudioContextRef.current!.currentTime;
                            nextStartTime.current = Math.max(now, nextStartTime.current);

                            const sourceNode = outputAudioContextRef.current!.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(outputAudioContextRef.current!.destination);
                            
                            sourceNode.addEventListener('ended', () => audioSources.current.delete(sourceNode));
                            audioSources.current.add(sourceNode);

                            sourceNode.start(nextStartTime.current);
                            nextStartTime.current += audioBuffer.duration;
                        }

                        if (message.serverContent?.interrupted) {
                            audioSources.current.forEach(source => source.stop());
                            audioSources.current.clear();
                            nextStartTime.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Live session error:", e);
                        setError("An error occurred during the conversation. Please try again.");
                        stopConversation();
                    },
                    onclose: () => {
                        stopConversation();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });
        } catch (err: any) {
            console.error("Failed to start conversation:", err);
            setError(err.message || "Failed to get microphone permissions.");
            setIsConnecting(false);
        }
    }, [isRecording, isConnecting]);

    const stopConversation = useCallback(() => {
        if (!isRecording && !isConnecting) return;
        
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        
        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);

        audioSources.current.forEach(source => source.stop());
        audioSources.current.clear();
        nextStartTime.current = 0;
        
        setIsRecording(false);
        setIsConnecting(false);
    }, [isRecording, isConnecting]);

    return { isRecording, isConnecting, transcriptionHistory, error, startConversation, stopConversation };
};
