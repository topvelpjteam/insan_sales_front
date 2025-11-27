import { JSX, Suspense, memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from "react-i18next";
import Properties from '@/system/Properties';
import { setAgentId } from "@/system/store/redux/agent";
import { setStaffData } from "@/system/store/redux/staff";
// import {
//   FaBell,
//   FaEnvelope,
//   FaUser,
//   FaClipboard,
//   FaComment,
//   FaTools,
//   FaSignOutAlt,   // 🔒 로그아웃 아이콘
//   FaFileAlt,      // 📄 문서 아이콘
//   FaUserCircle,   // 👤 사용자 정보
// } from "react-icons/fa";

import {
  // 기본 아이콘들
  Code,
  ShoppingCart,
  TrendingUp,
  Package,
  History,
  LayoutDashboard,
  Box,
  Database,
  FileText,
  Eye,
  Plus,
  PlusSquare,
  Truck,
  Search,
  MapPin,
  Edit,
  DollarSign,
  Monitor,
  Activity,
  CreditCard,
  Calendar,
  Bell,
  Home,
  //Sitemap,

  // 추가 유용한 아이콘들
  User,
  Users,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  Star,
  Heart,
  Bookmark,
  Download,
  Upload,
  Share,
  Copy,
  Trash2,
  Save,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Menu,
  MoreHorizontal,
  MoreVertical,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Key,
  LogIn,
  LogOut,
  UserPlus,
  UserMinus,
  Mail,
  Phone,
  MessageSquare,
  Send,
  Paperclip,
  Image,
  File,
  Folder,
  FolderOpen,
  Archive,
  Tag,
  Tags,
  Flag,
  Book,
  BookOpen,
  Globe,
  //Link,
  ExternalLink,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Volume2,
  VolumeX,
  Play,
  Pause,
  // Stop,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Mic,
  MicOff,
  Camera,
  Video,
  VideoOff,
  Headphones,
  Speaker,
  Printer,
  Scan,
  QrCode,
  //Barcode,
  Smartphone,
  Tablet,
  Laptop,
  // Desktop,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Wrench,
  Hammer,
  //Screwdriver,
  Cog,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Power,
  PowerOff,
  Zap,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Droplets,
  Flame,
  Snowflake,
  Umbrella,
  TreePine,
  Leaf,
  Flower,
  Bug,
  Fish,
  Bird,
  Cat,
  Dog,
  HeartHandshake,
  Hand,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh,
  Laugh,
  Angry,
  //LucideIcon
} from 'lucide-react';
import logoImg from "@/assets/logo.png";
import { useToast } from "@/system/hook/ToastContext";
import { useCustomContents } from "@/system/hook/ManagerProvider";
import { loadLanguageFromApi } from "@/system/i18n/i18n";
import { useApiCallService } from "@/system/ApiCallService";
// agentId 
import { getAgentId, getAgentData } from "@/system/store/redux/agent";
import { getStaffData } from "@/system/store/redux/staff";

const Header = ({ openTab }) => {
  const { onLogout, request } = useApiCallService();
  const dispatch = useDispatch();
  const location = useLocation();

  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);

  // 로그인 agent 정보
  //const agentInfo = useSelector((state) => state.agent);

  const agentId = useSelector(getAgentId);
  const agentData = useSelector(getAgentData);
  const staffData = useSelector(getStaffData);

  const { t, i18n } = useTranslation();
  //const dispatch = useDispatch();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { showToast, showMessageModal, showConfirmModal, showPopupModal } =
    useCustomContents();

  const changeLanguage = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  //const [selectedAgent, setSelectedAgent] = useState("");

  // 선택 된 agentId를 store에 저장 하여 모든 프로그램에서 사용 하도록 한다.
  const handleSelectChange = async (e) => {
    const newValue = e.target.value;
    //console.log('newValue', newValue);

    // agent 선택 시 
    await dispatch(setAgentId(newValue));
    await getStaffDataList(newValue);
  };

  /**
   * 매장 선택 시 각 매장의 staff목록을 조회 하여 store에 저장한다.
   * 
   */
  const getStaffDataList = useCallback(async (agentId) => {
    const payload = {
      action: "selectStaffList",
      source: Properties.requestUrl.login.source,
      sourceTitle: Properties.requestUrl.login.sourceTitle,
      payload: {
        agentId
      },
    };

    const res = await request("domain/insanga/store/system", payload, {}, "post", 'json');
    if (res?.data?.body) {
      await dispatch(setStaffData(res?.data?.body));
    } else {
      await dispatch(setStaffData([]));
    }

  }, [dispatch, request]);

  return (
    <header className='header'>
      {/* Left Logo */}
      <div className='logo'>매장관리 시스템</div>

      {/* Right Section */}
      <div className='header-actions'>
        {/* Text Buttons */}
        <div className='button-group'>
          <select
            value={agentId || ""}
            onChange={handleSelectChange}
          >
            <option value="">매장을 선택해주세요</option>
            {agentData.map((agent) => (
              <option key={agent.agentId} value={agent.agentId}>
                [{agent.agentId}] {agent.agentNm}
              </option>
            ))}
          </select>
          <select onChange={changeLanguage}>
            <option value="ko">{t("Korean")}</option>
            <option value="en">{t("English")}</option>
          </select>

          {
            [
              { label: t("Logout"), action: onLogout },
              // { label: "성공", action: () => showToast(`성공`, "success") },
              // { label: "에러", action: () => showToast(`에러`, "error") },
              // {
              //   label: "메세지",
              //   action: () =>
              //     showMessageModal({
              //       title: "알림",
              //       content: "이것은 단순 메시지입니다.",
              //     }),
              // },
              // {
              //   label: "Confirm",
              //   action: () =>
              //     showConfirmModal({
              //       title: "확인 필요",
              //       content: "이 작업을 진행하시겠습니까?",
              //       onConfirm: () => showToast("확인 완료!", "success"),
              //     }),
              // },
            ].map((item, index) => (
              <span
                key={index}
                style={{
                  padding: "7px 10px",
                  borderRadius: 0,
                  cursor: "pointer",
                  transition: "0.2s",
                  border: '1px solid #ddd',
                }}
                onMouseEnter={(e) => (e.target.style.background = "#f1f3f5")}
                onMouseLeave={(e) => (e.target.style.background = "transparent")}
                onClick={item.action}
              >
                {item.label}
              </span>
            ))
          }
        </div >

        {/* User Info */}
        < div
          ref={userRef}
          style={{ position: "relative", marginLeft: '10px' }}
          onClick={() => setPopoverOpen((prev) => !prev)}
        >
          <span
            style={{
              padding: "5px 6px",
              borderRadius: 4,
              border: "1px solid #d0d5db",
              cursor: "pointer",
              transition: "0.2s",
              background: "#fafbfc",
            }}
            onMouseEnter={(e) => (e.target.style.borderColor = "#007bff")}
            onMouseLeave={(e) => (e.target.style.borderColor = "#d0d5db")}
          >
            {user.emplNm} <i className='ri-arrow-drop-down-line' />
          </span>

          {/* Popover */}
          {
            popoverOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "31px",
                  right: 0,
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  padding: "14px 18px",
                  width: 220,
                  boxShadow: "0 6px 14px rgba(0,0,0,0.15)",
                  animation: "fadeIn 0.15s ease-out",
                  zIndex: 999,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: "#212529" }}>
                  {user?.emplNm}
                </div>
                <div style={{ fontSize: 12, marginTop: 4, color: "#555" }}>
                  {user?.deptNm}
                </div>

                <hr
                  style={{
                    margin: "10px 0",
                    border: 0,
                    borderTop: "1px solid #eee",
                  }}
                />

                <div
                  style={{
                    fontSize: 12,
                    color: "#007bff",
                    textAlign: "right",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    showPopupModal({
                      title: "사용자 상세 보기",
                      component: () => (
                        <div>
                          <p><b>이름:</b> {user?.emplNm}</p>
                          <p><b>부서:</b> {user?.deptNm}</p>
                        </div>
                      ),
                    })
                  }
                >
                  상세보기 <i className='ri-arrow-right-line' />
                </div>
              </div>
            )
          }
        </div >
      </div >
    </header >
  );
};

export default memo(Header);
