import { initializeApp } from 'firebase/app';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, 
  User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, sendPasswordResetEmail, sendEmailVerification
} from 'firebase/auth';
import { 
  initializeFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, 
  collection, query, where, getDocs, serverTimestamp, getDocFromServer, 
  onSnapshot, orderBy, limit, increment, memoryLocalCache 
} from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
}, firebaseConfig.firestoreDatabaseId);
export const rtdb = getDatabase(app, (import.meta as any).env.VITE_FIREBASE_DATABASE_URL);
export const storage = getStorage(app, firebaseConfig.storageBucket);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const googleProvider = new GoogleAuthProvider();

// Validation connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.warn("User closed the login popup.");
      return null;
    }
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, sendEmailVerification };

export interface UserService {
  id: string;
  title: string;
  description: string;
  price?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  nameLower?: string;
  searchKeywords?: string[];
  email: string | null;
  photoURL: string | null;
  role: 'farmer' | 'veterinarian' | 'engineer' | 'supplier' | 'admin' | 'trader';
  professionalStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  bio?: string;
  specialization?: string;
  wilaya?: string;
  commune?: string;
  phone?: string;
  isVerified?: boolean;
  isBlocked?: boolean;
  createdAt: any;
  lastSeen: any;
  followersCount?: number;
  followingCount?: number;
  services?: UserService[];
}

export interface ProfessionalApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedRole: 'veterinarian' | 'engineer' | 'supplier' | 'trader';
  specialization: string;
  bio: string;
  phone: string;
  wilaya: string;
  commune: string;
  fileUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  resolvedAt?: any;
}

export interface ServiceRequest {
  id: string;
  requesterId: string;
  providerId: string;
  serviceType: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  date: string;
  details: string;
  createdAt: any;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  type: 'crop' | 'livestock' | 'topic';
  creatorId: string;
  createdAt: any;
  memberCount: number;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  title: string;
  content: string;
  attachments?: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: any;
}

export interface CommunityComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: any;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  sellerId: string;
  category: string;
  stock?: number;
  createdAt: any;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  buyerId: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  shippingAddress: string;
  createdAt: any;
}

export interface Booking {
  id: string;
  expertId: string;
  expertName?: string;
  userId: string;
  userName?: string;
  date: string; // ISO string
  timeSlot: string; // e.g. "09:00"
  topic: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: any;
}

export interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  wilaya: string;
  timestamp: number;
}

export interface CallEvent {
  id: string;
  callerId: string;
  receiverId: string;
  status: 'calling' | 'ongoing' | 'ended' | 'missed';
  type: 'audio' | 'video';
  createdAt: any;
  signalData?: any;
}

// Search Optimization Helpers
const generateSearchKeywords = (str: string): string[] => {
  if (!str) return [];
  const normalized = str.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  const keywords = new Set<string>();

  words.forEach(word => {
    for (let i = 1; i <= word.length; i++) {
      keywords.add(word.substring(0, i));
    }
  });
  
  // Also add prefix of full name
  for (let i = 1; i <= normalized.length; i++) {
    keywords.add(normalized.substring(0, i));
  }
  
  return Array.from(keywords);
};

export const syncUserProfile = async (user: FirebaseUser, additionalData: Partial<UserProfile> = {}): Promise<UserProfile> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const existingData = userSnap.exists() ? userSnap.data() as UserProfile : null;

  const name = additionalData.displayName || user.displayName || existingData?.displayName || 'User';
  const nameLower = name.toLowerCase();
  const searchKeywords = generateSearchKeywords(name);

  // Preserve existing role if it exists, otherwise default to 'farmer'
  // Auto-promote specific emails to admin
  const ADMIN_EMAILS = ['abdellaouiriyad0@gmail.com'];
  const isAdminEmail = user.email && ADMIN_EMAILS.includes(user.email);
  
  let assignedRole: UserProfile['role'] = existingData?.role || additionalData.role || 'farmer';
  if (isAdminEmail) assignedRole = 'admin';

  if (!userSnap.exists()) {
    const initialProfile: UserProfile = {
      uid: user.uid,
      displayName: name,
      nameLower,
      searchKeywords,
      email: user.email,
      photoURL: user.photoURL,
      role: assignedRole,
      isVerified: false,
      wilaya: additionalData.wilaya || '',
      commune: additionalData.commune || '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    };

    // Filter out undefined and null from additionalData to prep for setDoc
    const cleanAdditional = Object.fromEntries(
      Object.entries(additionalData).filter(([_, v]) => v !== undefined && v !== null)
    );

    await setDoc(userRef, { ...initialProfile, ...cleanAdditional });
    // Initialize memory
    const memoryRef = doc(db, 'users', user.uid, 'memory', 'history');
    await setDoc(memoryRef, { recentSearches: [], visitedProfiles: [] });
    return { ...initialProfile, ...cleanAdditional } as UserProfile;
  }

  // Update logic: Only include keys that should actually change or be synced
  // Filter out undefined values from update payload
  const updatePayload: any = { 
    lastSeen: serverTimestamp(),
    nameLower,
    searchKeywords,
  };

  Object.entries(additionalData).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      updatePayload[k] = v;
    }
  });
  
  // Only send role if it's different from what's in DB to avoid unnecessary rule triggers
  if (assignedRole && existingData?.role !== assignedRole) {
    updatePayload.role = assignedRole;
  }

  await updateDoc(userRef, updatePayload);
  return { ...existingData, ...updatePayload } as UserProfile;
};

