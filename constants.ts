import { VoiceOption, ToneOption } from './types';

export const VOICES: VoiceOption[] = [
  { value: 'Kore', label: 'さくら (落ち着いた女性)' },
  { value: 'Puck', label: 'けんじ (明るい男性)' },
  { value: 'Charon', label: 'りょう (深みのある男性)' },
  { value: 'Fenrir', label: 'ひかり (優しい女性)' },
  { value: 'Zephyr', label: 'たくみ (穏やかな男性)' },
];

export const TONES: ToneOption[] = [
  { value: '', label: '通常' },
  { value: 'Say cheerfully: ', label: '陽気' },
  { value: 'Say energetically: ', label: 'エネルギッシュ' },
  { value: 'Say calmly: ', label: '穏やか' },
  { value: 'Say sadly: ', label: '悲しげ' },
  { value: 'Whisper: ', label: 'ささやき' },
];
