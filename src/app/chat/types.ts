export type Message = {
  id: string;
  sender_id: string;
  receiver_id?: string;
  message: string;
  isRead?: boolean;
  created_at: string;
  isEphemeral?: boolean;
};

export type UserProfile = {
  id: string;
  email: string;
  is_active: boolean;
  lastSeen?: string;
  publicKey?: string;
};
