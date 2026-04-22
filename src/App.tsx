import React, { useState, useEffect, FormEvent, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Leaf, Search, Bell, MessageSquare, User, Settings, Heart, Send, Plus, 
  Store, GraduationCap, Stethoscope, ChevronRight, Menu, LogOut, Camera, 
  Globe, Bot, CloudRain, Wind, Thermometer, Sun, Cloud, Calendar, Clock, 
  CheckCircle, ChevronLeft, MapPin, Activity, Droplets, Wind as WindIcon, Image,
  Navigation, Star, History, Sprout, Footprints, Play, Phone, Video, Users,
  Hash, BookOpen, AlertCircle, X, Check, ArrowRight, Mic, ShieldAlert, ShieldCheck,
  Eye, Ban, Trash2, MoreVertical, MessageCircle, Share2, Edit3, UserCircle, Settings2, EyeOff,
  ShoppingBag, Sparkles, Award, UserSearch, Users2, LayoutList, Zap, PackageSearch
} from "lucide-react";
import { Language, TRANSLATIONS, WILAYAS, CATEGORIES } from "./lib/constants";
import { GoogleGenAI } from "@google/genai";
import { 
  auth, signInWithGoogle, logout, syncUserProfile, UserProfile, getUserProfile, 
  recordVisit, searchUsers, SearchFilters, db, followUser, unfollowUser, 
  isFollowing, createCommunity, joinCommunity, leaveCommunity, addCommunityPost,
  initiateCall, endCall, getChatId, sendMessage, registerForPushNotifications, messaging, 
  uploadFile, uploadFileWithProgress, fileToBase64, Community, CommunityPost, CallEvent,
  WeatherData, fetchWeather, Booking, createBooking, updateBookingStatus,
  toggleLikePost, hasLikedPost, addPostComment, CommunityComment,
  ProfessionalApplication, submitProfessionalApplication, resolveProfessionalApplication,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification,
  addPersonalPost, deletePersonalPost, toggleLikePersonalPost, hasLikedPersonalPost, addPersonalPostComment,
  getFollowers, getFollowing,
  addProduct, createOrder, Product, Order, CartItem
} from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, doc, collection, query, where, or, orderBy, limit, updateDoc, getDocs, collectionGroup, deleteDoc } from "firebase/firestore";
import { onMessage } from "firebase/messaging";
import { AgroLogo } from "./components/AgroLogo";
import { NotificationBell } from "./components/Notifications/NotificationBell";
import { useToast } from "./hooks/useToast";
import { useAppContext } from "./context/AppContext";
import { ConfirmDialog } from "./components/ConfirmDialog";

// --- Types ---
interface Expert {
  id: string;
  name: string;
  type: 'agri' | 'vet';
  specialty: { [key in Language]: string };
  rating: number;
  image: string;
  availability: string;
}

interface WeatherDay {
  date: string;
  minTemp: number;
  maxTemp: number;
  windSpeed: number;
  windDir: string;
  rainProb: number;
  condition: 'sun' | 'rain' | 'cloud' | 'wind';
}

interface PersonalPost {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  createdAt: any;
  likesCount: number;
}

interface PersonalPostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  createdAt: any;
}

// --- Agricultural & Livestock Data (Algeria Focus) ---
const ALGERIA_CROP_INFO = [
  { 
    title: 'زراعة الحمضيات (Citrus)', 
    region: 'متيجة وشلف', 
    tips: 'تعد سهول المتيجة الأنسب لزراعة الحمضيات. يجب الاهتمام بالري المنتظم خاصة في فترة التزهير والحرص على التسميد العضوي في بداية الشتاء.' 
  },
  { 
    title: 'زراعة الزيتون (Olive)', 
    region: 'القبائل ومعسكر', 
    tips: 'الجزائر تملك إمكانيات هائلة في إنتاج زيت الزيتون. ينصح بالتقليم الصحيح في مارس ومراقبة ذبابة الزيتون ابتداء من جوان.' 
  },
  { 
    title: 'زراعة النخيل (Dates)', 
    region: 'بسكرة والوادي', 
    tips: 'تمور "دقلة نور" هي فخر الجزائر. تحتاج النخلة لتنظيف "العرجون" في الربيع والتأكد من توفر مياه جوفية كافية في الصيف.' 
  }
];

const ALGERIA_LIVESTOCK_INFO = [
  { 
    title: 'تربية الأغنام (الأولاد جلال)', 
    focus: 'إنتاج اللحوم', 
    tips: 'تعتبر سلالة "أولاد جلال" الأفضل في الجزائر. يجب توفير المجمعات الرعوية والاهتمام باللقاحات الدورية ضد الحمى القلاعية.' 
  },
  { 
    title: 'تربية الأبقار الحلوب', 
    focus: 'إنتاج الحليب', 
    tips: 'تتركز في الشمال (سطيف، ميلة). التبريد ضروري جداً في الصيف لضمان استمرارية إنتاج الحليب وتفادي الإجهاد الحراري.' 
  },
  { 
    title: 'تربية الدواجن', 
    focus: 'اللحم والبيض', 
    tips: 'تتطلب مراقبة دقيقة لدرجة الحرارة والتهوية داخل العنابر، خاصة في فترات "الشهيلي" لتجنب الخسائر المفاجئة.' 
  }
];

const EXPERTS: Expert[] = [
  { id: 'exp-1', name: 'د. سليم يحيوي', type: 'vet', specialty: { ar: 'طبيب بيطري • سلالات محلية', en: 'Veterinary • Local Breeds', fr: 'Vétérinaire • Races Locales' }, rating: 4.8, image: 'https://picsum.photos/seed/vet1/200', availability: '9:00 - 17:00' },
  { id: 'exp-2', name: 'أمين حميدي', type: 'agri', specialty: { ar: 'مهندس مهتم بزراعة النخيل', en: 'Engineer • Date Palm Agriculture', fr: 'Ingénieur • Phoeniciculture' }, rating: 4.9, image: 'https://picsum.photos/seed/ag1/200', availability: '8:00 - 16:00' },
  { id: 'exp-3', name: 'د. كريمة بن موسى', type: 'vet', specialty: { ar: 'مختصة في صحة الدواجن', en: 'Poultry Health Specialist', fr: 'Spécialiste Avicole' }, rating: 4.7, image: 'https://picsum.photos/seed/vet2/200', availability: '10:00 - 18:00' },
  { id: 'exp-4', name: 'يوسف قادي', type: 'agri', specialty: { ar: 'خبير في استصلاح الأراضي الصحراوية', en: 'Desert Land Reclamation Expert', fr: 'Expert Mise en Valeur Saharienne' }, rating: 5.0, image: 'https://picsum.photos/seed/ag2/200', availability: '9:00 - 15:00' },
];

const generateWeather = (wilaya: string): WeatherDay[] => {
  const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const conditions: ('sun' | 'rain' | 'cloud' | 'wind')[] = ['sun', 'cloud', 'rain', 'wind'];
  return Array.from({ length: 7 }, (_, i) => ({
    date: daysEn[(new Date().getDay() + i) % 7],
    minTemp: 12 + Math.floor(Math.random() * 5),
    maxTemp: 22 + Math.floor(Math.random() * 10),
    windSpeed: 10 + Math.floor(Math.random() * 40),
    windDir: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
    rainProb: Math.floor(Math.random() * 100),
    condition: conditions[Math.floor(Math.random() * conditions.length)],
  }));
};

// --- Components ---

const Splash = ({ onComplete }: { onComplete: () => void, key?: string }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 overflow-hidden px-8"
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/5 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-blue/5 rounded-full blur-[80px] -ml-40 -mb-40" />
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "backOut" }}
        className="relative mb-8"
      >
        <div className="bg-white p-8 rounded-[48px] shadow-2xl relative z-10">
          <AgroLogo size={140} showText={false} />
        </div>
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="absolute inset-0 bg-brand-green/30 blur-3xl rounded-full translate-y-4"
        />
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-brand-green text-6xl font-black tracking-tighter mb-4"
      >
        AGROLIFE
      </motion.h1>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 0.5 }}
        transition={{ delay: 1 }}
        className="flex flex-col items-center"
      >
        <p className="text-brand-brown text-xs font-bold tracking-[0.5em] uppercase text-center">
          Everything a farmer needs
        </p>
        <p className="text-brand-green text-lg font-arabic font-bold mt-2">كل ما يحتاجه الفلاح</p>
      </motion.div>
      
      <motion.div 
        className="absolute bottom-24 left-0 right-0 flex justify-center px-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <div className="w-full max-w-[200px] h-2 bg-stone-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-brand-green"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, delay: 1.5 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