// Search Implementation
export interface SearchFilters {
  role?: string;
  wilaya?: string;
}

export const registerForPushNotifications = async (userId: string) => {
  if (!messaging) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { 
        vapidKey: (import.meta as any).env.VITE_FIREBASE_VAPID_KEY 
      });
      if (token) {
        await updateDoc(doc(db, 'users', userId), { fcmToken: token });
        return token;
      }
    }
  } catch (err) {
    console.error("FCM Token Error:", err);
  }
};

export const searchUsers = async (searchText: string, filters: SearchFilters = {}) => {
  const usersRef = collection(db, 'users');
  let q;

  const normalizedSearch = searchText.toLowerCase().trim();

  // If we have search text, use array-contains for partial matches (word-based)
  if (normalizedSearch) {
    q = query(usersRef, where('searchKeywords', 'array-contains', normalizedSearch));
  } else {
    q = query(usersRef);
  }

  // Apply filters manually or via Firestore if possible
  // Note: Firestore has limitations on multiple inequality filters on different fields.
  // For production, we usually filter secondary attributes in-memory if query is highly dynamic,
  // or create specific composite indexes for common combinations.
  
  const querySnapshot = await getDocs(q);
  let results = querySnapshot.docs.map(doc => doc.data() as UserProfile);

  // Client-side filtering for robust performance and less index overhead in dev
  if (filters.role && filters.role !== 'all') {
    results = results.filter(u => u.role === filters.role);
  }
  if (filters.wilaya && filters.wilaya !== 'all') {
    results = results.filter(u => u.wilaya === filters.wilaya);
  }

  return results;
};

// Global Profile Access
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

// Memory Helpers
export const recordVisit = async (myUid: string, visitedUid: string) => {
  const ref = doc(db, 'users', myUid, 'memory', 'history');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const history = snap.data();
    const visited = history.visitedProfiles || [];
    if (!visited.includes(visitedUid)) {
      const newVisited = [visitedUid, ...visited].slice(0, 5);
      await updateDoc(ref, { visitedProfiles: newVisited });
    }
  }
};

// Messaging Helpers
export const getChatId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

export const sendMessage = async (chatId: string, senderId: string, msg: { text?: string, type: 'text'|'voice'|'image', mediaUrl?: string }) => {
  const msgRef = collection(db, 'chats', chatId, 'messages');
  await setDoc(doc(msgRef), {
    ...msg,
    senderId,
    timestamp: serverTimestamp()
  });

  // Deriving receiverId for notification
  const [u1, u2] = chatId.split('_');
  const receiverId = u1 === senderId ? u2 : u1;
  
  const userDoc = await getDoc(doc(db, 'users', receiverId));
  const token = userDoc.exists() ? userDoc.data().fcmToken : null;
  
  if (token) {
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title: "AgroLife Chat",
        body: msg.text || (msg.type === 'voice' ? "New voice message" : "New image sharing"),
        data: { chatId, type: 'chat' }
      })
    }).catch(err => console.error("Notification Error:", err));
  }
};

// --- NEW PROFESSIONAL ENGAGEMENT FEATURES ---

// Professional Follow System
export const followUser = async (myUid: string, targetUid: string) => {
  const followingRef = doc(db, 'users', myUid, 'following', targetUid);
  const followerRef = doc(db, 'users', targetUid, 'followers', myUid);
  
  await setDoc(followingRef, { userId: targetUid, followedAt: serverTimestamp() });
  await setDoc(followerRef, { userId: myUid, followedAt: serverTimestamp() });

  // Update counts
  await updateDoc(doc(db, 'users', myUid), { followingCount: increment(1) });
  await updateDoc(doc(db, 'users', targetUid), { followersCount: increment(1) });
};

