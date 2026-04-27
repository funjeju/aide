/**
 * @see docs/08_User_Flow_v0.1.md (FR-002 음성 입력, FR-003 텍스트 입력)
 * @see docs/09_Wireframe_v0.1.md (입력 모달)
 */
import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useInputStore } from '../../stores/useInputStore';
import { TrackToggle } from './TrackToggle';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function InputModal({ visible, onClose }: Props) {
  const { t } = useTranslation('input');
  const [text, setText] = useState('');
  const [inputTab, setInputTab] = useState<'voice' | 'text'>('voice');
  const { mode, state, draftId, submitText, reset } = useInputStore();
  const inputRef = useRef<TextInput>(null);

  function handleClose() {
    reset();
    setText('');
    onClose();
  }

  async function handleSubmitText() {
    if (!text.trim() || state === 'processing') return;
    await submitText(text.trim());
  }

  // Draft 생성 완료 → Draft 리뷰 화면으로
  if (state === 'done' && draftId) {
    handleClose();
    router.push(`/drafts/${draftId}`);
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 헤더 */}
        <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <Text className="text-lg font-bold text-text-primary">{t('title')}</Text>
          <TouchableOpacity onPress={handleClose} className="w-8 h-8 items-center justify-center">
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* 트랙 토글 */}
        <View className="px-5 py-3">
          <TrackToggle />
        </View>

        {/* 탭 전환 */}
        <View className="flex-row mx-5 bg-surface-2 rounded-xl p-1 mb-4">
          {(['voice', 'text'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setInputTab(tab)}
              className={`flex-1 py-2 rounded-lg items-center ${inputTab === tab ? 'bg-white shadow-sm' : ''}`}
            >
              <Text className={`text-sm font-medium ${inputTab === tab ? 'text-text-primary' : 'text-text-secondary'}`}>
                {tab === 'voice' ? t('voiceInput') : t('textInput')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {inputTab === 'text' ? (
          /* 텍스트 입력 */
          <View className="flex-1 px-5">
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              multiline
              placeholder={t('textPlaceholder')}
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-base text-text-primary font-pretendard leading-6"
              style={{ textAlignVertical: 'top', minHeight: 120 }}
              autoFocus
              maxLength={5000}
            />
            <View className="flex-row justify-between items-center py-3 border-t border-border">
              <Text className="text-xs text-text-tertiary">{text.length}/5000</Text>
              <TouchableOpacity
                onPress={handleSubmitText}
                disabled={!text.trim() || state === 'processing'}
                className={`px-6 py-3 rounded-xl ${!text.trim() || state === 'processing' ? 'bg-surface-2' : mode === 'WORK' ? 'bg-work' : 'bg-life'}`}
              >
                {state === 'processing' ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold text-sm">{t('submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* 음성 입력 */
          <VoiceInputPanel />
        )}

        {state === 'error' && (
          <Text className="mx-5 mb-4 text-sm text-urgent text-center">
            {useInputStore.getState().error}
          </Text>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function VoiceInputPanel() {
  const { t } = useTranslation('input');
  const { mode, state } = useInputStore();

  return (
    <View className="flex-1 items-center justify-center px-5">
      <TouchableOpacity
        className={`w-24 h-24 rounded-full items-center justify-center ${
          state === 'recording' ? 'bg-urgent' : mode === 'WORK' ? 'bg-work' : 'bg-life'
        }`}
        style={{ elevation: 8, shadowOpacity: 0.3, shadowRadius: 12 }}
      >
        <Ionicons
          name={state === 'recording' ? 'stop' : 'mic'}
          size={36}
          color="white"
        />
      </TouchableOpacity>
      <Text className="mt-4 text-sm text-text-secondary">
        {state === 'recording' ? t('recording') : state === 'processing' ? t('processing') : t('tapToRecord')}
      </Text>
    </View>
  );
}
