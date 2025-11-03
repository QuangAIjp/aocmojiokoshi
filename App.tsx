import React, { useState, useRef, useCallback } from 'react';
import { VOICES, TONES } from './constants';
import { VoiceOption, ToneOption } from './types';
import { generateSpeech } from "./services/geminiService.ts";
import { decode, decodeAudioData, createWavBlob } from './utils/audioUtils';

// アイコンコンポーネント
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6v4H9z" />
    </svg>
);

const ListenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
  </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
);

export default function App() {
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>(VOICES[0].value);
  const [selectedTone, setSelectedTone] = useState<string>(TONES[0].value);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleStopPlayback = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);
  
  const playAudio = useCallback(async (audioBytes: Uint8Array) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioContext = audioContextRef.current;

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    handleStopPlayback();

    const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => {
      setIsPlaying(false);
      if (audioSourceRef.current === source) {
          audioSourceRef.current = null;
      }
    };
    source.start(0);

    audioSourceRef.current = source;
    setIsPlaying(true);
  }, [handleStopPlayback]);

  const processAndSetAudio = (base64Audio: string) => {
    const audioBytes = decode(base64Audio);
    const pcmData = new Int16Array(audioBytes.buffer);
    const wavBlob = createWavBlob(pcmData, 24000, 1);
    setGeneratedAudioBlob(wavBlob);
    return audioBytes;
  };

  const handleGenerateSpeech = async () => {
    if (!text.trim() || isLoading || isPreviewLoading) return;

    setIsLoading(true);
    setError(null);
    setGeneratedAudioBlob(null);

    try {
      const base64Audio = await generateSpeech(text, selectedVoice, selectedTone);
      const audioBytes = processAndSetAudio(base64Audio);
      await playAudio(audioBytes);
    } catch (err) {
      setError('音声の生成に失敗しました。しばらくしてからもう一度お試しください。');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePreviewVoice = async () => {
    if (isLoading || isPreviewLoading) return;

    setIsPreviewLoading(true);
    setError(null);
    setGeneratedAudioBlob(null);

    const previewText = "こんにちは。こちらはAOC音声合成スタジオです。";

    try {
      const base64Audio = await generateSpeech(previewText, selectedVoice, selectedTone);
      const audioBytes = processAndSetAudio(base64Audio);
      await playAudio(audioBytes);
    } catch (err) {
      setError('音声の試聴に失敗しました。');
      console.error(err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedAudioBlob) return;
    const url = URL.createObjectURL(generatedAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aoc-speech.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
            AOC <span className="text-indigo-600">音声合成</span>スタジオ
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            AOCのAI技術で、テキストから自然な音声を生成します。
          </p>
        </header>

        <main className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200/80">
          <div className="space-y-6">
            <div>
              <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-2">
                テキスト入力
              </label>
              <textarea
                id="text-input"
                rows={6}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-300 placeholder-gray-400"
                placeholder="ここにテキストを入力してください..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 mb-2">
                音声の選択
              </label>
              <div className="flex items-center gap-3">
                <select
                  id="voice-select"
                  className="flex-grow bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-300 h-[46px]"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                >
                  {VOICES.map((voice: VoiceOption) => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handlePreviewVoice}
                  disabled={isLoading || isPreviewLoading}
                  className="flex-shrink-0 inline-flex items-center justify-center px-4 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-300 h-[46px] w-[90px]"
                  aria-label="選択した音声を試聴する"
                >
                  {isPreviewLoading ? <Spinner /> : <><ListenIcon /><span>試聴</span></>}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="tone-select" className="block text-sm font-medium text-gray-700 mb-2">
                トーンの選択
              </label>
              <select
                id="tone-select"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-300"
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value)}
              >
                {TONES.map((tone: ToneOption) => (
                  <option key={tone.value} value={tone.value}>
                    {tone.label}
                  </option>
                ))}
              </select>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <button
                onClick={handleGenerateSpeech}
                disabled={isLoading || isPreviewLoading || !text.trim()}
                className="sm:col-span-2 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors duration-300"
              >
                {isLoading ? (
                  <><Spinner /><span className="ml-3">生成中...</span></>
                ) : (
                  <><PlayIcon /><span>音声を生成</span></>
                )}
              </button>
               <button
                onClick={handleStopPlayback}
                disabled={!isPlaying}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
              >
                <StopIcon />
                <span>停止</span>
              </button>
            </div>
             <div className="pt-2">
                <button
                    onClick={handleDownload}
                    disabled={!generatedAudioBlob || isLoading || isPreviewLoading}
                    className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
                >
                    <DownloadIcon />
                    <span>ダウンロード</span>
                </button>
            </div>
          </div>
        </main>

        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} AOC Inc. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