export const unfollowUser = async (myUid: string, targetUid: string) => {
  const followingRef = doc(db, 'users', myUid, 'following', targetUid);
  const followerRef = doc(db, 'users', targetUid, 'followers', myUid);
  
  await deleteDoc(followingRef);
  await deleteDoc(followerRef);

  // Update counts
  await updateDoc(doc(db, 'users', myUid), { followingCount: increment(-1) });
  await updateDoc(doc(db, 'users', targetUid), { followersCount: increment(-1) });
};

export const isFollowing = async (myUid: string, targetUid: string) => {
  const snap = await getDoc(doc(db, 'users', myUid, 'following', targetUid));
  return snap.exists();
};

export const getFollowers = async (userId: string) => {
  const snap = await getDocs(collection(db, 'users', userId, 'followers'));
  const uids = snap.docs.map(d => d.id);
  const profiles = await Promise.all(uids.map(uid => getUserProfile(uid)));
  return profiles.filter((p): p is UserProfile => p !== null);
};

export const getFollowing = async (userId: string) => {
  const snap = await getDocs(collection(db, 'users', userId, 'following'));
  const uids = snap.docs.map(d => d.id);
  const profiles = await Promise.all(uids.map(uid => getUserProfile(uid)));
  return profiles.filter((p): p is UserProfile => p !== null);
};

// Personal Posts System
export const addPersonalPost = async (userId: string, data: { content: string, imageUrl?: string }) => {
  const postsRef = collection(db, 'users', userId, 'posts');
  const postRef = doc(postsRef);
  
  const postData: any = {
    content: data.content,
    id: postRef.id,
    authorId: userId,
    createdAt: serverTimestamp(),
    likesCount: 0
  };
  
  if (data.imageUrl) postData.imageUrl = data.imageUrl;
  
  await setDoc(postRef, postData);
  return postRef.id;
};

export const deletePersonalPost = async (userId: string, postId: string) => {
  await deleteDoc(doc(db, 'users', userId, 'posts', postId));
};

export const toggleLikePersonalPost = async (profileUid: string, postId: string, myUid: string, liked: boolean) => {
  const likeRef = doc(db, 'users', profileUid, 'posts', postId, 'likes', myUid);
  const postRef = doc(db, 'users', profileUid, 'posts', postId);
  if (liked) {
    await setDoc(likeRef, { userId: myUid, createdAt: serverTimestamp() });
    await updateDoc(postRef, { likesCount: increment(1) });
  } else {
    await deleteDoc(likeRef);
    await updateDoc(postRef, { likesCount: increment(-1) });
  }
};

export const hasLikedPersonalPost = async (profileUid: string, postId: string, myUid: string) => {
  const snap = await getDoc(doc(db, 'users', profileUid, 'posts', postId, 'likes', myUid));
  return snap.exists();
};

export const addPersonalPostComment = async (profileUid: string, postId: string, comment: any) => {
  const ref = doc(collection(db, 'users', profileUid, 'posts', postId, 'comments'));
  
  const commentData: any = {
    ...comment,
    id: ref.id,
    createdAt: serverTimestamp()
  };

  // Remove undefined values
  Object.keys(commentData).forEach(key => {
    if (commentData[key] === undefined) {
      delete commentData[key];
    }
  });

  await setDoc(ref, commentData);
};

// Communities logic
export const createCommunity = async (data: Omit<Community, 'id' | 'createdAt' | 'memberCount'>) => {
  const ref = doc(collection(db, 'communities'));
  const community = { ...data, id: ref.id, createdAt: serverTimestamp(), memberCount: 0 };
  await setDoc(ref, community);
  // Auto join as creator
  await joinCommunity(ref.id, data.creatorId);
  return community;
};

export const joinCommunity = async (communityId: string, userId: string) => {
  await setDoc(doc(db, 'communities', communityId, 'members', userId), { joinedAt: serverTimestamp() });
  await updateDoc(doc(db, 'communities', communityId), { memberCount: increment(1) });
};

export const leaveCommunity = async (communityId: string, userId: string) => {
  await deleteDoc(doc(db, 'communities', communityId, 'members', userId));
  await updateDoc(doc(db, 'communities', communityId), { memberCount: increment(-1) });
};

export const addCommunityPost = async (communityId: string, post: Omit<CommunityPost, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>) => {
  const ref = doc(collection(db, 'communities', communityId, 'posts'));
  await setDoc(ref, { 
    ...post, 
    id: ref.id, 
    createdAt: serverTimestamp(),
    likesCount: 0,
    commentsCount: 0
  });
};

export const toggleLikePost = async (communityId: string, postId: string, userId: string, isLiking: boolean) => {
  const likeRef = doc(db, 'communities', communityId, 'posts', postId, 'likes', userId);
  if (isLiking) {
    await setDoc(likeRef, { likedAt: serverTimestamp() });
    await updateDoc(doc(db, 'communities', communityId, 'posts', postId), { likesCount: increment(1) });
  } else {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, 'communities', communityId, 'posts', postId), { likesCount: increment(-1) });
  }
};

