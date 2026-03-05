"use client";

import React, { useEffect } from "react";
import { useChat } from "../ChatContext";
import { ChatWindow } from "../ChatWindow";
import { useRouter } from "next/navigation";

export default function ChatRoomPage() {
  const {
    messages,
    inputMsg,
    setInputMsg,
    sendMessage,
    targetUser,
    user,
    onlineUsers,
    remoteTyping,
    webrtc,
    showEmojiPicker,
    setShowEmojiPicker,
    emojiPickerRef,
    messagesEndRef,
    availableUsers,
  } = useChat();
  const router = useRouter();

  useEffect(() => {
    // If we have availableUsers loaded and no targetUser is found, redirect back
    if (availableUsers.length > 0 && !targetUser) {
      router.push("/chat");
    }
  }, [availableUsers, targetUser, router]);

  const handleEmojiClick = (emojiData: any) => {
    setInputMsg((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  if (!targetUser) return null;

  return (
    <ChatWindow
      messages={messages.filter(
        (m) =>
          !m.isEphemeral &&
          (m.sender_id === targetUser.id || m.receiver_id === targetUser.id),
      )}
      inputMsg={inputMsg}
      setInputMsg={setInputMsg}
      sendMessage={sendMessage}
      targetUser={targetUser}
      user={user}
      onlineUsers={onlineUsers}
      remoteTyping={remoteTyping}
      initiateCall={webrtc.initiateCall}
      showEmojiPicker={showEmojiPicker}
      setShowEmojiPicker={setShowEmojiPicker}
      emojiPickerRef={emojiPickerRef}
      messagesEndRef={messagesEndRef}
      onEmojiClick={handleEmojiClick}
      onBack={() => router.push("/chat")}
    />
  );
}