const LanguageSelector = ({ onSelect }: { onSelect: (lang: Language) => void, key?: string }) => {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/5 rounded-full blur-3xl -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-blue/5 rounded-full blur-3xl -ml-40 -mb-40" />

      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-16 relative z-10"
      >
        <div className="bg-white w-32 h-32 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-xl border border-stone-100 p-6">
          <AgroLogo size={80} showText={false} />
        </div>
        <h2 className="text-5xl font-black text-stone-900 mb-4 tracking-tighter">AGROLIFE</h2>
        <p className="text-stone-400 text-sm font-bold tracking-[0.2em] uppercase">اختر لغتك • Choose Language</p>
      </motion.div>
      
      <div className="grid gap-4 w-full max-w-sm relative z-10 px-4">
        {[
          { id: "ar", name: "العربية", desc: "ARABIC" },
          { id: "en", name: "ENGLISH", desc: "الإنجليزية" },
          { id: "fr", name: "FRANÇAIS", desc: "الفرنسية" }
        ].map((lang, idx) => (
          <motion.button
            key={lang.id}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.1 + 0.5, type: "spring", stiffness: 100 }}
            onClick={() => onSelect(lang.id as Language)}
            className="flex items-center justify-between p-7 bg-white border-2 border-stone-100 rounded-[32px] hover:border-brand-green hover:shadow-2xl hover:shadow-brand-green/10 transition-all group active:scale-95"
          >
            <div className={`text-left ${lang.id === 'ar' ? 'order-2 text-right' : ''}`}>
              <div className="font-black text-xl text-stone-800 group-hover:text-brand-green transition-colors">{lang.name}</div>
              <div className="text-[10px] text-stone-400 font-bold tracking-widest uppercase">{lang.desc}</div>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center group-hover:bg-brand-green group-hover:text-white transition-all text-stone-300 ${lang.id === 'ar' ? 'order-1' : ''}`}>
              <Globe size={24} />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

const Auth = ({ lang, onAuth, onBack }: { lang: Language, onAuth: () => void, onBack: () => void, key?: string }) => {
  const t = TRANSLATIONS[lang];
  const [isLogin, setIsLogin] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastClickRef = React.useRef<number>(0);
  const navigate = useNavigate();
  const toast = useToast();

  const handleGoogleLogin = async () => {
    const now = Date.now();
    if (loading || (now - lastClickRef.current < 1000)) return;
    lastClickRef.current = now;
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        await syncUserProfile(user);
        onAuth();
      }
    } catch (error: any) {
      const errString = JSON.stringify(error) || "";
      const errorMessage = error?.message || "";
      const errorCode = error?.code || "";
      
      const isCancelled = 
        errorCode.includes('cancelled-popup-request') || 
        errorCode.includes('popup-closed-by-user') ||
        errorCode.includes('popup-blocked') ||
        errorMessage.includes('cancelled-popup-request') ||
        errorMessage.includes('popup-closed-by-user') ||
        errorMessage.includes('popup-blocked') ||
        errString.includes('cancelled-popup-request');

      if (isCancelled) {
        return; // Ignore silently
      }

      console.error("Google login failed", error);
      toast.error(error?.message?.includes('permission') 
        ? "فشل تسجيل الدخول: عطل في الأذونات" 
        : "خطأ في تسجيل الدخول عبر جوجل");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("يرجى إدخال البريد الإلكتروني أولاً");
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success("تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني");
    } catch (error: any) {
      toast.error("فشل إرسال الرابط، تأكد من صحة البريد الإلكتروني");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const additionalData = !isLogin ? { 
        displayName: fullName || username, 
        wilaya: wilaya, 
        role: 'farmer' as const 
      } : {};

      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        await syncUserProfile(result.user);
        onAuth();
      } else {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(result.user);
        await syncUserProfile(result.user, additionalData);
        toast.success("تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني لتنشيط الحساب.");
        onAuth();
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let msg = "حدث خطأ في المصادقة";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = "الايميل أو كلمة السر خاطئة";
      } else if (error.code === 'auth/email-already-in-use') {
        msg = "هذا الحساب موجود مسبقاً، جارٍ تحويلك لتسجيل الدخول";
        setIsLogin(true);
      } else if (error.code === 'auth/weak-password') {
        msg = "كلمة السر ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل)";
      } else if (error.code === 'auth/invalid-email') {
        msg = "بريد إلكتروني غير صالح";
      } else if (error.code === 'auth/operation-not-allowed') {
        msg = "طريقة تسجيل الدخول هذه غير مفعلة حالياً";
      } else if (error.code === 'auth/network-request-failed') {
        msg = "فشل الاتصال بالإنترنت، يرجى المحاولة لاحقاً";
      } else if (error.code === 'auth/too-many-requests') {
        msg = "تم حظر المحاولات مؤقتاً بسبب كثرة الطلبات، يرجى الانتظار قليلاً";
      } else {
        msg = `خطأ: ${error.code || error.message}`;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-center p-6 font-sans ${lang === 'ar' ? 'font-arabic' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 p-4 bg-white rounded-2xl shadow-sm text-stone-400 hover:text-stone-900 transition-all z-20 active:scale-95"
      >
        <ChevronLeft size={24} className={lang === 'ar' ? 'rotate-180' : ''} />
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto w-full relative z-10"
      >
        <div className="flex justify-center mb-16">
           <div className="bg-brand-green p-6 rounded-[40px] shadow-2xl shadow-brand-green/20 transform -rotate-12">
             <Leaf className="text-white" size={60} />
           </div>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-stone-900 mb-3 tracking-tighter">AGROLIFE</h1>
          <p className="text-stone-400 text-xs uppercase tracking-[0.5em] font-bold">{isLogin ? t.login : t.signup}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  required 
                  placeholder={t.username} 
                  className="p-5 bg-white border-2 border-stone-100 rounded-[24px] w-full text-sm font-bold shadow-sm outline-none focus:border-brand-green" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <input 
                  required 
                  placeholder={t.fullName} 
                  className="p-5 bg-white border-2 border-stone-100 rounded-[24px] w-full text-sm font-bold shadow-sm outline-none focus:border-brand-green" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <select 
                   required 
                   className="p-5 bg-white border-2 border-stone-100 rounded-[24px] w-full text-sm font-bold shadow-sm outline-none appearance-none cursor-pointer"
                   value={gender}
                   onChange={(e) => setGender(e.target.value)}
                 >
                   <option value="">{t.gender}</option>
                   <option value="male">{t.male}</option>
                   <option value="female">{t.female}</option>
                 </select>
                 <select 
                   required 
                   className="p-5 bg-white border-2 border-stone-100 rounded-[24px] w-full text-sm font-bold shadow-sm outline-none appearance-none cursor-pointer"
                   value={wilaya}
                   onChange={(e) => setWilaya(e.target.value)}
                 >
                   <option value="">{t.wilaya}</option>
                   {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                 </select>
              </div>
            </>
          )}

          <div className="space-y-4">
            <input 
              type="email" 
              placeholder={t.email} 
              className="p-5 bg-white border-2 border-stone-100 rounded-[24px] w-full text-sm font-bold shadow-sm outline-none focus:border-brand-green" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder={t.password} 
                className="p-5 bg-white border-2 border-stone-100 rounded-[24px] w-full text-sm font-bold shadow-sm outline-none focus:border-brand-green pr-14" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-brand-green transition-colors"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] px-2 uppercase tracking-widest font-black pt-2">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-brand-green hover:underline">
              {isLogin ? t.signup : t.login}
            </button>
            {isLogin && <button type="button" onClick={handleResetPassword} className="text-stone-400 hover:text-stone-600">{t.forgotPass}</button>}
          </div>

          <button 
            disabled={loading}
            className={`w-full bg-stone-900 text-white font-black py-6 rounded-[32px] shadow-2xl hover:bg-stone-800 transition-all flex items-center justify-center gap-3 active:scale-95 text-lg mt-8 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLogin ? (loading ? '...' : t.login) : (loading ? '...' : t.signup)}
            {!loading && <ChevronRight size={24} className={`${lang === 'ar' ? 'rotate-180' : ''}`} />}
          </button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-stone-100" />
          <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest whitespace-nowrap">OR</span>
          <div className="flex-1 h-px bg-stone-100" />
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`w-full bg-white border-2 border-stone-100 text-stone-700 font-black py-5 rounded-[32px] shadow-sm hover:shadow-md hover:border-brand-blue/30 transition-all flex items-center justify-center gap-3 active:scale-95 text-base ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="w-8 h-8 bg-stone-50 rounded-xl flex items-center justify-center border border-stone-100">
             <svg className="w-4 h-4" viewBox="0 0 24 24">
               <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
               <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
               <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
               <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
             </svg>
          </div>
          {t.googleLogin}
        </button>

        {isLogin && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center p-5 bg-orange-50/50 border border-orange-100 rounded-[24px]"
          >
            <p className="text-[11px] font-bold text-orange-800 leading-relaxed">
              {lang === 'ar' 
                ? "تنويه: إذا كنت تحاول الدخول بحساب قديم، يرجى الضغط على زر (إنشاء حساب) في الأعلى أولاً، لأننا انتقلنا لنظام أمان حقيقي."
                : "Note: If you're trying to log in with an old account, please click (Signup) above first, as we've moved to a real security system."
              }
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

const Dashboard = ({ lang, onLogout, profile }: { lang: Language, onLogout: () => void, profile: UserProfile | null, key?: string }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const [view, setView] = useState<'home' | 'users' | 'communities' | 'messages' | 'requests' | 'profile' | 'admin' | 'marketplace'>('home');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [activeChat, setActiveChat] = useState<UserProfile | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [activeCall, setActiveCall] = useState<CallEvent | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  if (profile?.isBlocked) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 text-center" dir="rtl">
        <div className="bg-white p-12 rounded-[56px] shadow-2xl border border-stone-100 max-w-lg w-full space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16" />
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-stone-900 tracking-tighter">تم حظر الحساب</h1>
            <p className="text-stone-500 font-medium leading-relaxed">لقد تم تعليق وصولك إلى AgroLife بسبب مخالفة شروط الاستخدام. نأسف لهذا الإجراء، يمكنك التواصل مع الدعم للمراجعة.</p>
          </div>
          <button onClick={onLogout} className="w-full py-5 bg-stone-900 text-white rounded-2xl font-black transition-all hover:scale-[1.02] active:scale-95 shadow-xl">تسجيل الخروج</button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (profile?.wilaya) {
      setWeatherLoading(true);
      fetchWeather(profile.wilaya).then(data => {
        setWeather(data);
        setWeatherLoading(false);
      });
    }
  }, [profile?.wilaya]);

  // Call Listener (Unified Incoming & Outgoing)
  useEffect(() => {
    if (!profile) return;
    const qCall = query(
      collection(db, 'calls'), 
      or(
        where('receiverId', '==', profile.uid),
        where('callerId', '==', profile.uid)
      )
    );

    const unsub = onSnapshot(qCall, (snap) => {
      const callDoc = snap.docs.find((d: any) => d.data().status === 'calling' || d.data().status === 'ongoing');
      if (callDoc) setActiveCall({ ...callDoc.data(), id: callDoc.id } as CallEvent);
      else setActiveCall(null);
    }, (err) => console.error("Unified Call Listener Error:", err));

    return () => unsub();
  }, [profile]);

  // FCM Registration
  useEffect(() => {
    if (profile) {
      registerForPushNotifications(profile.uid);
    }
  }, [profile]);

  // Foreground Notifications
  useEffect(() => {
    if (messaging) {
      const unsub = onMessage(messaging, (payload) => {
        console.log("Foreground Message:", payload);
        // We could add a toast here later
      });
      return () => unsub();
    }
  }, []);

  // Global Profile Opener
  const openProfile = async (uid: string) => {
    if (uid === profile?.uid) {
      setView('profile');
      return;
    }
    const p = await getUserProfile(uid);
    if (p) {
      setSelectedUser(p);
      if (profile) recordVisit(profile.uid, uid);
    }
  };

  useEffect(() => {
    // Suppress Vite/HMR WebSocket errors which are benign in this environment
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (e.reason?.message?.includes('WebSocket') || e.reason?.message?.includes('vite')) {
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  const SidebarItem: React.FC<{ id: typeof view, icon: any, label: string }> = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => { setView(id); setSelectedUser(null); }}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-[28px] transition-all group ${view === id ? 'bg-brand-green text-white shadow-material-mid' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-700'}`}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${view === id ? 'bg-white/20' : 'bg-transparent group-hover:bg-stone-100'}`}>
        <Icon size={20} className={`${view === id ? 'scale-110 active:scale-90' : 'group-hover:scale-110'} transition-transform`} />
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.15em]">{label}</span>
    </button>
  );

  // --- Overlays ---
  const callOverlay = useMemo(() => {
    if (!activeCall) return null;
    return <CallOverlay call={activeCall} onEnd={() => { endCall(activeCall.id); setActiveCall(null); }} />;
  }, [activeCall]);

  const navItems = [
    { id: 'home', icon: Sprout, label: t.home },
    { id: 'marketplace', icon: Store, label: t.marketplace },
    { id: 'communities', icon: Hash, label: t.communities },
    { id: 'messages', icon: MessageSquare, label: t.messages },
    { id: 'requests', icon: Calendar, label: t.consultations },
    { id: 'profile', icon: User, label: t.profile },
    ...(profile?.role === 'admin' ? [{ id: 'admin', icon: ShieldAlert, label: "Admin" }] : [])
  ];

  return (
    <div className={`min-h-screen bg-bg-light flex font-sans selection:bg-brand-green/30 ${lang === 'ar' ? 'font-arabic' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-80 bg-white border-r border-stone-100 flex-col p-10 sticky top-0 h-screen overflow-y-auto">
        <div className="mb-14 flex items-center gap-4">
           <AgroLogo size={42} />
           <div className="space-y-0.5">
             <h1 className="text-xl font-black tracking-tighter text-stone-900">AgroLife</h1>
             <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-green">Ecosystem</p>
           </div>
        </div>

        <div className="space-y-3 flex-1">
          {navItems.map(item => (
            <SidebarItem key={item.id} id={item.id as any} icon={item.icon} label={item.label} />
          ))}
          <div className="pt-4 border-t border-stone-50 mt-4 px-2">
            <NotificationBell />
          </div>
        </div>

        <div className="mt-auto space-y-4 pt-10">
          <button 
            onClick={() => setView('profile')}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-[28px] border border-stone-100 text-stone-400 hover:text-stone-900 transition-all group"
          >
            <Settings2 size={18} className="group-hover:rotate-90 transition-transform duration-700" />
            <span className="text-[10px] font-black uppercase tracking-widest">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</span>
          </button>
          
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 text-rose-500 font-black hover:bg-rose-50 rounded-[28px] transition-all">
            <LogOut size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">{lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative min-h-screen">
        {/* Dynamic Mobile Header */}
        <header className="lg:hidden h-24 bg-white/80 backdrop-blur-3xl border-b border-stone-50 px-8 flex items-center justify-between sticky top-0 z-40">
           <div className="flex items-center gap-4">
              {view !== 'home' ? (
                <button 
                  onClick={() => { setView('home'); setSelectedUser(null); }}
                  className="w-12 h-12 bg-stone-50 text-stone-900 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm"
                >
                  <ChevronLeft size={24} className={lang === 'ar' ? 'rotate-180' : ''} />
                </button>
              ) : (
                <>
                  <AgroLogo size={36} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">AgroLife</p>
                </>
              )}
           </div>
           <div className="flex items-center gap-6">
             <NotificationBell />
             <button onClick={() => setView('profile')} className="w-12 h-12 rounded-[20px] border-2 border-stone-100 p-0.5 shadow-sm active:scale-95 transition-all">
               <img src={profile?.photoURL || "https://picsum.photos/seed/farmer/100"} className="w-full h-full object-cover rounded-[18px]" referrerPolicy="no-referrer" />
             </button>
           </div>
        </header>

        <main className="flex-1 p-6 lg:p-14 overflow-y-auto max-w-6xl mx-auto w-full pb-48 lg:pb-14">
          <AnimatePresence mode="wait">
            {view === 'home' && <RenderHome profile={profile} openProfile={openProfile} weather={weather} weatherLoading={weatherLoading} setView={setView} lang={lang} />}
            {view === 'users' && <RenderUsers openProfile={openProfile} myUid={profile?.uid || ''} profile={profile} />}
            {view === 'marketplace' && <RenderMarketplace lang={lang} profile={profile} onAddToCart={(p) => {
               setCart(prev => {
                 const existing = prev.find(item => item.product.id === p.id);
                 if (existing) return prev.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item);
                 return [...prev, { product: p, quantity: 1 }];
               });
               setShowCart(true);
            }} />}
            {view === 'communities' && <RenderCommunities openProfile={openProfile} userProfile={profile} lang={lang} />}
            {view === 'messages' && profile && <RenderMessages myUid={profile.uid} lang={lang} activeChat={activeChat} setActiveChat={setActiveChat} openProfile={openProfile} />}
            {view === 'requests' && <RenderRequests profile={profile} openProfile={openProfile} />}
            {view === 'admin' && <RenderAdmin />}
            {view === 'profile' && <RenderProfile profile={profile} onLogout={onLogout} />}
          </AnimatePresence>

          <AnimatePresence>
            {showCart && (
              <CartModal 
                cart={cart} 
                lang={lang}
                onClose={() => setShowCart(false)} 
                onUpdateQuantity={(pid, q) => setCart(prev => q === 0 ? prev.filter(i => i.product.id !== pid) : prev.map(i => i.product.id === pid ? { ...i, quantity: q } : i))}
                onCheckout={async (address) => {
                   if (!profile) return;
                   const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
                   await createOrder({
                      buyerId: profile.uid,
                      items: cart,
                      totalAmount: total,
                      status: 'pending',
                      shippingAddress: address
                   });
                   setCart([]);
                   setShowCart(false);
                }}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Floating Action Button (AI Assistant) */}
        {!showAI && (
          <button 
            onClick={() => setShowAI(true)}
            className="fixed bottom-32 right-8 w-16 h-16 bg-stone-900 text-brand-green rounded-[24px] shadow-material-high flex items-center justify-center group active:scale-90 transition-all z-40 lg:hidden"
          >
            <Sparkles size={28} className="group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-green rounded-full border-4 border-white animate-ping" />
          </button>
        )}

        {/* Mobile Navigation Dock */}
        <nav className="lg:hidden fixed bottom-10 left-6 right-6 glass-pill p-2 flex items-center justify-around z-40">
          {navItems.slice(0, 5).map(item => (
            <button 
              key={item.id}
              onClick={() => { setView(item.id as any); setSelectedUser(null); }}
              className={`flex flex-col items-center gap-1.5 p-3 px-5 rounded-[24px] transition-all ${view === item.id ? 'bg-brand-green text-white shadow-material-mid scale-105' : 'text-stone-400 active:scale-95'}`}
            >
              <item.icon size={20} />
            </button>
          ))}
          <button 
              onClick={() => { setView('profile'); setSelectedUser(null); }}
              className={`flex flex-col items-center gap-1.5 p-3 px-5 rounded-[24px] transition-all ${view === 'profile' ? 'bg-brand-green text-white shadow-material-mid scale-105' : 'text-stone-400 active:scale-95'}`}
            >
              <User size={20} />
          </button>
        </nav>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {selectedUser && profile && <UserProfileModal user={selectedUser} myUid={profile.uid} profile={profile} onClose={() => setSelectedUser(null)} onMessage={() => { setActiveChat(selectedUser); setSelectedUser(null); setView('messages'); }} setActiveCall={setActiveCall} />}
        {showAI && <AIChat lang={lang} onClose={() => setShowAI(false)} weather={weather} />}
        {callOverlay}
      </AnimatePresence>
    </div>
  );
};

// --- Overlays ---

const CallOverlay = ({ call, onEnd }: { call: CallEvent, onEnd: () => void }) => {
  const [status, setStatus] = useState(call.status);
  const [caller, setCaller] = useState<UserProfile | null>(null);

  useEffect(() => {
    getUserProfile(call.callerId).then(setCaller);
    const unsub = onSnapshot(doc(db, 'calls', call.id), (doc) => {
      if (doc.exists()) setStatus(doc.data().status as any);
    }, (err) => console.error("Call Status Listener Error:", err));
    return () => unsub();
  }, [call.id, call.callerId]);

  if (status === 'ended' || status === 'missed') return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-brand-green flex flex-col items-center justify-center text-white p-10">
      <div className="absolute top-20 text-center">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-32 h-32 rounded-full border-4 border-white/20 p-2 mx-auto mb-6">
          <img src={caller?.photoURL || `https://picsum.photos/seed/${call.callerId}/200`} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
        </motion.div>
        <h2 className="text-3xl font-black">{caller?.displayName || "Connected Expert"}</h2>
        <p className="text-white/60 font-medium mt-2">{status === 'calling' ? 'Incoming Call...' : 'Ongoing Call'}</p>
      </div>

      <div className="flex gap-8 items-center mt-32">
        <button onClick={onEnd} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
          <Phone className="rotate-[135deg]" size={32} />
        </button>
        {status === 'calling' && (
          <button onClick={() => updateDoc(doc(db, 'calls', call.id), { status: 'ongoing' })} className="w-20 h-20 bg-white text-brand-green rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
            <Check size={32} />
          </button>
        )}
      </div>

      <div className="absolute bottom-12 flex gap-12">
        <div className="flex flex-col items-center gap-2">
          <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center"><WindIcon size={20} /></button>
          <span className="text-[10px] font-black uppercase tracking-widest">Mute</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center"><Video size={20} /></button>
          <span className="text-[10px] font-black uppercase tracking-widest">Camera</span>
        </div>
      </div>
    </motion.div>
  );
};