export const hasLikedPost = async (communityId: string, postId: string, userId: string) => {
  const snap = await getDoc(doc(db, 'communities', communityId, 'posts', postId, 'likes', userId));
  return snap.exists();
};

export const addPostComment = async (communityId: string, postId: string, comment: Omit<CommunityComment, 'id' | 'createdAt'>) => {
  const ref = doc(collection(db, 'communities', communityId, 'posts', postId, 'comments'));
  await setDoc(ref, { ...comment, id: ref.id, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'communities', communityId, 'posts', postId), { commentsCount: increment(1) });
};

// Call signalling
export const initiateCall = async (callerId: string, receiverId: string, type: 'audio' | 'video') => {
  const ref = doc(collection(db, 'calls'));
  await setDoc(ref, {
    id: ref.id,
    callerId,
    receiverId,
    status: 'calling',
    type,
    createdAt: serverTimestamp()
  });

  // Notify receiver
  const userDoc = await getDoc(doc(db, 'users', receiverId));
  const token = userDoc.exists() ? userDoc.data().fcmToken : null;
  
  if (token) {
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title: "AgroLife Call",
        body: `Incoming ${type} call...`,
        data: { callId: ref.id, type: 'call' }
      })
    }).catch(err => console.error("Notification Error:", err));
  }
  
  return ref.id;
};

export const endCall = async (callId: string, status: 'ended' | 'missed' = 'ended') => {
  await updateDoc(doc(db, 'calls', callId), { status, endedAt: serverTimestamp() });
};

// --- Professional Account Applications ---
export const submitProfessionalApplication = async (app: Omit<ProfessionalApplication, 'id' | 'createdAt' | 'status'>) => {
  const ref = doc(collection(db, 'professionalApplications'));
  await setDoc(ref, {
    ...app,
    id: ref.id,
    status: 'pending',
    createdAt: serverTimestamp()
  });
  
  // Update user status
  await updateDoc(doc(db, 'users', app.userId), {
    professionalStatus: 'pending'
  });
};

export const resolveProfessionalApplication = async (appId: string, userId: string, status: 'approved' | 'rejected', role?: string) => {
  const appRef = doc(db, 'professionalApplications', appId);
  await updateDoc(appRef, {
    status,
    resolvedAt: serverTimestamp()
  });

  const userRef = doc(db, 'users', userId);
  const updateData: any = { professionalStatus: status };
  if (status === 'approved' && role) {
    updateData.role = role;
  }
  await updateDoc(userRef, updateData);
};
export const createBooking = async (data: Omit<Booking, 'id' | 'createdAt'>) => {
  const ref = doc(collection(db, 'bookings'));
  const booking = { ...data, id: ref.id, createdAt: serverTimestamp() };
  await setDoc(ref, booking);

  // Notify expert
  const expertDoc = await getDoc(doc(db, 'users', data.expertId));
  const token = expertDoc.exists() ? expertDoc.data().fcmToken : null;
  
  if (token) {
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title: "حجز استشارة جديدة",
        body: `لديك حجز جديد من ${data.userName || 'مستخدم جديد'} بتاريخ ${data.date} الساعة ${data.timeSlot}`,
        data: { bookingId: ref.id, type: 'booking' }
      })
    }).catch(err => console.error("Booking Notification Error:", err));
  }
  
  return booking;
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']) => {
  await updateDoc(doc(db, 'bookings', bookingId), { status });
};

export const getExpertBookings = async (expertId: string) => {
  const q = query(collection(db, 'bookings'), where('expertId', '==', expertId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Booking);
};

// --- Marketplace Helpers ---
export const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'products'), {
    ...product,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const createOrder = async (order: Omit<Order, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'orders'), {
    ...order,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

// --- Weather Data ---
export const fetchWeather = async (wilaya: string): Promise<WeatherData | null> => {
  try {
    const response = await fetch(`/api/weather?wilaya=${encodeURIComponent(wilaya)}`);
    if (!response.ok) throw new Error("Failed to fetch weather");
    return await response.json();
  } catch (err) {
    console.error("Weather fetch error:", err);
    return null;
  }
};

// --- Storage Helpers ---
export const uploadFile = async (file: File, path: string): Promise<string> => {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
};

export const uploadFileWithProgress = (
  file: File, 
  path: string, 
  onProgress: (progress: number) => void
): Promise<string> => {
  const fileRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(fileRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(progress || 0);
      },
      (error) => {
        console.error("Firebase Storage Upload Error:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
};