const BookingModal = ({ expert, myUid, profile, onClose }: { expert: UserProfile, myUid: string, profile: UserProfile | null, onClose: () => void }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleBooking = async () => {
    if (!topic) return toast.error("يرجى تحديد موضوع الاستشارة");
    setLoading(true);
    try {
      await createBooking({
        expertId: expert.uid,
        expertName: expert.displayName,
        userId: myUid,
        userName: profile?.displayName || 'مستخدم',
        date,
        timeSlot: time,
        topic,
        status: 'pending'
      });
      toast.success("تم إرسال طلب الحجز بنجاح! سيصلك تنبيه عند القبول.");
      onClose();
    } catch (err) {
      toast.error("فشل في إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-6" dir="rtl">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white max-w-md w-full rounded-[48px] p-10 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
           <h3 className="text-2xl font-black text-stone-900">حجز استشارة فنية</h3>
           <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">مع المختص: {expert.displayName}</p>
        </div>

        <div className="space-y-4">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-2 font-sans">موضوع الاستشارة</label>
              <input 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="عن ماذا تود استشارة الخبير؟"
                className="w-full bg-stone-50 border-2 border-stone-50 p-4 rounded-2xl outline-none focus:border-brand-green font-bold text-stone-700" 
              />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-2 font-sans">التاريخ</label>
                 <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-stone-50 p-4 rounded-2xl font-bold" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-2 font-sans">الوقت</label>
                 <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-stone-50 p-4 rounded-2xl font-bold" />
              </div>
           </div>
        </div>

        <div className="flex gap-4 pt-4">
           <button 
             disabled={loading}
             onClick={handleBooking}
             className="flex-1 bg-stone-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-stone-950/20 hover:scale-105 active:scale-95 transition-all"
           >
              {loading ? "جاري الإرسال..." : "تأكيد الحجز"}
           </button>
           <button onClick={onClose} className="px-8 bg-stone-100 text-stone-400 rounded-[24px] font-black text-[10px] uppercase tracking-widest">إلغاء</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const UserProfileModal = ({ user, myUid, profile, onClose, onMessage, setActiveCall }: { user: UserProfile, myUid: string, profile: UserProfile | null, onClose: () => void, onMessage: () => void, setActiveCall: (c: CallEvent) => void }) => {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [posts, setPosts] = useState<PersonalPost[]>([]);
  const isProfessional = user.role !== 'farmer' && user.role !== 'admin';
  const [tab, setTab] = useState<'posts' | 'services' | 'followers' | 'following'>(isProfessional ? 'services' : 'posts');
  const [socialUsers, setSocialUsers] = useState<UserProfile[]>([]);
  const [liveUser, setLiveUser] = useState<UserProfile>(user);

  useEffect(() => {
    if (myUid) isFollowing(myUid, user.uid).then(setFollowing);
  }, [myUid, user.uid]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) setLiveUser({ ...doc.data(), uid: doc.id } as UserProfile);
    }, (err) => console.error("Modal Live User Error:", err));
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ ...d.data(), id: d.id } as PersonalPost)));
    }, (err) => console.error("Modal Posts Error:", err));
    return () => unsub();
  }, [user.uid]);

  const handleFollow = async () => {
    if (!myUid) return;
    setLoading(true);
    if (following) await unfollowUser(myUid, user.uid);
    else await followUser(myUid, user.uid);
    setFollowing(!following);
    setLoading(false);
  };

  const showSocial = async (type: 'followers' | 'following') => {
    setLoading(true);
    const users = type === 'followers' ? await getFollowers(user.uid) : await getFollowing(user.uid);
    setSocialUsers(users);
    setTab(type);
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white max-w-xl w-full rounded-[48px] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md rounded-2xl text-stone-900 z-10 hover:bg-stone-100 transition-all"><X size={20} /></button>
        
        <div className="overflow-y-auto no-scrollbar" dir="rtl">
          <div className="h-48 bg-gradient-to-br from-brand-green to-brand-green/70 relative">
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
               <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/300`} className="w-32 h-32 rounded-[40px] border-8 border-white shadow-xl object-cover" referrerPolicy="no-referrer" />
               <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full" />
            </div>
          </div>

          <div className="pt-20 pb-10 px-8 text-center space-y-6">
            <div className="space-y-1">
              <h3 className="text-3xl font-black text-stone-900">{liveUser.displayName}</h3>
              <div className="flex items-center justify-center gap-2">
                 <div className="bg-brand-green/10 px-3 py-1 rounded-full text-[10px] font-black text-brand-green uppercase tracking-widest">{liveUser.role}</div>
                 <span className="text-stone-300">•</span>
                 <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">{liveUser.wilaya || 'الجزائر'}</span>
              </div>
            </div>

            <div className="flex justify-center gap-8 py-2 border-y border-stone-50">
               <button onClick={() => showSocial('followers')} className="text-center group">
                 <p className="text-lg font-black text-stone-900 group-hover:text-brand-green transition-colors">{liveUser.followersCount || 0}</p>
                 <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">متابع</p>
               </button>
               <button onClick={() => showSocial('following')} className="text-center group">
                 <p className="text-lg font-black text-stone-900 group-hover:text-brand-green transition-colors">{liveUser.followingCount || 0}</p>
                 <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">يتابع</p>
               </button>
            </div>
            
            <p className="text-sm text-stone-600 font-medium leading-relaxed italic px-4">
              "{liveUser.bio || 'خبير فلاحي مهني مكرس لتعزيز الأمن الغذائي والزراعة الذكية في الجزائر.'}"
            </p>

            <div className="grid grid-cols-2 gap-4">
               <button onClick={handleFollow} disabled={loading} className={`py-5 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${following ? 'bg-stone-100 text-stone-600' : 'bg-stone-900 text-white shadow-xl shadow-stone-950/20'}`}>
                  {following ? <Check size={18} /> : <Plus size={18} />}
                  {following ? 'متابع' : 'متابعة الخبير'}
               </button>
               <button onClick={() => setShowBooking(true)} className="bg-brand-green text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-brand-green/20 active:scale-95">
                 <Calendar size={18} />
                 حجز استشارة
               </button>
            </div>

            <div className="space-y-4">
              <button onClick={onMessage} className="w-full bg-stone-50 text-stone-900 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-stone-100 transition-colors">
                <MessageSquare size={16} /> مراسلة مهنية
              </button>
            </div>

            {/* Content Tabs */}
            <div className="space-y-6 pt-6 text-right">
               <div className="flex bg-stone-100 p-1.5 rounded-2xl">
                  <button 
                    onClick={() => setTab('posts')} 
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'posts' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400'}`}
                  >
                    المنشورات
                  </button>
                  {isProfessional && (
                    <button 
                      onClick={() => setTab('services')} 
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'services' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400'}`}
                    >
                      الخدمات
                    </button>
                  )}
                  {(tab === 'followers' || tab === 'following') && (
                    <button className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-stone-900 shadow-md">
                      {tab === 'followers' ? 'المتابعون' : 'يتابع'}
                    </button>
                  )}
               </div>

               <div className="space-y-6">
                  {tab === 'posts' ? (
                    <div className="space-y-6">
                      {posts.length > 0 ? (
                        posts.map(post => (
                          <PersonalPostCard 
                            key={post.id}
                            post={post}
                            profile={user}
                            currentUserId={myUid}
                            onDelete={(id) => deletePersonalPost(user.uid, id)}
                          />
                        ))
                      ) : (
                        <div className="text-center py-12 bg-stone-50 rounded-[32px] border border-dashed border-stone-200">
                          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">لا توجد منشورات حتى الآن</p>
                        </div>
                      )}
                    </div>
                  ) : tab === 'services' ? (
                    <div className="space-y-4">
                      {liveUser.services && liveUser.services.length > 0 ? (
                        liveUser.services.map(service => (
                          <div key={service.id} className="bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm text-right space-y-2 group hover:border-brand-green/30 transition-all">
                             <div className="flex items-center justify-between">
                                <h5 className="font-black text-stone-900">{service.title}</h5>
                                {service.price && <span className="bg-brand-green/10 text-brand-green text-[10px] font-black px-3 py-1 rounded-full">{service.price}</span>}
                             </div>
                             <p className="text-stone-500 text-xs font-medium leading-relaxed">{service.description}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-stone-50 rounded-[32px] border border-dashed border-stone-200">
                          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">لا توجد خدمات معروضة حالياً</p>
                        </div>
                      )}
                    </div>
                  ) : (tab === 'followers' || tab === 'following') ? (
                    <div className="space-y-4">
                      {socialUsers.length > 0 ? (
                        socialUsers.map(u => (
                          <div key={u.uid} className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl">
                            <div className="flex items-center gap-4">
                              <img src={u.photoURL || `https://picsum.photos/seed/${u.uid}/100`} className="w-10 h-10 rounded-full object-cover" />
                              <div className="text-right">
                                <p className="text-sm font-black text-stone-900">{u.displayName}</p>
                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{u.role}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-stone-400 text-xs font-bold">القائمة فارغة</p>
                        </div>
                      )}
                    </div>
                  ) : null}
               </div>
            </div>

            <AnimatePresence>
              {showBooking && <BookingModal expert={user} myUid={myUid} profile={profile} onClose={() => setShowBooking(false)} />}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const RenderHome = ({ profile, openProfile, weather, weatherLoading, setView, lang }: { profile: UserProfile | null, openProfile: (uid: string) => any, weather: WeatherData | null, weatherLoading: boolean, setView: (v: string) => void, lang: Language }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const currentTime = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-DZ' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (profile?.uid) {
      const q = query(
        collection(db, 'bookings'), 
        where(profile.role === 'farmer' ? 'userId' : 'expertId', '==', profile.uid),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const unsub = onSnapshot(q, (snap) => {
        setBookings(snap.docs.map(d => ({ ...d.data(), id: d.id } as Booking)));
      }, (err) => console.error("Home Bookings Listener Error:", err));
      return () => unsub();
    }
  }, [profile]);

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pb-12" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Dynamic Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-5xl font-black text-stone-900 tracking-tighter">
            {lang === 'ar' ? 'أهلاً بك،' : 'Good Day,'} <span className="text-brand-green">{profile?.displayName?.split(' ')[0] || (lang === 'ar' ? 'صديقنا' : 'Farmer')}</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">{profile?.wilaya || 'Algeria'} • {currentTime}</span>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-4">
           <div className="text-right">
             <p className="text-sm font-black text-stone-900 leading-tight">AgroLife Prime</p>
             <p className="text-[10px] font-bold text-stone-400 uppercase">Expert Member</p>
           </div>
           <Award className="text-brand-green" size={28} />
        </div>
      </header>

      {/* Quick Action Hub - Thumb Friendly */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[
          { id: 'users', icon: UserSearch, label: t.experts, color: 'bg-emerald-50 text-brand-green', desc: 'Book Now' },
          { id: 'marketplace', icon: ShoppingBag, label: t.marketplace, color: 'bg-blue-50 text-blue-600', desc: 'Shop Deals' },
          { id: 'communities', icon: Users2, label: t.communities, color: 'bg-amber-50 text-amber-600', desc: 'Join Talk' },
          { id: 'requests', icon: LayoutList, label: t.consultations, color: 'bg-stone-100 text-stone-600', desc: 'View All' }
        ].map((act) => (
          <button 
            key={act.id}
            onClick={() => setView(act.id)}
            className="material-card p-6 flex flex-col gap-6 text-right active:scale-95 group"
          >
            <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-transform group-hover:rotate-12 ${act.color}`}>
              <act.icon size={26} />
            </div>
            <div>
              <p className="text-sm font-black text-stone-900 leading-tight mb-1">{act.label}</p>
              <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest">{act.desc}</p>
            </div>
          </button>
        ))}
      </section>

      {/* Main Insights Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Weather Intelligence Card */}
        <div className="lg:col-span-8 overflow-hidden group">
          <div className="h-full bg-brand-green rounded-[48px] p-8 lg:p-12 text-white shadow-material-mid relative flex flex-col justify-between min-h-[300px]">
            {/* Background Texture */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/20 rounded-full -ml-32 -mb-32 blur-2xl" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 h-full">
               <div className="space-y-6">
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Current Intelligence</p>
                   <h2 className="text-6xl font-black tracking-tighter">
                     {weatherLoading ? '--' : weather ? `${weather.temp}°C` : 'N/A'}
                   </h2>
                 </div>
                 
                 <div className="flex gap-8">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Humidity</p>
                      <p className="text-xl font-black">{weather?.humidity || '0'}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Wind Speed</p>
                      <p className="text-xl font-black">{weather?.windSpeed || '0'} km/h</p>
                    </div>
                 </div>
               </div>

               <div className="flex flex-col gap-4 items-center">
                  <div className="w-32 h-32 bg-white/20 rounded-[40px] flex items-center justify-center backdrop-blur-md shadow-xl border border-white/20">
                    {weatherLoading ? <Activity className="animate-spin" /> : <Sun size={64} className="text-amber-300 drop-shadow-lg" />}
                  </div>
                  <div className="bg-white px-6 py-2 rounded-full text-brand-green text-[10px] font-black uppercase tracking-widest shadow-lg">
                    {weather?.condition || 'Analyzing...'}
                  </div>
               </div>

               <div className="md:absolute md:bottom-0 md:left-0 md:right-0 mt-8 md:mt-0 flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  <div className="flex-1 bg-white/20 backdrop-blur-md p-6 rounded-[32px] border border-white/10 shadow-sm flex items-center gap-4 min-w-[280px]">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-green shadow-inner">
                      <Zap size={22} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Recommendation</p>
                      <p className="text-sm font-bold leading-tight line-clamp-2">
                        {weather && weather.temp > 30 ? "High temp risk. Focus on irrigation." : "Ideal planting window detected today."}
                      </p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Next Appointment Card */}
        <div className="lg:col-span-4 flex flex-col gap-4">
           <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest px-4">{t.consultations}</h3>
           <div className="flex-1 material-card p-8 flex flex-col justify-between gap-8 group">
              {bookings.length > 0 ? (
                <div className="space-y-8 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-brand-green shadow-inner group-hover:scale-110 transition-transform">
                      <Clock size={28} />
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-stone-900">{bookings[0].timeSlot}</p>
                       <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{bookings[0].date}</p>
                    </div>
                  </div>
                  
                  <div className="bg-stone-50 p-6 rounded-[32px] border border-stone-100 flex-1 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-3">{profile?.role === 'farmer' ? 'Expert Name' : 'Farmer Name'}</p>
                    <p className="text-lg font-black text-stone-900 leading-tight">
                      {profile?.role === 'farmer' ? (bookings[0].expertName || 'Expert') : (bookings[0].userName || 'Member')}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Confirmed Session</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setView('requests')}
                    className="w-full py-4 bg-stone-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                  >
                    Manage Visits
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-16 h-16 bg-stone-50 rounded-3xl flex items-center justify-center text-stone-200">
                    <Calendar size={32} />
                  </div>
                  <p className="text-xs font-black text-stone-300 uppercase tracking-widest leading-relaxed">No sessions found.<br/>Start booking now.</p>
                  <button onClick={() => setView('users')} className="text-[10px] font-black text-brand-green border-b-2 border-brand-green/20 pb-1 uppercase tracking-widest pt-4">Explore Experts</button>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Algerian Heritage Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-black text-stone-900 tracking-tight">Agricultural Intelligence</h3>
           <div className="h-0.5 flex-1 bg-stone-100 mx-6 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {ALGERIA_CROP_INFO.slice(0, 3).map((item, i) => (
             <div key={i} className="material-card p-8 group">
                <div className="flex items-center justify-between mb-8">
                   <div className="p-3 bg-brand-light-green text-brand-green rounded-xl group-hover:scale-110 transition-transform">
                     <Sprout size={18} />
                   </div>
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-stone-50 rounded-full text-stone-400">{item.region}</span>
                </div>
                <h4 className="text-md font-black text-stone-900 mb-3">{item.title}</h4>
                <p className="text-[11px] text-stone-500 leading-relaxed font-medium line-clamp-3 italic opacity-80">"{item.tips}"</p>
                <div className="mt-8 pt-6 border-t border-stone-50 flex items-center justify-between">
                   <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Seasonal Data</p>
                   <ArrowRight size={14} className="text-stone-300 group-hover:translate-x-1 transition-transform" />
                </div>
             </div>
           ))}
        </div>
      </section>
    </motion.div>
  );
};

const RenderUsers = ({ openProfile, myUid, profile }: { openProfile: (uid: string) => any, myUid: string, profile: UserProfile | null }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'farmer' | 'veterinarian' | 'engineer' | 'supplier'>('all');
  const [wilayaFilter, setWilayaFilter] = useState('all');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingExpert, setBookingExpert] = useState<UserProfile | null>(null);

  useEffect(() => {
    const handleSearch = async () => {
      setLoading(true);
      try {
        const filters: SearchFilters = { 
          role: filter,
          wilaya: wilayaFilter 
        };
        const users = await searchUsers(searchTerm, filters);
        setResults(users);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, filter, wilayaFilter]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10 pb-24">
      <header className="space-y-6">
        <h2 className="text-4xl font-black text-stone-900 tracking-tighter">Directory & Search</h2>
        
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-stone-400">
            <Search size={20} />
          </div>
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or specialty..."
            className="w-full bg-white border-2 border-stone-100 p-6 pl-16 rounded-[32px] outline-none focus:border-brand-green shadow-sm transition-all font-bold text-stone-700"
          />
        </div>

        {/* Role Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['all', 'farmer', 'veterinarian', 'engineer', 'supplier'].map(r => (
            <button 
              key={r} onClick={() => setFilter(r as any)}
              className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === r ? 'bg-stone-900 text-white shadow-xl flex items-center gap-2' : 'bg-white border-2 border-stone-100 text-stone-400 hover:border-stone-200'}`}
            >
              {filter === r && <CheckCircle size={12} />}
              {r}
            </button>
          ))}
        </div>

        {/* Wilaya Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <select 
            value={wilayaFilter}
            onChange={(e) => setWilayaFilter(e.target.value)}
            className="bg-white border-2 border-stone-100 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest outline-none focus:border-brand-green"
          >
            <option value="all">All Wilayas</option>
            {WILAYAS.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-stone-100 border-t-brand-green rounded-full animate-spin" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map(expert => (
            <motion.div 
              key={expert.uid} 
              layout
              className="bg-white p-8 rounded-[48px] border border-stone-100 shadow-sm hover:shadow-2xl hover:shadow-brand-green/10 transition-all flex items-center gap-8 group relative"
            >
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => openProfile(expert.uid)} className="relative cursor-pointer">
                   <img src={expert.photoURL || `https://picsum.photos/seed/${expert.uid}/200`} className="w-28 h-28 rounded-[40px] object-cover group-hover:scale-105 transition-transform shadow-lg" referrerPolicy="no-referrer" />
                   <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg">
                     <CheckCircle size={14} />
                   </div>
                </div>
                {expert.role !== 'farmer' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookingExpert(expert);
                    }}
                    className="bg-stone-900 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-stone-950/20 active:scale-90 transition-all"
                  >
                    حجز الآن
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-2 pointer-events-none">
                 <h4 className="text-2xl font-black text-stone-900 tracking-tighter">{expert.displayName}</h4>
                 <div className="flex flex-wrap gap-2">
                   <p className="text-[10px] font-black text-brand-green uppercase tracking-widest bg-brand-green/5 px-3 py-1 rounded-full whitespace-nowrap">{expert.role}</p>
                   {expert.specialization && (
                     <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50 px-3 py-1 rounded-full whitespace-nowrap">{expert.specialization}</p>
                   )}
                 </div>
                 <div className="flex items-center gap-4 text-xs font-bold text-stone-400 pt-2">
                    <div className="flex items-center gap-1.5"><MapPin size={14} /> {expert.wilaya || 'Algeria'}</div>
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-stone-50 rounded-full text-stone-200">
            <Search size={48} />
          </div>
          <p className="text-xl font-bold text-stone-400">No members found matching your search</p>
        </div>
      )}

      <AnimatePresence>
        {bookingExpert && (
          <BookingModal expert={bookingExpert} myUid={myUid} profile={profile} onClose={() => setBookingExpert(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const RenderMessages = ({ activeChat, setActiveChat, openProfile, myUid, lang }: { activeChat: UserProfile | null, setActiveChat: (u: UserProfile | null) => void, openProfile: (uid: string) => any, myUid: string, lang: Language }) => {
  const [msgInput, setMsgInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    if (!myUid) return;
    // Simple mock chat list for UI visibility - in real app we'd query chats where members array contains myUid
    const usersRef = collection(db, 'users');
    getDocs(query(usersRef, limit(5))).then(snap => {
       setChats(snap.docs.map(d => ({ ...d.data(), id: d.id }) as any).filter((u: any) => u.uid !== myUid));
    }).catch(err => console.error("Chat User Fetch Error:", err));
  }, [myUid]);

  useEffect(() => {
    if (!activeChat || !myUid) return;
    const chatId = getChatId(myUid, activeChat.uid);
    const q = query(collection(db, 'chats', chatId, 'messages'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Client-side sort to avoid index errors
      setMessages(msgs.sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)));
    }, (err) => console.error("Chat Messages Listener Error:", err));
    return () => unsub();
  }, [activeChat, myUid]);

  const handleSend = async () => {
    if (!msgInput.trim() || !activeChat || !myUid) return;
    const chatId = getChatId(myUid, activeChat.uid);
    await sendMessage(chatId, myUid, { text: msgInput, type: 'text' });
    setMsgInput("");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result;
          if (activeChat && myUid) {
            const chatId = getChatId(myUid, activeChat.uid);
            await sendMessage(chatId, myUid, { type: 'voice', mediaUrl: base64data as string });
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleImageUploadLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myUid || !activeChat) return;

    try {
      const chatId = getChatId(myUid, activeChat.uid);
      const path = `chats/${chatId}/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, path);
      await sendMessage(chatId, myUid, { type: 'image', mediaUrl: url });
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  };

  if (activeChat) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col bg-white rounded-[48px] shadow-2xl border border-stone-100 overflow-hidden min-h-[70vh]">
        <header className="p-4 lg:p-8 border-b flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3 lg:gap-4 cursor-pointer" onClick={() => openProfile(activeChat.uid)}>
            <img src={activeChat.photoURL || `https://picsum.photos/seed/${activeChat.uid}/100`} className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl object-cover" referrerPolicy="no-referrer" />
            <div>
              <h4 className="font-black text-base lg:text-lg text-stone-900 leading-tight">{activeChat.displayName}</h4>
              <span className="text-[9px] lg:text-[10px] font-black text-brand-green uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse" />
                Expert Online
              </span>
            </div>
          </div>
          <button onClick={() => setActiveChat(null)} className="p-3 lg:p-4 rounded-2xl bg-white border border-stone-100 text-stone-300 hover:text-stone-900 transition-all"><ChevronLeft size={24} className={`${lang === 'ar' ? 'rotate-180' : ''} lg:scale-110`} /></button>
        </header>

        <div className="flex-1 p-8 space-y-6 overflow-y-auto bg-stone-50/50 flex flex-col">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderId === myUid ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-6 rounded-[32px] shadow-sm max-w-[80%] border border-stone-100 ${m.senderId === myUid ? 'bg-brand-green text-white rounded-tr-none' : 'bg-white text-stone-600 rounded-tl-none'}`}>
                {m.type === 'text' ? (
                  <p className="font-medium">{m.text}</p>
                ) : m.type === 'image' ? (
                  <img src={m.mediaUrl} className="max-w-full max-h-80 rounded-2xl shadow-lg border-2 border-white/20" alt="Shared" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <audio src={m.mediaUrl} controls className="h-8 max-w-[200px] filter saturate-0 invert" />
                  </div>
                )}
                <span className={`text-[9px] font-black mt-3 block tracking-widest uppercase ${m.senderId === myUid ? 'text-white/60' : 'text-stone-300'}`}>
                  {m.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                </span>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-300 space-y-4">
               <MessageSquare size={48} />
               <p className="font-black uppercase tracking-widest text-xs">Start a professional conversation</p>
            </div>
          )}
        </div>

        <div className="p-4 lg:p-6 bg-white border-t flex flex-col gap-4">
           <div className="flex items-center gap-2 lg:gap-4">
              {!isRecording && (
                <label className="cursor-pointer p-3 lg:p-5 bg-stone-50 rounded-2xl text-stone-400 hover:text-brand-green transition-all shadow-sm">
                   <Image size={20} />
                   <input type="file" accept="image/*" className="hidden" onChange={handleImageUploadLocal} />
                </label>
              )}
              
              <div className="flex-1 relative flex items-center gap-2">
                 <input 
                   value={msgInput} onChange={(e) => setMsgInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                   className="flex-1 p-4 lg:p-6 bg-stone-50 border-2 border-stone-100 rounded-[20px] lg:rounded-[28px] outline-none focus:border-brand-green text-sm font-bold shadow-inner" 
                   placeholder={lang === 'ar' ? 'اكتب رسالتك...' : 'Type message...'}
                 />
                 
                 <div className="flex items-center gap-2">
                    {msgInput.trim() ? (
                      <button onClick={handleSend} className="px-6 lg:px-8 py-4 lg:py-5 bg-brand-green text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest">{lang === 'ar' ? 'إرسال' : 'Send'}</span>
                        <Send size={18} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isRecording ? (
                          <button onClick={stopRecording} className="p-4 lg:p-5 bg-red-50 text-red-500 rounded-2xl animate-pulse shadow-lg"><Activity size={20} /></button>
                        ) : (
                          <button onClick={startRecording} className="p-4 lg:p-5 bg-stone-50 rounded-2xl text-stone-400 hover:text-brand-green transition-all shadow-sm"><Mic size={20} /></button>
                        )}
                        <button disabled className="opacity-30 px-6 lg:px-8 py-4 lg:py-5 bg-stone-200 text-stone-500 rounded-2xl flex items-center gap-2 cursor-not-allowed">
                           <span className="text-[10px] font-black uppercase tracking-widest">{lang === 'ar' ? 'إرسال' : 'Send'}</span>
                           <Send size={18} />
                        </button>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-24">
       <h2 className="text-4xl font-black text-stone-900 tracking-tighter">Messages</h2>
       <div className="space-y-4">
          {chats.map(user => (
            <button key={user.uid} onClick={() => setActiveChat(user)} className="w-full bg-white p-6 lg:p-8 rounded-[40px] border border-stone-100 hover:shadow-2xl transition-all flex items-center gap-6 group">
               <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100`} className="w-16 h-16 lg:w-20 lg:h-20 rounded-[32px] object-cover" referrerPolicy="no-referrer" />
               <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-lg text-stone-900 group-hover:text-brand-green transition-colors">{user.displayName}</h4>
                    <span className="text-[10px] font-bold text-stone-300">Active</span>
                  </div>
                  <p className="text-stone-400 text-sm font-medium line-clamp-1 mt-1">Professional agricultural chat</p>
               </div>
            </button>
          ))}
          {chats.length === 0 && (
             <div className="text-center py-24 bg-white border border-stone-100 rounded-[48px] text-stone-300">
               <MessageSquare size={64} className="mx-auto mb-4 opacity-20" />
               <p className="font-black uppercase tracking-widest text-[10px]">No recent conversations</p>
             </div>
          )}
       </div>
    </motion.div>
  );
};

const RenderRequests = ({ profile }: { profile: UserProfile | null, openProfile: (uid: string) => any }) => {
  const [statusFilter, setStatusFilter] = useState<Booking['status']>('pending');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'bookings'),
      where(profile.role === 'farmer' ? 'userId' : 'expertId', '==', profile.uid),
      where('status', '==', statusFilter),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map(d => ({ ...d.data(), id: d.id } as Booking)));
      setLoading(false);
    }, (err) => {
      console.error("Requests Listener Error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [profile, statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: Booking['status']) => {
    await updateBookingStatus(id, newStatus);
  };

  const statusLabels: Record<string, string> = {
    'pending': 'قيد الانتظار',
    'confirmed': 'مؤكدة',
    'completed': 'مكتملة',
    'cancelled': 'ملغاة'
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-24" dir="rtl">
       <header className="space-y-6">
        <h2 className="text-4xl font-black text-stone-900 tracking-tighter">مكتب الاستشارات الفنية</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
            <button 
              key={s} onClick={() => setStatusFilter(s as any)}
              className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === s ? 'bg-stone-900 text-white shadow-xl' : 'bg-white border-2 border-stone-100 text-stone-400 hover:border-stone-200'}`}
            >
              {statusLabels[s] || s}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-stone-100 border-t-brand-green rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
           {bookings.map(b => (
             <div key={b.id} className="bg-white p-8 rounded-[48px] border border-stone-100 shadow-sm space-y-8 group hover:border-brand-blue/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 uppercase tracking-tighter">طلب استشارة من: {b.userName || 'فلاح'}</h4>
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{b.topic || 'موضوع عام'}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                    {statusLabels[b.status]}
                  </div>
                </div>

                <div className="bg-stone-50/50 p-6 rounded-[32px] grid grid-cols-2 gap-4">
                   <div className="flex items-center gap-4 text-xs font-bold text-stone-600">
                      <div className="p-2 bg-white rounded-lg"><Calendar size={14} className="text-brand-blue" /></div>
                      {b.date}
                   </div>
                   <div className="flex items-center gap-4 text-xs font-bold text-stone-600">
                      <div className="p-2 bg-white rounded-lg"><Clock size={14} className="text-brand-blue" /></div>
                      {b.timeSlot}
                   </div>
                </div>

                <div className="flex gap-4">
                   {profile?.role !== 'farmer' && b.status === 'pending' && (
                     <button 
                       onClick={() => handleUpdateStatus(b.id, 'confirmed')}
                       className="flex-1 bg-brand-green text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-green/20 hover:scale-[1.02] active:scale-95 transition-all"
                     >
                       قبول الطلب
                     </button>
                   )}
                   {b.status === 'pending' && (
                     <button 
                       onClick={() => handleUpdateStatus(b.id, 'cancelled')}
                       className="flex-1 bg-red-50 text-red-500 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all"
                     >
                       {profile?.role === 'farmer' ? 'إلغاء الطلب' : 'رفض'}
                     </button>
                   )}
                   {b.status === 'confirmed' && (
                     <button 
                       onClick={() => handleUpdateStatus(b.id, 'completed')}
                       className="flex-1 bg-stone-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-stone-800 transition-all shadow-xl shadow-stone-950/20"
                     >
                       تحديد كمكتملة
                     </button>
                   )}
                </div>
             </div>
           ))}
           {bookings.length === 0 && (
              <div className="text-center py-32 bg-stone-50/50 border-2 border-dashed border-stone-100 rounded-[48px] text-stone-300">
                <Calendar size={64} className="mx-auto mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-[10px]">لا توجد طلبات {statusLabels[statusFilter]} حالياً</p>
              </div>
           )}
        </div>
      )}
    </motion.div>
  );
};

const RenderCommunities = ({ openProfile, userProfile, lang }: { openProfile: (uid: string) => any, userProfile: UserProfile | null, lang: Language }) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedComm, setSelectedComm] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', type: 'topic' as 'crop' | 'livestock' | 'topic' });
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Record<string, CommunityComment[]>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const toast = useToast();

  useEffect(() => {
    const q = query(collection(db, 'communities'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setCommunities(snap.docs.map(d => ({ ...d.data(), id: d.id } as Community)));
    }, (err) => console.error("Communities Listener Error:", err));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedComm) return;
    const q = query(collection(db, 'communities', selectedComm.id, 'posts'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, async (snap) => {
      const fetchedPosts = snap.docs.map(d => ({ ...d.data(), id: d.id } as CommunityPost));
      setPosts(fetchedPosts);
      
      if (userProfile) {
        const likesMap: Record<string, boolean> = {};
        for (const post of fetchedPosts) {
          const liked = await hasLikedPost(selectedComm.id, post.id, userProfile.uid);
          likesMap[post.id] = liked;
        }
        setLikedPosts(likesMap);
      }
    }, (err) => console.error("Posts Listener Error:", err));
    return () => unsub();
  }, [selectedComm, userProfile]);

  const handleCreateGroup = async () => {
    if (!userProfile) return;
    if (!newGroup.name || !newGroup.description) return toast.error(lang === 'ar' ? "يرجى ملء جميع الخانات" : "Please fill all fields");
    try {
      await createCommunity({ ...newGroup, creatorId: userProfile.uid });
      setShowCreateGroup(false);
      setNewGroup({ name: '', description: '', type: 'topic' });
      toast.success(lang === 'ar' ? "تم إنشاء المجموعة بنجاح" : "Community created successfully");
    } catch (err) {
      toast.error(lang === 'ar' ? "فشل إنشاء المجموعة" : "Failed to create community");
    }
  };

  const handleCreatePost = async () => {
    if (!userProfile || !selectedComm) return;
    if (!newPost.title || !newPost.content) return toast.error(lang === 'ar' ? "يرجى كتابة عنوان ومحتوى" : "Please write a title and content");
    try {
      await addCommunityPost(selectedComm.id, { ...newPost, authorId: userProfile.uid });
      setShowCreatePost(false);
      setNewPost({ title: '', content: '' });
      toast.success(lang === 'ar' ? "تم النشر بنجاح" : "Post shared successfully");
    } catch (err) {
      toast.error(lang === 'ar' ? "فشل في النشر" : "Failed to publish post");
    }
  };

  const handleLike = async (post: CommunityPost) => {
    if (!userProfile || !selectedComm) return;
    const currentlyLiked = !!likedPosts[post.id];
    try {
      await toggleLikePost(selectedComm.id, post.id, userProfile.uid, !currentlyLiked);
      setLikedPosts(prev => ({ ...prev, [post.id]: !currentlyLiked }));
    } catch (err) {
      toast.error(lang === 'ar' ? "خطأ في التفاعل" : "Error toggling like");
    }
  };

  const handleComment = async (postId: string) => {
    if (!userProfile || !selectedComm || !commentText) return;
    try {
      await addPostComment(selectedComm.id, postId, {
        authorId: userProfile.uid,
        authorName: userProfile.displayName || "Member",
        authorPhoto: userProfile.photoURL || undefined,
        content: commentText
      });
      setCommentText("");
      setCommentingOn(null);
      toast.success(lang === 'ar' ? "تم إضافة التعليق" : "Comment added successfully");
    } catch (err) {
      toast.error(lang === 'ar' ? "فشل التعليق" : "Failed to add comment");
    }
  };

  const fetchComments = async (postId: string) => {
    if (!selectedComm) return;
    const q = query(collection(db, 'communities', selectedComm.id, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setComments(prev => ({
        ...prev,
        [postId]: snap.docs.map(d => ({ ...d.data(), id: d.id } as CommunityComment))
      }));
    }, (err) => console.error("Community Comments Error:", err));
    return unsub;
  };

  if (selectedComm) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10 pb-12" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <header className="flex items-center justify-between">
           <div className="flex items-center gap-6">
              <button 
                onClick={() => setSelectedComm(null)} 
                className="w-14 h-14 bg-white border-2 border-stone-50 rounded-[20px] flex items-center justify-center text-stone-900 shadow-sm active:scale-95"
              >
                <ChevronLeft size={24} className={lang === 'ar' ? 'rotate-180' : ''} />
              </button>
              <div>
                <h2 className="text-3xl font-black text-stone-900 tracking-tighter">{selectedComm.name}</h2>
                <div className="flex items-center gap-3">
                   <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                   <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{selectedComm.memberCount} {lang === 'ar' ? 'عقل نشط' : 'active minds'}</span>
                </div>
              </div>
           </div>
           {(userProfile?.role === 'expert' || userProfile?.role === 'engineer' || userProfile?.role === 'admin' || userProfile?.role === 'professional') && (
             <button onClick={() => setShowCreatePost(true)} className="w-12 h-12 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
                <Plus size={20} />
             </button>
           )}
        </header>

        <div className="space-y-6">
           {posts.length > 0 ? posts.map((post, idx) => (
             <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               transition={{ delay: idx * 0.1 }}
               key={post.id} 
               className="material-card p-8 space-y-6 bg-white border border-stone-50"
             >
               <div className="flex items-center justify-between">
                 <div onClick={() => openProfile(post.authorId)} className="flex items-center gap-4 cursor-pointer group">
                    <img src={`https://picsum.photos/seed/${post.authorId}/100`} className="w-12 h-12 rounded-2xl shadow-md border-2 border-white group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                    <div>
                      <span className="text-sm font-black text-stone-900 block">Expert Contributor</span>
                      <span className="text-[10px] text-stone-300 font-bold">منذ قليل</span>
                    </div>
                 </div>
                 <button className="text-stone-300 hover:text-stone-500 transition-colors"><MoreVertical size={20} /></button>
               </div>
               
               <div className="space-y-3">
                 <h4 className="text-2xl font-black text-stone-900 tracking-tight">{post.title}</h4>
                 <p className="text-stone-600 font-medium leading-relaxed text-lg">{post.content}</p>
               </div>

               <div className="pt-6 border-t border-stone-50 flex items-center gap-6">
                  <button 
                    onClick={() => handleLike(post)}
                    className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${likedPosts[post.id] ? 'text-red-500' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    <Heart size={20} fill={likedPosts[post.id] ? "currentColor" : "none"} /> {post.likesCount || 0} Like
                  </button>
                  <button 
                    onClick={() => {
                      if (!comments[post.id]) fetchComments(post.id);
                      setCommentingOn(commentingOn === post.id ? null : post.id);
                    }}
                    className="flex items-center gap-2 text-stone-400 hover:text-brand-blue text-xs font-black uppercase tracking-widest transition-colors"
                  >
                    <MessageCircle size={20} /> {post.commentsCount || 0} Comment
                  </button>
                  <button className="flex items-center gap-2 text-stone-400 hover:text-brand-green text-xs font-black uppercase tracking-widest transition-colors ml-auto">
                    <Share2 size={20} /> Invite
                  </button>
               </div>

               {commentingOn === post.id && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-6 space-y-6">
                    <div className="space-y-4 max-h-60 overflow-y-auto no-scrollbar pr-2">
                       {comments[post.id]?.map(c => (
                         <div key={c.id} className="flex gap-4 items-start">
                            <img src={c.authorPhoto || `https://picsum.photos/seed/${c.authorId}/100`} className="w-8 h-8 rounded-xl flex-shrink-0" />
                            <div className="bg-stone-50 p-4 rounded-2xl rounded-tr-none flex-1">
                               <p className="text-[10px] font-black text-stone-900 mb-1">{c.authorName}</p>
                               <p className="text-sm text-stone-600 font-medium">{c.content}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                    <div className="flex gap-4">
                       <input 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="اكتب تعليقك هنا..." 
                        className="flex-1 bg-stone-50 border border-stone-100 rounded-2xl px-6 py-3 text-sm outline-none focus:border-brand-blue transition-all" 
                       />
                       <button onClick={() => handleComment(post.id)} className="bg-brand-blue text-white p-3 rounded-2xl shadow-xl shadow-brand-blue/20 active:scale-90 transition-all"><Send size={20} /></button>
                    </div>
                 </motion.div>
               )}
            </motion.div>
          )) : (
            <div className="text-center py-20 bg-white rounded-[40px] border border-stone-100 italic text-stone-400">No professional topics discussed yet.</div>
          )}
        </div>

        {/* Create Post Modal */}
        <AnimatePresence>
          {showCreatePost && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreatePost(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-xl rounded-[48px] p-12 relative z-10 shadow-2xl space-y-8">
                 <div className="space-y-2">
                   <h3 className="text-3xl font-black text-stone-900 tracking-tighter">نشر موضوع جديد</h3>
                   <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">شارك خبرتك مع أعضاء {selectedComm.name}</p>
                 </div>
                 <div className="space-y-4">
                    <input 
                      placeholder="عنوان الموضوع..." 
                      value={newPost.title}
                      onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                      className="w-full p-5 bg-stone-50 rounded-2xl border-2 border-stone-50 outline-none focus:border-brand-green font-bold text-lg" 
                    />
                    <textarea 
                      placeholder="ماذا تريد أن تشارك؟" 
                      rows={6} 
                      value={newPost.content}
                      onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                      className="w-full p-5 bg-stone-50 rounded-2xl border-2 border-stone-50 outline-none focus:border-brand-green font-medium resize-none" 
                    />
                 </div>
                 <div className="flex gap-4">
                    <button onClick={handleCreatePost} className="flex-1 bg-brand-green text-white font-black py-5 rounded-[24px] shadow-xl shadow-brand-green/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs">نشر الموضوع</button>
                    <button onClick={() => setShowCreatePost(false)} className="px-10 bg-stone-100 text-stone-400 font-black rounded-[24px] hover:bg-stone-200 transition-all uppercase tracking-widest text-[10px]">إلغاء</button>
                 </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-24">
       <header className="space-y-4">
          <h2 className="text-5xl lg:text-7xl font-black text-stone-900 tracking-tighter">{lang === 'ar' ? 'مجتمعاتنا' : 'Social Hub'}</h2>
          <div className="flex items-center gap-6">
             <div className="w-12 h-0.5 bg-brand-green rounded-full" />
             <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.4em]">{lang === 'ar' ? 'تبادل الخبرات مع المحترفين' : 'Connect x Share x Grow'}</p>
          </div>
       </header>

       <div className="flex gap-8 overflow-x-auto no-scrollbar pb-10 pl-4 pr-4">
          {userProfile?.role === 'admin' && (
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="min-w-[200px] aspect-[4/5] bg-stone-50 border-4 border-dashed border-stone-100 rounded-[48px] flex flex-col items-center justify-center gap-6 group hover:bg-stone-100 transition-all shadow-inner"
            >
               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-stone-300 group-hover:scale-110 transition-transform shadow-sm">
                 <Plus size={32} />
               </div>
               <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{lang === 'ar' ? 'إنشاء مجتمع' : 'Deploy Core'}</p>
            </button>
          )}
          {communities.map((comm) => (
            <button key={comm.id} onClick={() => setSelectedComm(comm)} className="min-w-[260px] lg:min-w-[300px] aspect-[4/5] material-card p-10 flex flex-col justify-between text-right group relative overflow-hidden bg-white border border-stone-50 shadow-sm">
               <div className="absolute top-0 right-0 w-48 h-48 bg-stone-50/50 rounded-full -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-1000 z-0" />
               <div className="w-16 h-16 bg-stone-50 rounded-[22px] flex items-center justify-center text-stone-900 group-hover:bg-brand-green group-hover:text-white transition-all shadow-inner relative z-10">
                  {comm.type === 'crop' ? <Sprout size={32} /> : comm.type === 'livestock' ? <Activity size={32} /> : <MessageSquare size={32} />}
               </div>
               <div className="space-y-4 relative z-10">
                 <div className="space-y-2">
                   <h3 className="text-2xl font-black text-stone-900 tracking-tight group-hover:text-brand-green transition-colors">{comm.name}</h3>
                   <p className="text-stone-500 font-medium line-clamp-3 text-sm leading-relaxed">{comm.description}</p>
                 </div>
                 <div className="pt-6 flex items-center justify-between border-t border-stone-50">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-3">
                         {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-stone-100 flex items-center justify-center overflow-hidden"><img src={`https://picsum.photos/seed/${i+comm.id}/40`} className="w-full h-full object-cover" /></div>)}
                      </div>
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{comm.memberCount} Mbrs</span>
                    </div>
                    <button className="bg-stone-50 text-stone-900 p-3 rounded-2xl group-hover:bg-brand-green group-hover:text-white transition-all"><ChevronRight size={20} /></button>
                 </div>
               </div>
            </button>
          ))}
          {communities.length === 0 && (
             <div className="min-w-full flex items-center justify-center py-24 border-4 border-dashed border-stone-50 rounded-[56px] bg-stone-50/30">
                <p className="text-stone-300 font-black uppercase tracking-[0.4em] text-xs leading-relaxed text-center">
                   {lang === 'ar' ? 'لا توجد مجتمعات منشأة بعد' : 'Social landscape is quiet'}
                </p>
             </div>
          )}
       </div>

       {/* Create Group Modal */}
       <AnimatePresence>
          {showCreateGroup && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" dir="rtl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateGroup(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-xl rounded-[48px] p-12 relative z-10 shadow-2xl space-y-8">
                 <div className="space-y-2 text-center">
                   <h3 className="text-3xl font-black text-stone-900 tracking-tighter">إنشاء مجموعة جديدة</h3>
                   <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">ابنِ مجتمعاً متخصصاً يجمع المهنيين</p>
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-2">اسم المجموعة</label>
                       <input 
                        value={newGroup.name}
                        onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                        className="w-full p-5 bg-stone-50 rounded-2xl border-2 border-stone-50 outline-none focus:border-brand-green font-bold" 
                        placeholder="مثال: مربي الأبقار في الجزائر"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-2">التصنيف</label>
                       <div className="grid grid-cols-3 gap-3">
                          {(['crop', 'livestock', 'topic'] as const).map(type => (
                            <button 
                              key={type}
                              onClick={() => setNewGroup({...newGroup, type})}
                              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newGroup.type === type ? 'bg-brand-green text-white border-brand-green shadow-lg shadow-brand-green/20' : 'bg-stone-50 text-stone-400 border-stone-50 hover:border-stone-100'}`}
                            >
                              {type === 'crop' ? 'محاصيل' : type === 'livestock' ? 'مواشي' : 'ثقافة'}
                            </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-2">الوصف</label>
                       <textarea 
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                        rows={4} 
                        className="w-full p-5 bg-stone-50 rounded-2xl border-2 border-stone-50 outline-none focus:border-brand-green font-medium resize-none" 
                        placeholder="اشرح هدف المجموعة..."
                       />
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={handleCreateGroup} className="flex-1 bg-stone-900 text-white font-black py-5 rounded-[24px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs">إنشاء المجموعة</button>
                    <button onClick={() => setShowCreateGroup(false)} className="px-10 bg-stone-100 text-stone-400 font-black rounded-[24px] hover:bg-stone-200 transition-all uppercase tracking-widest text-[10px]">إلغاء</button>
                 </div>
              </motion.div>
            </div>
          )}
       </AnimatePresence>
    </motion.div>
  );
};

const PersonalPostCard: React.FC<{ 
  post: PersonalPost; 
  profile: UserProfile | null; 
  currentUserId: string; 
  onDelete: (id: string) => Promise<void> | void; 
}> = ({ post, profile, currentUserId, onDelete }) => {
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PersonalPostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { state: { userProfile } } = useAppContext();
  const toast = useToast();

  useEffect(() => {
    if (!profile || !currentUserId) return;
    const checkLike = async () => {
      const isLiked = await hasLikedPersonalPost(profile.uid, post.id, currentUserId);
      setLiked(isLiked);
    };
    checkLike();
  }, [post.id, profile, currentUserId]);

  useEffect(() => {
    if (!showComments || !profile) return;
    const q = query(
      collection(db, 'users', profile.uid, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ ...d.data(), id: d.id } as PersonalPostComment)));
    }, (err) => console.error("Personal Post Comments Error:", err));
    return () => unsub();
  }, [showComments, post.id, profile]);

  const handleLike = async () => {
    if (!profile || !currentUserId) return;
    try {
      const newStatus = !liked;
      setLiked(newStatus);
      await toggleLikePersonalPost(profile.uid, post.id, currentUserId, newStatus);
    } catch (err) {
      setLiked(!liked);
      toast.error("خطأ في التفاعل");
    }
  };

  const handleAddComment = async () => {
    if (!profile || !newComment.trim() || !userProfile) return;
    setIsSubmitting(true);
    try {
      await addPersonalPostComment(profile.uid, post.id, {
        authorId: userProfile.uid,
        authorName: userProfile.displayName,
        authorPhoto: userProfile.photoURL,
        content: newComment
      });
      setNewComment("");
      toast.success("تم إضافة التعليق");
    } catch (err) {
      toast.error("فشل في إضافة التعليق");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!profile) return;
    try {
      await deleteDoc(doc(db, 'users', profile.uid, 'posts', post.id, 'comments', commentId));
      toast.success("تم حذف التعليق");
    } catch (err) {
      toast.error("فشل حذف التعليق");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-8 rounded-[48px] border border-stone-100 shadow-sm space-y-6 relative group"
    >
      {currentUserId === profile?.uid && (
        <button 
          onClick={() => onDelete(post.id)}
          className="absolute top-8 left-8 p-3 bg-rose-50 text-rose-300 hover:text-rose-500 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={18} />
        </button>
      )}

      <div className="flex items-center gap-4">
        <img src={profile?.photoURL || "https://picsum.photos/seed/farmer/100"} className="w-12 h-12 rounded-2xl object-cover" referrerPolicy="no-referrer" />
        <div>
          <p className="font-black text-stone-900 text-sm">{profile?.displayName}</p>
          <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
            {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('ar-DZ') : 'الآن'}
          </p>
        </div>
      </div>

      <p className="text-stone-600 leading-relaxed font-medium text-lg whitespace-pre-wrap">{post.content}</p>
      
      {post.imageUrl && (
        <img src={post.imageUrl} className="w-full h-80 object-cover rounded-[32px] shadow-lg" alt="Post content" referrerPolicy="no-referrer" />
      )}

      <div className="pt-4 flex items-center gap-6 border-t border-stone-50">
        <button 
          onClick={handleLike}
          className={`flex items-center gap-2 transition-colors ${liked ? 'text-rose-500' : 'text-stone-400 hover:text-rose-500'}`}
        >
          <Heart size={20} fill={liked ? "currentColor" : "none"} />
          <span className="text-[10px] font-black uppercase tracking-widest">{post.likesCount || 0}</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-2 transition-colors ${showComments ? 'text-brand-blue' : 'text-stone-400 hover:text-brand-blue'}`}
        >
          <MessageCircle size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">التعليقات</span>
        </button>
        <button className="flex items-center gap-2 text-stone-400 hover:text-brand-green transition-colors">
          <Share2 size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">مشاركة</span>
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-6 pt-4"
          >
            <div className="space-y-4 max-h-60 overflow-y-auto no-scrollbar pr-2">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3 items-start group/comment">
                  <img src={c.authorPhoto || "https://picsum.photos/seed/user/50"} className="w-8 h-8 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1 bg-stone-50 p-4 rounded-2xl rounded-tr-none relative">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{c.authorName}</p>
                    <p className="text-sm font-medium text-stone-600">{c.content}</p>
                    {(currentUserId === c.authorId || currentUserId === profile?.uid) && (
                      <button 
                        onClick={() => handleDeleteComment(c.id)}
                        className="absolute top-2 left-2 p-1 text-stone-200 hover:text-rose-500 opacity-0 group-hover/comment:opacity-100 transition-all"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-center text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] py-4">كن أول من يعلق</p>
              )}
            </div>

            <div className="flex gap-3 items-center pt-2">
              <img src={userProfile?.photoURL || "https://picsum.photos/seed/me/50"} className="w-10 h-10 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
              <div className="flex-1 relative">
                <input 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="أضف تعليقاً..."
                  className="w-full bg-stone-50 p-4 pl-12 rounded-2xl outline-none border border-transparent focus:border-brand-green text-sm font-medium transition-all"
                />
                <button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-brand-green hover:scale-110 disabled:opacity-30 disabled:scale-100 transition-all"
                >
                  {isSubmitting ? <div className="w-4 h-4 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const RenderMarketplace = ({ profile, onAddToCart, lang }: { profile: UserProfile | null, onAddToCart: (p: Product) => void, lang: Language }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '' });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const toast = useToast();
  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
    }, (err) => console.error("Marketplace Listener Error:", err));
    return () => unsub();
  }, []);

  const handleAddProduct = async () => {
    if (!profile) return;
    if (!newProduct.name || !newProduct.price) return toast.error(lang === 'ar' ? "يرجى ملء الاسم والسعر" : "Please fill name and price");
    setIsAdding(true);
    try {
      let imageUrl = "";
      if (productImage) {
        const path = `products/${profile.uid}/${Date.now()}_${productImage.name}`;
        imageUrl = await uploadFile(productImage, path);
      }
      await addProduct({
        ...newProduct,
        price: parseFloat(newProduct.price),
        imageUrl,
        sellerId: profile.uid,
        createdAt: new Date()
      });
      setShowAddForm(false);
      setNewProduct({ name: '', description: '', price: '', category: '' });
      setProductImage(null);
      toast.success(lang === 'ar' ? "تمت إضافة المنتج بنجاح" : "Product added successfully");
    } catch (err) {
      toast.error(lang === 'ar' ? "فشل إضافة المنتج" : "Failed to add product");
    } finally {
      setIsAdding(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10 pb-12" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
       {/* Marketplace Header */}
       <header className="space-y-8">
          <div className="flex items-center justify-between">
             <div className="space-y-1">
                <h2 className="text-4xl lg:text-6xl font-black text-stone-900 tracking-tighter">{t.marketplace}</h2>
                <p className="text-stone-400 text-xs font-black uppercase tracking-[0.2em]">{lang === 'ar' ? 'تجهيزات فلاحية بمقاييس عالمية' : 'Premium Agri-Supplies'}</p>
             </div>
             {(profile?.role === 'supplier' || profile?.role === 'engineer' || profile?.role === 'admin') && (
               <button 
                 onClick={() => setShowAddForm(true)}
                 className="w-14 h-14 bg-stone-900 text-white rounded-2xl flex items-center justify-center shadow-material-high active:scale-90 transition-all hover:bg-brand-green"
               >
                 <Plus size={24} />
               </button>
             )}
          </div>

          <div className="relative group">
             <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-green transition-colors">
                <Search size={22} />
             </div>
             <input 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder={lang === 'ar' ? 'تبحث عن بذور، معدات، أسمدة...' : 'Search supplies...'}
               className="w-full bg-white pl-16 pr-8 py-6 rounded-[32px] border-2 border-stone-50 outline-none focus:border-brand-green shadow-sm transition-all font-black text-stone-700 placeholder:text-stone-300"
             />
          </div>
       </header>

       {/* Featured Categories (Optional Visual Polish) */}
       <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {['All Products', 'Modern Tools', 'Hybrid Seeds', 'Eco Fertilizer'].map(cat => (
            <button key={cat} className="px-8 py-3 bg-white border border-stone-100 rounded-full text-[10px] font-black uppercase tracking-widest text-stone-500 hover:bg-stone-900 hover:text-white transition-all whitespace-nowrap shadow-sm">
              {cat}
            </button>
          ))}
       </div>

       {/* Add Product Drawer */}
       <AnimatePresence>
         {showAddForm && (
           <motion.div 
             initial={{ opacity: 0, y: 100 }} 
             animate={{ opacity: 1, y: 0 }} 
             exit={{ opacity: 0, y: 100 }} 
             className="fixed inset-0 z-[100] bg-stone-900/40 backdrop-blur-md flex items-end lg:items-center justify-center p-4"
           >
              <div className="bg-white w-full max-w-2xl rounded-[48px] p-10 lg:p-14 shadow-material-high relative overflow-hidden">
                 <button onClick={() => setShowAddForm(false)} className="absolute top-8 right-8 p-3 bg-stone-100 rounded-2xl text-stone-400 hover:text-stone-600 transition-all z-10"><X size={24} /></button>
                 
                 <div className="space-y-10">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-stone-900 tracking-tight">{lang === 'ar' ? 'إضافة منتج للسوق' : 'List Product'}</h3>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Global Marketplace Standard</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-stone-400 uppercase ml-4">Product Identity</label>
                            <input 
                              placeholder={lang === 'ar' ? 'مثال: محراث آلي متطور' : 'e.g. Smart Plow'}
                              value={newProduct.name}
                              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                              className="w-full p-6 bg-stone-50 rounded-[24px] outline-none focus:ring-4 ring-brand-green/10 font-bold border-2 border-transparent focus:border-stone-100 transition-all"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                               <label className="text-[10px] font-black text-stone-400 uppercase ml-4">Price (DA)</label>
                               <input 
                                 type="number"
                                 value={newProduct.price}
                                 onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                                 className="w-full p-6 bg-stone-50 rounded-[24px] outline-none font-bold focus:ring-4 ring-brand-green/10 transition-all"
                               />
                             </div>
                             <div className="space-y-1.5">
                               <label className="text-[10px] font-black text-stone-400 uppercase ml-4">Section</label>
                               <select 
                                 value={newProduct.category}
                                 onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                                 className="w-full p-6 bg-stone-50 rounded-[24px] outline-none font-black text-[10px] uppercase tracking-widest focus:ring-4 ring-brand-green/10 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNIDYgOSBMIDEyIDE1IEwgMTggOSIgc3Ryb2tlPSIjOTA5MDkwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_1.5rem_center]"
                               >
                                 <option value="">Choose</option>
                                 <option value="seeds">Seeds</option>
                                 <option value="tools">Hardware</option>
                                 <option value="fertilizer">Biotech</option>
                                 <option value="livestock">Livestock</option>
                               </select>
                             </div>
                          </div>
                          
                          <textarea 
                            placeholder={lang === 'ar' ? 'أدخل تفاصيل تقنية ومميزات...' : 'Technical specs and features...'}
                            value={newProduct.description}
                            onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                            rows={3}
                            className="w-full p-6 bg-stone-50 rounded-[24px] outline-none font-medium resize-none focus:ring-4 ring-brand-green/10 transition-all"
                          />
                       </div>
                       
                       <div className="flex flex-col gap-6">
                          <div 
                            className="flex-1 border-4 border-dashed border-stone-50 rounded-[40px] flex flex-col items-center justify-center p-8 bg-stone-50/30 hover:bg-stone-50 transition-all cursor-pointer group relative overflow-hidden shadow-inner" 
                            onClick={() => document.getElementById('product-img')?.click()}
                          >
                             <input id="product-img" type="file" hidden accept="image/*" onChange={(e) => setProductImage(e.target.files?.[0] || null)} />
                             {productImage ? (
                               <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={URL.createObjectURL(productImage)} className="absolute inset-0 w-full h-full object-cover" />
                             ) : (
                               <div className="flex flex-col items-center gap-3">
                                 <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                   <Image size={32} className="text-stone-300" />
                                 </div>
                                 <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">Visual Input</p>
                               </div>
                             )}
                          </div>
                          
                          <button 
                            onClick={handleAddProduct}
                            disabled={isAdding}
                            className="w-full h-20 bg-stone-900 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-material-high active:scale-95 transition-all disabled:opacity-50"
                          >
                             {isAdding ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" /> : (lang === 'ar' ? 'نشر في المنصة' : 'Deploy Product')}
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Product Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product, idx) => (
            <motion.div 
              layout 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={product.id} 
              className="material-card p-4 group flex flex-col h-full bg-white"
            >
               <div className="h-72 lg:h-80 bg-stone-100 rounded-[40px] mb-6 overflow-hidden relative">
                  <img 
                    src={product.imageUrl || `https://picsum.photos/seed/${product.id}/600`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="absolute top-6 right-6 px-5 py-2.5 bg-white shadow-material-mid rounded-2xl text-stone-900 font-black text-sm border-2 border-stone-50">
                    {product.price} DA
                  </div>
                  <div className="absolute bottom-6 left-6 px-4 py-2 bg-stone-900/60 backdrop-blur-md rounded-xl text-white text-[9px] font-black uppercase tracking-widest border border-white/10">
                    {product.category || 'Agri-Tech'}
                  </div>
               </div>

               <div className="flex-1 px-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-black text-stone-900 leading-tight">{product.name}</h4>
                    <div className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_10px_rgba(46,204,113,0.5)]" />
                  </div>
                  <p className="text-stone-400 text-[11px] font-medium line-clamp-2 leading-relaxed italic opacity-85">"{product.description}"</p>
               </div>

               <div className="mt-8 px-4 pb-4">
                  <button 
                    onClick={() => onAddToCart(product)}
                    className="w-full h-16 bg-stone-50 text-stone-400 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-green hover:text-white transition-all flex items-center justify-center gap-4 border-2 border-transparent active:scale-95"
                  >
                     <ShoppingBag size={20} />
                     {t.addToCart}
                  </button>
               </div>
            </motion.div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-40 flex flex-col items-center gap-6">
               <div className="w-32 h-32 bg-stone-50 rounded-[48px] flex items-center justify-center text-stone-100">
                  <PackageSearch size={64} />
               </div>
               <div className="text-center space-y-1">
                 <p className="text-stone-900 font-black text-lg">No Results In Inventory</p>
                 <p className="text-stone-400 font-black uppercase tracking-[0.3em] text-[10px]">Try dynamic search parameters</p>
               </div>
               <button onClick={() => setSearch('')} className="mt-4 px-10 py-4 bg-stone-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Reset Filter</button>
            </div>
          )}
       </div>
    </motion.div>
  );
};

const CartModal = ({ cart, onClose, onUpdateQuantity, onCheckout, lang }: { cart: CartItem[], onClose: () => void, onUpdateQuantity: (pid: string, q: number) => void, onCheckout: (address: string) => Promise<void>, lang: Language }) => {
  const [address, setAddress] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const toast = useToast();
  const t = TRANSLATIONS[lang];

  const handleCheckout = async () => {
    if (!address) return toast.error(lang === 'ar' ? "يرجى إدخال عنوان التوصيل" : "Please enter delivery address");
    setIsCheckingOut(true);
    try {
       await onCheckout(address);
       toast.success(lang === 'ar' ? "تم الطلب بنجاح! سنتواصل معك قريباً" : "Order placed successfully! We will contact you soon");
    } catch (err) {
       toast.error(lang === 'ar' ? "فشل إكمال الطلب" : "Failed to complete order");
    } finally {
       setIsCheckingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
       
       <motion.div initial={{ x: lang === 'ar' ? '100%' : '-100%' }} animate={{ x: 0 }} exit={{ x: lang === 'ar' ? '100%' : '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-white w-full max-w-lg h-full shadow-2xl flex flex-col p-8 lg:p-12">
          <div className="flex items-center justify-between mb-12">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center">
                   <ShoppingBag size={24} />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-stone-900 tracking-tighter">{t.cart}</h3>
                   <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{cart.length} {lang === 'ar' ? 'منتجات في السلة' : 'items in cart'}</p>
                </div>
             </div>
             <button onClick={onClose} className="p-3 bg-stone-100 text-stone-400 rounded-2xl hover:bg-stone-200 transition-all">
                <X size={20} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 -mx-2 px-2">
             {cart.map(item => (
               <div key={item.product.id} className="flex gap-6 items-center p-4 bg-stone-50 rounded-[32px] group hover:bg-stone-100 transition-colors">
                  <img src={item.product.imageUrl || "https://picsum.photos/seed/product/100"} className="w-24 h-24 rounded-2xl object-cover shadow-sm bg-white" referrerPolicy="no-referrer" />
                  <div className="flex-1 space-y-1">
                     <h4 className="font-black text-stone-900 leading-tight">{item.product.name}</h4>
                     <p className="text-brand-green font-black text-xs uppercase tracking-widest">{item.product.price} DA</p>
                     
                     <div className="flex items-center gap-3 pt-2">
                        <button onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)} className="w-8 h-8 rounded-lg bg-white border border-stone-100 flex items-center justify-center text-stone-900 active:scale-90 transition-transform">-</button>
                        <span className="text-sm font-black text-stone-900 w-8 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)} className="w-8 h-8 rounded-lg bg-white border border-stone-100 flex items-center justify-center text-stone-900 active:scale-90 transition-transform">+</button>
                     </div>
                  </div>
                  <button onClick={() => onUpdateQuantity(item.product.id, 0)} className="p-3 text-stone-300 hover:text-rose-500 transition-colors">
                     <Trash2 size={20} />
                  </button>
               </div>
             ))}
             {cart.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 opacity-30">
                  <ShoppingBag size={48} className="text-stone-300" />
                  <p className="font-black uppercase tracking-widest text-xs">{lang === 'ar' ? 'السلة فارغة حالياً' : 'Cart is currently empty'}</p>
               </div>
             )}
          </div>

          <div className="mt-8 pt-8 border-t border-stone-100 space-y-6">
             {cart.length > 0 && (
               <div className="space-y-4">
                  <input 
                    placeholder={lang === 'ar' ? "عنوان التوصيل (الولاية، البلدية، الحي...)" : "Delivery address (Wilaya, Commune, Street...)"}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-5 bg-stone-50 rounded-2xl outline-none focus:ring-2 ring-brand-green/20 font-bold text-sm"
                  />
                  <div className="flex justify-between items-center px-4">
                     <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{lang === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}</p>
                     <p className="text-2xl font-black text-stone-900">{total} DA</p>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full bg-brand-green text-white py-6 rounded-[28px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-4 shadow-2xl shadow-brand-green/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                     {isCheckingOut ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={20} /> {t.checkout}</>}
                  </button>
               </div>
             )}
             <button onClick={onClose} className="w-full text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] hover:text-stone-600 transition-colors">{lang === 'ar' ? 'مواصلة التسوق' : 'Continue Shopping'}</button>
          </div>
       </motion.div>
    </div>
  );
};

const RenderProfile = ({ profile, onLogout }: { profile: UserProfile | null, onLogout: () => void }) => {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: profile?.displayName || '',
    wilaya: profile?.wilaya || '',
    bio: profile?.bio || ''
  });
  const [posts, setPosts] = useState<PersonalPost[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const toast = useToast();

  // Service Management
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newService, setNewService] = useState({ title: '', description: '', price: '' });
  const [isExpert, setIsExpert] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || "",
        wilaya: profile.wilaya || "الجزائر",
        bio: profile.bio || ""
      });
      setIsExpert(profile.role !== 'farmer' && profile.role !== 'admin');
    }
  }, [profile]);

  const handleAddService = async () => {
    if (!profile || !newService.title || !newService.description) return;
    try {
      const updatedServices = [...(profile.services || []), { ...newService, id: Date.now().toString() }];
      await updateDoc(doc(db, 'users', profile.uid), { services: updatedServices });
      setNewService({ title: '', description: '', price: '' });
      setShowServiceForm(false);
      toast.success("تم إضافة الخدمة بنجاح");
    } catch (err) {
      toast.error("فشل في إضافة الخدمة");
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!profile || !profile.services) return;
    try {
      const updatedServices = profile.services.filter(s => s.id !== serviceId);
      await updateDoc(doc(db, 'users', profile.uid), { services: updatedServices });
      toast.success("تم حذف الخدمة");
    } catch (err) {
      toast.error("فشل في حذف الخدمة");
    }
  };

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'users', profile.uid, 'posts'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ ...d.data(), id: d.id } as PersonalPost)));
    }, (err) => console.error("Profile Posts Error:", err));
    return () => unsub();
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      await syncUserProfile(auth.currentUser!, editData);
      toast.success("تم تحديث معلوماتك بنجاح");
      setIsEditing(false);
    } catch (err) {
      toast.error("فشل في تحديث المعلومات");
    }
  };

  const handleCreatePost = async () => {
    if (!profile || !newPostContent.trim()) return;
    setIsPosting(true);
    try {
      let imageUrl = "";
      if (postImage) {
        const path = `posts/${profile.uid}/${Date.now()}_${postImage.name}`;
        imageUrl = await uploadFile(postImage, path);
      }
      await addPersonalPost(profile.uid, {
        content: newPostContent,
        ...(imageUrl && { imageUrl })
      });
      setNewPostContent("");
      setPostImage(null);
      setShowPostModal(false);
      toast.success("تم النشر بنجاح على صفحتك");
    } catch (err) {
      console.error("Create Post Error:", err);
      toast.error("فشل في النشر");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!profile) return;
    try {
      await deletePersonalPost(profile.uid, postId);
      toast.success("تم حذف المنشور");
    } catch (err) {
      toast.error("فشل حذف المنشور");
    }
  };

  const handleNotificationsToggle = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerForPushNotifications(profile!.uid);
      toast.success("تم تفعيل الإشعارات بنجاح");
    } else {
      toast.error("يجب السماح بالإشعارات من إعدادات المتصفح");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-24">
       {/* Profile Header */}
       <div className="text-center space-y-6 bg-white p-12 rounded-[56px] border border-stone-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-stone-50" />
          <div className="relative inline-block group mt-8">
             <div className="absolute inset-0 bg-brand-green/10 blur-[80px] rounded-full scale-150 animate-pulse" />
             <img src={profile?.photoURL || "https://picsum.photos/seed/farmer/300"} className="w-40 h-40 rounded-[64px] border-8 border-white shadow-2xl object-cover relative z-10" referrerPolicy="no-referrer" />
             <button className="absolute bottom-2 right-2 bg-brand-green text-white p-3.5 rounded-[22px] border-[6px] border-white shadow-xl z-20 hover:scale-110 active:scale-90 transition-all">
                <Camera size={24} />
             </button>
          </div>
          <div className="relative z-10 space-y-4">
            {isEditing ? (
              <div className="max-w-xs mx-auto space-y-3">
                <input 
                  value={editData.displayName}
                  onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                  className="w-full text-center text-2xl font-black bg-stone-50 p-2 rounded-xl outline-none border-b-2 border-brand-green"
                />
                <select 
                  value={editData.wilaya}
                  onChange={(e) => setEditData({...editData, wilaya: e.target.value})}
                  className="w-full text-center bg-stone-50 p-2 rounded-xl"
                >
                  {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} className="flex-1 bg-brand-green text-white py-2 rounded-lg font-bold">حفظ</button>
                  <button onClick={() => setIsEditing(false)} className="flex-1 bg-stone-100 py-2 rounded-lg font-bold">إلغاء</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-4xl font-black text-stone-900 tracking-tighter">{profile?.displayName || "Member"}</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                   <div className="bg-brand-green/10 px-4 py-1.5 rounded-full text-[10px] font-black text-brand-green uppercase tracking-[0.2em]">{profile?.role}</div>
                   <span className="text-stone-300 text-xs font-bold uppercase tracking-widest">• {profile?.wilaya || 'Algeria'}</span>
                </div>
                <button onClick={() => setIsEditing(true)} className="text-xs font-black text-brand-green uppercase tracking-widest hover:underline flex items-center gap-2 mx-auto pt-2">
                  <Settings size={14} /> تعديل الملف الشخصي
                </button>
              </>
            )}
          </div>
       </div>

       {/* Services Section (For Experts) */}
       {isExpert && (
         <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
               <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.3em]">الخدمات والخبرات المعروضة</h4>
               <button 
                 onClick={() => setShowServiceForm(true)}
                 className="flex items-center gap-2 bg-brand-green text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-green/10"
               >
                  <Plus size={16} /> إضافة خدمة
               </button>
            </div>

            <div className="grid gap-4">
               {profile?.services?.map((service) => (
                 <div key={service.id} className="bg-white p-8 rounded-[40px] border border-stone-100 shadow-sm flex items-center justify-between group">
                    <div className="space-y-2">
                       <h5 className="text-lg font-black text-stone-900">{service.title}</h5>
                       <p className="text-stone-500 text-sm font-medium">{service.description}</p>
                       {service.price && <p className="text-brand-green font-black text-xs">السعر المتوقع: {service.price}</p>}
                    </div>
                    <button 
                      onClick={() => handleDeleteService(service.id)}
                      className="p-4 bg-rose-50 text-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100"
                    >
                      <Trash2 size={20} />
                    </button>
                 </div>
               ))}

               {(!profile?.services || profile.services.length === 0) && !showServiceForm && (
                 <div className="text-center py-20 bg-stone-50/50 rounded-[48px] border-2 border-dashed border-stone-100 text-stone-300">
                    <Store size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black uppercase tracking-widest text-[10px]">لم تقم بإضافة أي خدمات بعد</p>
                 </div>
               )}

               {showServiceForm && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-stone-50 p-8 rounded-[40px] border-2 border-brand-green/20 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <input 
                         placeholder="عنوان الخدمة (مثال: تلقيح الأبقار)"
                         value={newService.title}
                         onChange={(e) => setNewService({...newService, title: e.target.value})}
                         className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-brand-green/20 font-bold"
                       />
                       <input 
                         placeholder="السعر (اختياري)"
                         value={newService.price}
                         onChange={(e) => setNewService({...newService, price: e.target.value})}
                         className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-brand-green/20 font-bold"
                       />
                    </div>
                    <textarea 
                      placeholder="وصف مختصر للخدمة..."
                      value={newService.description}
                      onChange={(e) => setNewService({...newService, description: e.target.value})}
                      rows={3}
                      className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-brand-green/20 font-medium resize-none"
                    />
                    <div className="flex gap-4">
                       <button onClick={handleAddService} className="flex-1 bg-stone-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">تأكيد الإضافة</button>
                       <button onClick={() => setShowServiceForm(false)} className="px-8 bg-white text-stone-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">إلغاء</button>
                    </div>
                 </motion.div>
               )}
            </div>
         </div>
       )}

       {/* Posts Section */}
       <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
             <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.3em]">منشورات الصفحة الشخصية</h4>
             {profile?.uid === auth.currentUser?.uid && (
               <button 
                 onClick={() => setShowPostModal(true)}
                 className="flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-green transition-all shadow-xl shadow-stone-900/10"
               >
                  <Plus size={16} /> نشر جديد
               </button>
             )}
          </div>

          <div className="grid gap-6">
             {posts.map((post: PersonalPost) => (
               <PersonalPostCard 
                 key={post.id}
                 post={post}
                 profile={profile}
                 currentUserId={auth.currentUser?.uid || ""}
                 onDelete={handleDeletePost}
               />
             ))}

             {posts.length === 0 && (
               <div className="text-center py-20 bg-stone-50/50 rounded-[48px] border-2 border-dashed border-stone-100 text-stone-300">
                  <Edit3 size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="font-black uppercase tracking-widest text-[10px]">لم تقم بنشر أي شيء بعد</p>
               </div>
             )}
          </div>
       </div>

       {/* Create Post Modal */}
       <AnimatePresence>
          {showPostModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-md">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className="bg-white w-full max-w-xl rounded-[48px] p-8 space-y-8 shadow-2xl relative"
                 dir="rtl"
               >
                  <button onClick={() => setShowPostModal(false)} className="absolute top-8 left-8 p-3 bg-stone-50 rounded-2xl text-stone-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
                  
                  <div className="space-y-4">
                     <h3 className="text-2xl font-black text-stone-900 pr-2 border-r-4 border-brand-green">مشاركة جديدة</h3>
                     <p className="text-stone-400 text-sm font-medium">شارك خبراتك، تساؤلاتك أو تحديثاتك مع زملائك الفلاحين</p>
                  </div>

                  <div className="space-y-6">
                     <textarea 
                       value={newPostContent}
                       onChange={(e) => setNewPostContent(e.target.value)}
                       placeholder="بماذا تفكر اليوم؟"
                       rows={6}
                       className="w-full bg-stone-50 p-6 rounded-[32px] outline-none border-2 border-transparent focus:border-brand-green text-lg font-medium transition-all resize-none shadow-inner"
                     />

                     <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer group">
                           <input type="file" accept="image/*" onChange={(e) => setPostImage(e.target.files?.[0] || null)} className="hidden" />
                           <div className="flex items-center justify-center gap-3 p-5 bg-emerald-50 border-2 border-dashed border-brand-green/30 rounded-2xl group-hover:bg-emerald-100 transition-all">
                              <Image size={24} className="text-brand-green" />
                              <span className="text-sm font-black text-brand-green">
                                 {postImage ? postImage.name : "إضافة صورة"}
                              </span>
                           </div>
                        </label>
                        <button 
                          disabled={!newPostContent.trim() || isPosting}
                          onClick={handleCreatePost}
                          className="flex-[2] bg-stone-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-stone-900/20 active:scale-95 transition-all disabled:opacity-30"
                        >
                           {isPosting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
                           {isPosting ? 'جاري النشر...' : 'نشر الآن'}
                        </button>
                     </div>
                  </div>
               </motion.div>
            </div>
          )}
       </AnimatePresence>

       {/* Professional Upgrade Section */}
       {profile?.role === 'farmer' && (
         <div className="bg-gradient-to-br from-stone-900 to-stone-800 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/20 rounded-full blur-[100px] -mr-32 -mt-32" />
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-brand-green rounded-[28px] flex items-center justify-center shadow-xl shadow-brand-green/20">
                <ShieldCheck size={40} />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight">
                  {profile.professionalStatus === 'pending' ? 'طلبك قيد المراجعة' : 'كن عضواً محترفاً'}
                </h3>
                <p className="text-stone-400 text-sm mt-2 max-w-xs mx-auto">
                  {profile.professionalStatus === 'pending' 
                    ? 'فريق الإدارة يقوم حالياً بمراجعة معلوماتك المهنية. سيتم تفعيل حسابك فور الموافقة.'
                    : profile.professionalStatus === 'rejected'
                    ? 'لسوء الحظ، لم يتم قبول طلبك السابق. يمكنك مراجعة معلوماتك وإعادة التقديم.'
                    : 'ارتقِ بحسابك للوصول إلى مميزات حصرية للمختصين والتجار والموردين في AgroLife.'}
                </p>
              </div>
              {profile.professionalStatus !== 'pending' && (
                <button 
                  onClick={() => setShowUpgrade(true)}
                  className="bg-brand-green text-stone-900 font-black px-12 py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-green/20"
                >
                  {profile.professionalStatus === 'rejected' ? 'تعديل وإعادة إرسال' : 'إنشاء حساب احترافي الآن'}
                </button>
              )}
            </div>
         </div>
       )}

       {/* Information & Settings */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.3em] px-4">معلومات الحساب</h4>
            <div className="bg-white rounded-[40px] border border-stone-100 shadow-sm divide-y divide-stone-50 overflow-hidden">
              <div className="p-8 flex items-center gap-6">
                <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400">
                  <Activity size={26} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">تاريخ الانضمام</p>
                  <p className="text-lg font-black text-stone-800 tracking-tight mt-0.5">أفريل 2024</p>
                </div>
              </div>
              <div className="p-8 flex items-center gap-6">
                <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400">
                  <Globe size={26} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">التحقق من البريد</p>
                  <p className="text-lg font-black text-stone-800 tracking-tight mt-0.5 flex items-center gap-2">
                    {profile?.email} <CheckCircle size={16} className="text-emerald-500" />
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.3em] px-4">الإعدادات والتنبيهات</h4>
            <div className="bg-white rounded-[40px] border border-stone-100 shadow-sm overflow-hidden p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-brand-green rounded-2xl flex items-center justify-center">
                    <Bell size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-stone-900">إشعارات المتصفح</p>
                    <p className="text-[10px] text-stone-400">تلقي تنبيهات فورية عن السوق والرسائل</p>
                  </div>
                </div>
                <button 
                  onClick={handleNotificationsToggle}
                  className="w-14 h-8 bg-stone-100 rounded-full relative p-1 transition-all"
                >
                  <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
                </button>
              </div>
              <div className="flex items-center justify-between opacity-50 grayscale">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                    <Send size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-stone-900">إشعارات WhatsApp</p>
                    <p className="text-[10px] text-stone-400">قريباً عبر رقم هاتفك</p>
                  </div>
                </div>
                <div className="w-14 h-8 bg-stone-100 rounded-full relative p-1">
                   <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
                </div>
              </div>
            </div>
          </div>
       </div>

       <button onClick={onLogout} className="w-full p-8 bg-red-50 text-red-500 rounded-[40px] font-black uppercase tracking-[0.5em] text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-4 border-2 border-red-50 hover:border-red-100">
         <LogOut size={24} />
         تسجيل الخروج الآمن
       </button>

       {/* Professional Upgrade Modal */}
       <AnimatePresence>
         {showUpgrade && (
           <ProfessionalUpgradeModal 
             profile={profile} 
             onClose={() => setShowUpgrade(false)} 
             onSuccess={() => {
               setShowUpgrade(false);
               toast.success("تم إرسال طلب الترقية للمراجعة");
             }}
           />
         )}
       </AnimatePresence>
    </motion.div>
  );
};

const ProfessionalUpgradeModal = ({ profile, onClose, onSuccess }: { profile: UserProfile | null, onClose: () => void, onSuccess: () => void }) => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'veterinarian' | 'engineer' | 'supplier' | 'trader' | ''>('');
  const [form, setForm] = useState({ specialization: '', phone: '', bio: '' });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const toast = useToast();

  const roles = [
    { id: 'veterinarian', title: 'مختص بيطري', icon: Stethoscope, desc: 'للأطباء والخبراء في صحة الحيوان' },
    { id: 'engineer', title: 'مهندس فلاحي', icon: GraduationCap, desc: 'للمهندسين والمختصين في الزراعة والتربة' },
    { id: 'supplier', title: 'بائع عتاد', icon: Store, desc: 'لموردي الآلات والمستلزمات الزراعية' },
    { id: 'trader', title: 'تاجر', icon: Users, desc: 'لتجار المحاصيل والمواشي والمواد الغذائية' }
  ];

  const handleSubmit = async () => {
    if (!profile) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      let fileUrl = '';
      if (certFile) {
        // Clean filename to avoid issues
        const cleanName = certFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `certifications/${profile.uid}/${Date.now()}_${cleanName}`;
        
        try {
          // Use resumable upload with progress
          fileUrl = await uploadFileWithProgress(
            certFile, 
            path,
            (progress) => setUploadProgress(progress)
          );
        } catch (uploadErr) {
          console.error("Progress upload failed, falling back to simple upload:", uploadErr);
          // Fallback to simple upload if resumable fails
          fileUrl = await uploadFile(certFile, path);
        }
      }

      await submitProfessionalApplication({
        userId: profile.uid,
        userName: profile.displayName || 'Unnamed User',
        userEmail: profile.email || '',
        requestedRole: role as any,
        specialization: form.specialization,
        bio: form.bio,
        phone: form.phone,
        wilaya: profile.wilaya || 'غير محدد',
        commune: profile.commune || 'غير محدد',
        fileUrl
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" dir="rtl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white max-w-lg w-full rounded-[48px] overflow-hidden shadow-2xl relative z-10 flex flex-col h-[80vh]">
        <header className="p-8 border-b flex items-center justify-between">
           <h3 className="text-2xl font-black text-stone-900">إنشاء حساب احترافي</h3>
           <button onClick={onClose} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
           {step === 1 ? (
             <div className="space-y-6">
                <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-4">الخطوة 1: اختر تخصصك</p>
                <div className="grid grid-cols-1 gap-4">
                   {roles.map((r) => (
                     <button 
                       key={r.id}
                       onClick={() => setRole(r.id as any)}
                       className={`p-6 rounded-[32px] border-2 transition-all text-right flex items-center gap-6 group ${role === r.id ? 'border-brand-green bg-emerald-50' : 'border-stone-100 hover:border-brand-green/30 hover:bg-stone-50'}`}
                     >
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${role === r.id ? 'bg-brand-green text-white shadow-lg' : 'bg-stone-50 text-stone-300 group-hover:text-brand-green'}`}>
                         <r.icon size={26} />
                       </div>
                       <div>
                         <h4 className="text-lg font-black text-stone-900">{r.title}</h4>
                         <p className="text-xs text-stone-400 font-medium">{r.desc}</p>
                       </div>
                     </button>
                   ))}
                </div>
             </div>
           ) : (
             <div className="space-y-6">
                <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-4">الخطوة 2: المعلومات المهنية</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 mr-2 uppercase tracking-widest">التخصص الدقيق</label>
                    <input 
                      placeholder="مثال: تربية الدواجن، تخصص حمضيات، معدات حرث..."
                      value={form.specialization}
                      onChange={(e) => setForm({...form, specialization: e.target.value})}
                      className="w-full p-5 bg-stone-50 border-2 border-transparent focus:border-brand-green rounded-[24px] outline-none text-sm font-bold transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 mr-2 uppercase tracking-widest">رقم الهاتف المهني</label>
                    <input 
                      placeholder="0xxxxxxxxx"
                      value={form.phone}
                      onChange={(e) => setForm({...form, phone: e.target.value})}
                      className="w-full p-5 bg-stone-50 border-2 border-transparent focus:border-brand-green rounded-[24px] outline-none text-sm font-bold transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 mr-2 uppercase tracking-widest">نبذة عن خبرتك</label>
                    <textarea 
                      rows={4}
                      placeholder="اكتب نبذة مختصرة عن مؤهلاتك وما تقدمه..."
                      value={form.bio}
                      onChange={(e) => setForm({...form, bio: e.target.value})}
                      className="w-full p-5 bg-stone-50 border-2 border-transparent focus:border-brand-green rounded-[24px] outline-none text-sm font-bold transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 mr-2 uppercase tracking-widest">إرفاق شهادة أو وثيقة (اختياري)</label>
                    <div className="relative group">
                      <input 
                        type="file"
                        onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full p-5 bg-emerald-50 border-2 border-dashed border-brand-green/30 rounded-[24px] flex items-center justify-center gap-3 group-hover:bg-emerald-100/50 transition-all">
                        <Image size={24} className="text-brand-green" />
                        <span className="text-sm font-bold text-brand-green">
                          {certFile ? certFile.name : 'اضغط لإضافة ملف أو صورة'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {uploading && (
                    <div className="space-y-4 p-8 bg-emerald-50 rounded-[40px] border-2 border-brand-green/20 shadow-inner">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-brand-green rounded-xl flex items-center justify-center animate-pulse">
                            <Image size={16} className="text-white" />
                          </div>
                          <span className="text-xs font-black text-stone-900 uppercase tracking-widest">جاري رفع الملف...</span>
                        </div>
                        <span className="text-sm font-black text-brand-green">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="h-4 bg-white rounded-full overflow-hidden border border-stone-100 p-1">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          className="h-full bg-brand-green rounded-full shadow-lg"
                        />
                      </div>
                      <p className="text-[10px] text-stone-400 font-bold text-center">يرجى عدم إغلاق النافذة حتى اكتمال العملية</p>
                    </div>
                  )}
                </div>
             </div>
           )}
        </div>

        <footer className="p-8 border-t bg-stone-50 flex gap-4">
           {step === 2 && (
             <button onClick={() => setStep(1)} className="flex-1 py-5 bg-white border border-stone-200 rounded-2xl font-black text-stone-600 active:scale-95 transition-all">رجوع</button>
           )}
           {step === 1 ? (
             <button 
               disabled={!role}
               onClick={() => setStep(2)}
               className="flex-[2] py-5 bg-stone-900 text-white rounded-2xl font-black shadow-xl disabled:opacity-30 active:scale-95 transition-all"
             >
               المتابعة
             </button>
           ) : (
             <button 
               disabled={!form.specialization || !form.phone || uploading}
               onClick={handleSubmit}
               className="flex-[2] py-5 bg-brand-green text-stone-900 font-black rounded-2xl shadow-xl shadow-brand-green/20 disabled:opacity-30 active:scale-95 transition-all"
             >
               {uploading ? 'جاري الرفع والإرسال...' : 'إرسال الملف للمراجعة'}
             </button>
           )}
        </footer>
      </motion.div>
    </div>
  );
};

const RenderAdmin = () => {
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'requests' | 'audit'>('stats');
  const [applications, setApplications] = useState<ProfessionalApplication[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserPosts, setSelectedUserPosts] = useState<CommunityPost[] | null>(null);
  const toast = useToast();

  useEffect(() => {
    const fetchAll = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      dispatch({ type: 'SET_USERS', payload: users });
    };
    fetchAll();

    const unsubApps = onSnapshot(
      query(collection(db, 'professionalApplications'), where('status', '==', 'pending')),
      (snap) => {
        setApplications(snap.docs.map(d => ({ ...d.data(), id: d.id } as ProfessionalApplication)));
      },
      (err) => console.error("Admin Applications Error:", err)
    );
    return () => unsubApps();
  }, []);

  const handleResolveApp = async (app: ProfessionalApplication, status: 'approved' | 'rejected') => {
    setProcessing(app.id);
    try {
      await resolveProfessionalApplication(app.id, app.userId, status, app.requestedRole);
      toast.success(status === 'approved' ? "تم قبول الطلب وتفعيل الحساب" : "تم رفض الطلب");
    } catch (err) {
      toast.error("حدث خطأ أثناء معالجة الطلب");
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleBlock = async (user: UserProfile) => {
    const newStatus = !user.isBlocked;
    try {
      await updateDoc(doc(db, 'users', user.uid), { isBlocked: newStatus });
      dispatch({ type: 'SET_USERS', payload: state.users.map(u => u.uid === user.uid ? { ...u, isBlocked: newStatus } : u) });
      toast.success(newStatus ? "تم حظر المستخدم" : "تم إلغاء الحظر");
    } catch (err) {
      toast.error("حدث خطأ");
    }
  };

  const handleUpdateRole = async (user: UserProfile, newRole: UserProfile['role']) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      dispatch({ type: 'SET_USERS', payload: state.users.map(u => u.uid === user.uid ? { ...u, role: newRole } : u) });
      toast.success(`تم تغيير رتبة ${user.displayName} إلى ${newRole}`);
    } catch (err) {
      toast.error("فشل في تغيير الرتبة");
    }
  };

  const viewUserActivity = async (uid: string) => {
    setProcessing(uid);
    try {
      // Fallback: Fetch all communities, then posts for this user in each
      // This avoids collectionGroup index issues in some environments
      const communitiesSnap = await getDocs(collection(db, 'communities'));
      const allUserPosts: CommunityPost[] = [];
      
      for (const communityDoc of communitiesSnap.docs) {
        const postsRef = collection(db, 'communities', communityDoc.id, 'posts');
        const q = query(postsRef, where('authorId', '==', uid));
        const postsSnap = await getDocs(q);
        postsSnap.docs.forEach(d => {
          allUserPosts.push({ ...d.data() as any, id: d.id } as CommunityPost);
        });
      }
      
      setSelectedUserPosts(allUserPosts);
    } catch (err) {
      console.error("Activity Load Error:", err);
      toast.error("فشل في تحميل النشاطات - تأكد من وجود صلاحيات الأدمن");
    } finally {
      setProcessing(null);
    }
  };

  const filteredUsers = state.users.filter(u => {
    const searchMatch = !searchTerm || 
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.wilaya?.toLowerCase().includes(searchTerm.toLowerCase());
    return searchMatch;
  });

  const statsByRole = (role: string) => state.users.filter(u => u.role === role).length;
  const pendingExperts = state.users.filter(u => (u.role === 'veterinarian' || u.role === 'engineer') && !u.isVerified);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-24">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-stone-900 tracking-tighter">Command Center</h2>
          <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Administrative Control Panel</p>
        </div>
        
        <div className="flex bg-stone-100 p-1.5 rounded-[24px] overflow-x-auto no-scrollbar">
          {(['stats', 'users', 'requests', 'audit'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {tab === 'stats' ? 'Overview' : tab === 'users' ? 'User Mgmt' : tab === 'requests' ? 'Approvals' : 'Log'}
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
             <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
                  <input 
                    placeholder="البحث عن مستخدم بالاسم، الإيميل، أو الولاية..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-stone-100 text-sm font-bold outline-none focus:border-brand-green transition-all shadow-sm text-right"
                    dir="rtl"
                  />
                </div>
             </div>

             <div className="bg-white rounded-[48px] border border-stone-100 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-right" dir="rtl">
                   <thead className="bg-stone-50 border-b border-stone-100">
                     <tr>
                       <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">المستخدم</th>
                       <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">الرتبة</th>
                       <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">الولاية/البلد</th>
                       <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">الحالة</th>
                       <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">الإجراءات</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-stone-50">
                     {filteredUsers.map((user) => (
                       <tr key={user.uid} className={`hover:bg-stone-50 transition-colors ${user.isBlocked ? 'bg-red-50/30' : ''}`}>
                         <td className="px-8 py-5">
                           <div className="flex items-center gap-4 py-1">
                             <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100`} className="w-10 h-10 rounded-2xl border-2 border-white shadow-sm" />
                             <div>
                               <p className={`font-black tracking-tight ${user.isBlocked ? 'text-red-600 line-through' : 'text-stone-900'}`}>{user.displayName || 'بدون اسم'}</p>
                               <p className="text-[10px] text-stone-400 font-medium font-mono">{user.email}</p>
                             </div>
                           </div>
                         </td>
                         <td className="px-8 py-5">
                            <select 
                               value={user.role} 
                               onChange={(e) => handleUpdateRole(user, e.target.value as any)}
                               className="text-[10px] font-black bg-stone-100 px-3 py-1.5 rounded-xl uppercase tracking-widest text-stone-700 border-none outline-none focus:ring-2 focus:ring-brand-green/20 transition-all cursor-pointer"
                             >
                               <option value="farmer">Farmer</option>
                               <option value="veterinarian">Veterinarian</option>
                               <option value="engineer">Engineer</option>
                               <option value="supplier">Supplier</option>
                               <option value="trader">Trader</option>
                               <option value="admin">Admin</option>
                             </select>
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-stone-700">{user.wilaya || 'غير محدد'}</span>
                              <span className="text-[8px] text-stone-300 font-black uppercase tracking-tighter">Algeria (DZ)</span>
                            </div>
                         </td>
                         <td className="px-8 py-5">
                           <div className="flex items-center gap-4">
                             {user.isVerified && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                             <span className={`text-[10px] font-black uppercase tracking-widest ${user.isBlocked ? 'text-red-500' : 'text-stone-400'}`}>
                               {user.isBlocked ? 'Blocked' : user.isVerified ? 'Verified' : 'Active'}
                             </span>
                           </div>
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => viewUserActivity(user.uid)}
                                className="p-2 text-stone-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-all"
                                title="عرض النشاطات"
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                onClick={() => handleToggleBlock(user)}
                                className={`p-2 rounded-lg transition-all ${user.isBlocked ? 'text-emerald-500 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}
                                title={user.isBlocked ? 'إلغاء الحظر' : 'حظر المستخدم'}
                              >
                                {user.isBlocked ? <ShieldCheck size={18} /> : <Ban size={18} />}
                              </button>
                              <button className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </motion.div>
        )}

        {/* Selected User Activity Modal */}
        <AnimatePresence>
          {selectedUserPosts && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6" dir="rtl">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUserPosts(null)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white max-w-2xl w-full rounded-[48px] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]">
                 <header className="p-8 border-b flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-stone-900">سجل نشاطات المستخدم</h3>
                      <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">مراقبة المنشورات والنشاط العام</p>
                    </div>
                    <button onClick={() => setSelectedUserPosts(null)} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                 </header>

                 <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
                    {selectedUserPosts.length > 0 ? selectedUserPosts.map(post => (
                      <div key={post.id} className="p-8 bg-stone-50 rounded-[32px] border border-stone-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="bg-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-stone-100">POST #{post.id.slice(-4)}</span>
                          <span className="text-[10px] text-stone-300 font-bold">منذ يومين</span>
                        </div>
                        <h4 className="text-lg font-black text-stone-900">{post.title}</h4>
                        <p className="text-stone-500 text-sm leading-relaxed">{post.content}</p>
                        <div className="flex gap-2 pt-2">
                           <button className="px-4 py-2 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-100 transiti">Delete Post</button>
                           <button className="px-4 py-2 bg-stone-200 text-stone-600 text-[10px] font-black uppercase tracking-widest rounded-xl">Keep</button>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-20 bg-stone-50 rounded-[40px] border-2 border-dashed border-stone-100">
                         <Activity size={48} className="mx-auto mb-4 opacity-10" />
                         <p className="text-xs font-black uppercase tracking-widest text-stone-300">لا يوجد منشورات حالياً لهذا المستخدم</p>
                      </div>
                    )}
                 </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>

        {activeTab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Members', value: state.users.length, color: 'bg-stone-900', icon: Users },
                { label: 'Verified Experts', value: state.users.filter(u => u.isVerified).length, color: 'bg-emerald-500', icon: ShieldCheck },
                { label: 'Blocked Users', value: state.users.filter(u => u.isBlocked).length, color: 'bg-red-500', icon: Ban },
                { label: 'Market Products', value: 0, color: 'bg-brand-blue', icon: Store }
              ].map((s, i) => (
                <div key={i} className={`${s.color} p-8 rounded-[40px] text-white shadow-xl flex flex-col gap-4`}>
                   <s.icon size={28} className="opacity-40" />
                   <div>
                     <p className="text-3xl font-black">{s.value}</p>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.label}</p>
                   </div>
                </div>
              ))}
            </div>

            <section className="bg-white p-10 rounded-[56px] border border-stone-100 shadow-sm">
               <h3 className="text-2xl font-black text-stone-900 tracking-tighter mb-8">Role Distribution</h3>
               <div className="space-y-6">
                 {['farmer', 'veterinarian', 'engineer', 'supplier', 'trader', 'admin'].map(role => {
                   const count = state.users.filter(u => u.role === role).length;
                   const percentage = state.users.length > 0 ? (count / state.users.length) * 100 : 0;
                   return (
                     <div key={role} className="space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                         <span className="text-stone-400">{role}</span>
                         <span className="text-stone-900">{count} Members</span>
                       </div>
                       <div className="h-3 bg-stone-50 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }} 
                           animate={{ width: `${percentage}%` }} 
                           className={`h-full ${role === 'admin' ? 'bg-stone-900' : 'bg-brand-green'}`} 
                         />
                       </div>
                     </div>
                   );
                 })}
               </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div key="requests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <h3 className="text-2xl font-black text-stone-900 tracking-tighter">طلبات الحسابات الاحترافية المعلقة</h3>
            <div className="space-y-4">
              {applications.map(app => (
                <div key={app.id} className="bg-white p-10 rounded-[48px] border border-stone-100 shadow-sm space-y-8">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-50">
                      <div className="flex items-center gap-6">
                         <div className="w-20 h-20 bg-stone-50 rounded-[32px] flex items-center justify-center text-stone-300">
                           <User size={32} />
                         </div>
                         <div>
                            <h4 className="text-xl font-black text-stone-900">{app.userName}</h4>
                            <p className="text-xs text-stone-400 font-bold">{app.userEmail}</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="bg-stone-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{app.requestedRole}</span>
                        <span className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{app.wilaya}</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <div className="bg-stone-50 p-6 rounded-3xl">
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2 font-sans">التخصص</p>
                            <p className="text-sm font-bold text-stone-700">{app.specialization}</p>
                         </div>
                         <div className="bg-stone-50 p-6 rounded-3xl">
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2 font-sans">رقم الهاتف</p>
                            <p className="text-sm font-bold text-stone-700">{app.phone}</p>
                         </div>
                      </div>
                      <div className="bg-stone-50 p-6 rounded-3xl h-full flex flex-col gap-3">
                         <div>
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2 font-sans">النبذة المهنية</p>
                            <p className="text-sm font-bold text-stone-700 leading-relaxed italic">"{app.bio}"</p>
                         </div>
                         {app.fileUrl && (
                           <a 
                             href={app.fileUrl} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="mt-auto flex items-center justify-center gap-2 py-3 bg-white border border-stone-200 rounded-xl text-[10px] font-black text-brand-green hover:bg-stone-100 transition-all uppercase tracking-widest"
                           >
                             <Eye size={14} /> عرض الملف المرفق
                           </a>
                         )}
                      </div>
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button 
                        disabled={processing === app.id}
                        onClick={() => handleResolveApp(app, 'approved')}
                        className="flex-1 bg-brand-green text-stone-900 font-black py-5 rounded-2xl shadow-xl shadow-brand-green/20 hover:scale-105 active:scale-95 transition-all"
                      >
                         {processing === app.id ? 'جاري المعالجة...' : 'قبول الطلب وتفعيل الحساب'}
                      </button>
                      <button 
                        disabled={processing === app.id}
                        onClick={() => handleResolveApp(app, 'rejected')}
                        className="px-10 bg-rose-50 text-rose-500 font-black py-5 rounded-2xl hover:bg-rose-100 transition-all"
                      >
                         رفض
                      </button>
                   </div>
                </div>
              ))}
              {applications.length === 0 && (
                <div className="text-center py-24 bg-stone-50 border-4 border-dashed border-stone-100 rounded-[56px] text-stone-300">
                   <ShieldCheck size={64} className="mx-auto mb-4 opacity-5" />
                   <p className="text-sm font-black uppercase tracking-[0.3em]">لا يوجد طلبات احترافية معلقة حالياً</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="bg-white rounded-[48px] border border-stone-100 shadow-sm overflow-hidden p-10">
              <h3 className="text-2xl font-black text-stone-900 mb-8">سجل النشاطات (Audit Log)</h3>
              <div className="space-y-6">
                {state.auditLog.length > 0 ? state.auditLog.map((log) => (
                  <div key={log.id} className="flex gap-6 pb-6 border-b border-stone-50 last:border-0 last:pb-0">
                    <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 flex-shrink-0">
                      <Activity size={20} />
                    </div>
                    <div>
                      <p className="font-black text-stone-900 leading-tight">{log.action}</p>
                      <p className="text-xs text-stone-500 mt-1">{log.details}</p>
                      <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest mt-2">{log.timestamp}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-20 text-stone-300">
                    <p className="text-xs font-black uppercase tracking-widest">السجل فارغ حالياً</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AIChat = ({ lang, onClose, weather }: { lang: Language, onClose: () => void, weather: WeatherData | null }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string, image?: string, audio?: string }[]>([
    { role: 'bot', text: lang === 'ar' ? "مرحباً! أنا خبير AGROLIFE الذكي. كيف يمكنني مساعدتك في مزرعتك اليوم؟" : "Hello! I'm the AGROLIFE Smart Expert. How can I assist your farm today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await sendMessage(null, blob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async (overrideText?: string | null, audioBlob?: Blob) => {
    if (!input.trim() && !selectedImage && !audioBlob && overrideText === undefined) return;
    const userMsg = overrideText !== undefined ? (overrideText || "") : input.trim();
    const currentImage = imagePreview;
    const currentFile = selectedImage;
    let currentAudioUrl = "";

    if (audioBlob) {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      currentAudioUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
    }

    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMsg, 
      image: currentImage || undefined,
      audio: currentAudioUrl || undefined
    }]);
    
    setInput("");
    setSelectedImage(null);
    setImagePreview(null);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      let contents: any[] = [];
      
      if (currentFile) {
        const base64 = await fileToBase64(currentFile);
        contents.push({ inlineData: { mimeType: currentFile.type, data: base64 } });
      }

      if (audioBlob) {
        const base64 = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.readAsDataURL(audioBlob);
          r.onloadend = () => resolve((r.result as string).split(',')[1]);
        });
        contents.push({ inlineData: { mimeType: audioBlob.type, data: base64 } });
      }

      const weatherContext = weather ? `Current Environment Context: 
      - Temperature: ${weather.temp}°C
      - Condition: ${weather.condition}
      - Humidity: ${weather.humidity}%
      - Wind: ${weather.windSpeed} km/h` : "No environment data available.";

      contents.push({ text: `${weatherContext} 
      User Query: ${userMsg || (audioBlob ? (lang === 'ar' ? "حلل هذه الرسالة الصوتية وقدم نصيحة زراعية." : "Analyze this voice message and provide agricultural advice.") : (lang === 'ar' ? "حلل هذه الصورة وقدم نصيحة زراعية." : "Analyze this image and provide agricultural advice."))}` });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: contents },
        config: {
          systemInstruction: `You are AGROLIFE AI, a high-level agricultural and veterinary expert in Algeria. 
          Use the provided Environment Context (Weather) to make your advice hyper-localized and accurate. 
          - If it's raining, consider humidity-related diseases. 
          - If it's hot, focus on irrigation and heat stress. 
          Provide technical, localized advice for the Algerian climate and regulations. 
          Language: ${lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : 'English'}.`
        }
      });
      setMessages(prev => [...prev, { role: 'bot', text: response.text || "Connection error." }]);
    } catch (err) {
      console.error("AI Error:", err);
      setMessages(prev => [...prev, { role: 'bot', text: "Service temporarily unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }} 
      animate={{ y: 0, opacity: 1 }} 
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-white z-[60] flex flex-col font-sans"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <header className="p-4 lg:p-8 border-b flex items-center justify-between bg-stone-900 text-white shadow-xl">
        <div className="flex items-center gap-3 lg:gap-5">
          <div className="w-10 h-10 lg:w-14 lg:h-14 bg-brand-green/20 rounded-[15px] lg:rounded-[20px] flex items-center justify-center border-2 border-brand-green/30">
            <Bot size={24} className="text-brand-green" />
          </div>
          <div>
            <h3 className="font-black text-sm lg:text-xl uppercase tracking-tighter">AgroLife Assistant</h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] lg:text-[10px] text-stone-400 font-black uppercase tracking-widest">System Operational</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-3 lg:p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><LogOut size={20} className="rotate-90 text-stone-400 lg:scale-110" /></button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8 bg-stone-50">
        {messages.map((m, i) => (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] lg:max-w-[85%] p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] text-sm lg:text-base shadow-2xl leading-relaxed space-y-4 ${
              m.role === 'user' ? 'bg-stone-900 text-white rounded-tr-none' : 'bg-white text-stone-700 rounded-tl-none border border-stone-100 shadow-stone-950/5'
            }`}>
              {m.image && <img src={m.image} className="w-full max-h-48 lg:max-h-60 object-cover rounded-2xl mb-2" referrerPolicy="no-referrer" />}
              {m.audio && <audio src={m.audio} controls className="w-full h-8 filter saturate-0 invert brightness-50" />}
              <p>{m.text}</p>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white p-4 lg:p-6 rounded-[32px] shadow-sm animate-pulse flex gap-2">
               <div className="w-2 h-2 bg-brand-green rounded-full animate-bounce" />
               <div className="w-2 h-2 bg-brand-green rounded-full animate-bounce delay-75" />
               <div className="w-2 h-2 bg-brand-green rounded-full animate-bounce delay-150" />
             </div>
          </div>
        )}
      </div>

      <div className="p-4 lg:p-8 bg-white border-t-2 border-stone-50 space-y-4">
        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} className="w-20 h-20 lg:w-24 lg:h-24 object-cover rounded-2xl border-4 border-stone-100 shadow-md" />
            <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"><X size={14} /></button>
          </div>
        )}
        <div className="flex gap-2 lg:gap-4 items-center">
          {isRecording ? (
            <button onClick={stopRecording} className="p-4 lg:p-6 bg-red-50 text-red-500 rounded-[20px] lg:rounded-[28px] animate-pulse shadow-lg"><Activity size={24} /></button>
          ) : (
            <button onClick={startRecording} className="p-4 lg:p-6 bg-stone-50 rounded-[20px] lg:rounded-[28px] text-stone-400 hover:text-brand-green transition-all shadow-sm"><Mic size={24} /></button>
          )}

          <label className="cursor-pointer p-4 lg:p-6 bg-stone-50 border-2 border-stone-100 rounded-[20px] lg:rounded-[28px] text-stone-400 hover:text-brand-green transition-all shadow-sm">
            <Image size={24} />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </label>
          <input 
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={lang === 'ar' ? "اسأل AI..." : "Ask AI..."} 
            className="flex-1 p-4 lg:p-6 bg-stone-50 border-2 border-stone-100 rounded-[20px] lg:rounded-[28px] outline-none focus:border-brand-green text-sm font-bold shadow-inner" 
          />
          <button onClick={() => sendMessage()} disabled={loading} className="bg-brand-green text-white px-6 lg:px-10 py-4 lg:p-6 rounded-[20px] lg:rounded-[28px] shadow-2xl disabled:opacity-50 active:scale-95 transition-all flex items-center gap-2 group">
            <span className="text-[10px] font-black uppercase tracking-widest">{lang === 'ar' ? 'إرسال' : 'Send'}</span>
            <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- App Entry ---

export default function App() {
  const [step, setStep] = useState<"splash" | "lang" | "auth" | "dashboard">("splash");
  const [lang, setLang] = useState<Language>("ar");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const p = await syncUserProfile(user);
        setProfile(p);
        setStep("dashboard");
      } else {
        setProfile(null);
        if (step === "dashboard") setStep("auth");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    setStep("auth");
  };

  return (
    <Router>
      <div className="font-sans antialiased text-stone-900 bg-white overflow-x-hidden">
        <AnimatePresence mode="wait">
          {step === "splash" && <Splash key="splash" onComplete={() => setStep("lang")} />}
          {step === "lang" && <LanguageSelector key="lang" onSelect={(l) => { setLang(l); setStep("auth"); }} />}
          {step === "auth" && <Auth key="auth" lang={lang} onAuth={() => setStep("dashboard")} onBack={() => setStep("lang")} />}
          {step === "dashboard" && <Dashboard key="dashboard" lang={lang} profile={profile} onLogout={handleLogout} />}
        </AnimatePresence>
      </div>
    </Router>
  );
}
