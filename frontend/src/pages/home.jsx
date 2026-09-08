import React, { useContext, useState, useEffect, useRef } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/homeDashboard.module.css';
import { Avatar } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import EventIcon from '@mui/icons-material/Event';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import CallIcon from '@mui/icons-material/Call';
import HistoryIcon from '@mui/icons-material/History';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { AuthContext } from '../contexts/AuthContext';

const POPUP_SECONDS = 60;

function HomeComponent() {
    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduledTitle, setScheduledTitle] = useState("Meetora Video Call");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledCode, setScheduledCode] = useState("");
    const [copied, setCopied] = useState(false);

    // Meeting Created Popup state
    const [meetingPopup, setMeetingPopup] = useState(null); // { code, link, navigateTo }
    const [countdown, setCountdown] = useState(POPUP_SECONDS);
    const [codeCopied, setCodeCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const countdownRef = useRef(null);

    const { addToUserHistory, userData, setUserData } = useContext(AuthContext);

    // -------- Meeting Popup Countdown --------
    useEffect(() => {
        if (meetingPopup) {
            setCountdown(POPUP_SECONDS);
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current);
                        // Auto-join when countdown hits 0
                        navigate(meetingPopup.navigateTo);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [meetingPopup]);

    const showMeetingCreatedPopup = (code) => {
        const link = `${window.location.origin}/${code}`;
        setMeetingPopup({ code, link, navigateTo: `/${code}` });
        setCodeCopied(false);
        setLinkCopied(false);
    };

    const dismissPopup = () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setMeetingPopup(null);
    };

    const joinMeetingNow = async () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        const code = meetingPopup.code;
        setMeetingPopup(null);
        await addToUserHistory(code);
        navigate(`/${code}`);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(meetingPopup.code);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2500);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(meetingPopup.link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
    };

    // -------- Call Handlers --------
    const handleCallNow = async () => {
        const randomCode = Math.random().toString(36).substring(2, 9);
        await addToUserHistory(randomCode);
        showMeetingCreatedPopup(randomCode);
    };

    const handleJoinVideoCall = async () => {
        if (!meetingCode.trim()) return;
        const code = meetingCode.trim().split('/').pop();
        await addToUserHistory(code);
        navigate(`/${code}`);
    };

    const handleOpenScheduleModal = () => {
        const randomCode = Math.random().toString(36).substring(2, 9);
        setScheduledCode(randomCode);
        const now = new Date();
        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
        const isoString = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setScheduledDate(isoString);
        setCopied(false);
        setShowScheduleModal(true);
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/${scheduledCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const handleStartScheduledMeeting = async () => {
        setShowScheduleModal(false);
        const code = scheduledCode;
        await addToUserHistory(code);
        showMeetingCreatedPopup(code);
    };

    // -------- User Info --------
    const getFirstName = () => {
        if (!userData) return "User";
        if (userData.name) return userData.name.trim().split(" ")[0];
        if (userData.username) return userData.username.trim().split(" ")[0];
        return "User";
    };

    const firstName = getFirstName();
    const userInitial = firstName.charAt(0).toUpperCase();

    return (
        <div className={styles.dashboardContainer}>
            {/* ---- Meeting Created Popup ---- */}
            {meetingPopup && (
                <div className={styles.meetingPopupOverlay}>
                    <div className={styles.meetingPopupCard}>
                        {/* Header */}
                        <div className={styles.popupHeader}>
                            <div className={styles.popupIconBox}>
                                <VideoCallIcon fontSize="inherit" />
                            </div>
                            <div>
                                <p className={styles.popupTitle}>Meeting Created! 🎉</p>
                                <p className={styles.popupSubtitle}>Share the code or link — others can join instantly.</p>
                            </div>
                        </div>

                        {/* Meeting Code */}
                        <p className={styles.popupSectionLabel}>Meeting Code</p>
                        <div className={styles.popupCodeBlock}>
                            <span className={styles.popupCode}>{meetingPopup.code}</span>
                            <button
                                className={`${styles.copyIconBtn} ${codeCopied ? styles.copiedState : ''}`}
                                onClick={copyCode}
                            >
                                {codeCopied ? <CheckIcon style={{ fontSize: '1rem' }} /> : <ContentCopyIcon style={{ fontSize: '1rem' }} />}
                                {codeCopied ? 'Copied!' : 'Copy Code'}
                            </button>
                        </div>

                        {/* Meeting Link */}
                        <p className={styles.popupSectionLabel}>Meeting Link</p>
                        <div className={styles.popupLinkBlock}>
                            <span className={styles.popupLinkText}>{meetingPopup.link}</span>
                            <button
                                className={`${styles.copyIconBtn} ${linkCopied ? styles.copiedState : ''}`}
                                onClick={copyLink}
                            >
                                {linkCopied ? <CheckIcon style={{ fontSize: '1rem' }} /> : <ContentCopyIcon style={{ fontSize: '1rem' }} />}
                                {linkCopied ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>

                        {/* Countdown */}
                        <p className={styles.popupCountdown}>
                            Auto-joining in <span className={styles.countdownNum}>{countdown}s</span>
                        </p>

                        {/* Timer Bar */}
                        <div className={styles.timerBar}>
                            <div
                                className={styles.timerBarFill}
                                style={{ width: `${(countdown / POPUP_SECONDS) * 100}%` }}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className={styles.popupActions}>
                            <button className={styles.joinNowBtn} onClick={joinMeetingNow}>
                                <CallIcon style={{ fontSize: '1.2rem' }} />
                                Join Now
                            </button>
                            <button className={styles.dismissBtn} onClick={dismissPopup}>
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Top Dashboard Navbar ---- */}
            <nav className={styles.dashboardNav}>
                <div className={styles.brandWrapper} onClick={() => navigate("/home")}>
                    <img src="/Meetora.png" alt="Meetora Logo" className={styles.brandLogo} />
                    <span className={styles.dashboardTag}>Dashboard</span>
                </div>

                <div className={styles.navRight}>
                    <div className={styles.userBadge}>
                        <Avatar style={{ width: 34, height: 34, backgroundColor: "#6366f1", fontSize: "15px", fontWeight: "700" }}>
                            {userInitial}
                        </Avatar>
                        <span className={styles.userName}>{firstName}</span>
                    </div>

                    <button className={styles.navBtn} onClick={() => navigate("/history")}>
                        <RestoreIcon style={{ fontSize: "1.2rem" }} />
                        <span>History</span>
                    </button>

                    <button
                        className={styles.logoutBtn}
                        onClick={() => {
                            localStorage.removeItem("token");
                            if (setUserData) setUserData(null);
                            navigate("/");
                        }}
                    >
                        Logout
                    </button>
                </div>
            </nav>

            {/* ---- Main Dashboard Workspace ---- */}
            <main className={styles.mainContent}>
                <div className={styles.welcomeSection}>
                    <h1 className={styles.greetingHeading}>Welcome back, {firstName}! 👋</h1>
                    <p className={styles.greetingSub}>
                        Start an instant video call or join your team with a meeting code.
                    </p>
                </div>

                {/* 3 Action Cards Grid */}
                <div className={styles.cardsGrid}>
                    {/* Card 1: Instant Call Now */}
                    <div className={styles.actionCard}>
                        <div>
                            <div className={styles.cardHeader}>
                                <div className={`${styles.cardIconBox} ${styles.iconCallNow}`}>
                                    <CallIcon />
                                </div>
                                <div>
                                    <h3 className={styles.cardTitle}>Instant Call</h3>
                                    <p className={styles.cardDesc}>Start a call now — a code & link will be generated to share.</p>
                                </div>
                            </div>
                        </div>
                        <button className={styles.callNowBtn} onClick={handleCallNow}>
                            <CallIcon style={{ fontSize: "1.3rem" }} />
                            <span>Call Now</span>
                        </button>
                    </div>

                    {/* Card 2: Join Call by Code */}
                    <div className={styles.actionCard}>
                        <div>
                            <div className={styles.cardHeader}>
                                <div className={`${styles.cardIconBox} ${styles.iconJoin}`}>
                                    <KeyboardIcon />
                                </div>
                                <div>
                                    <h3 className={styles.cardTitle}>Join a Call</h3>
                                    <p className={styles.cardDesc}>Enter a meeting code or paste a link to connect.</p>
                                </div>
                            </div>
                        </div>
                        <div className={styles.joinInputGroup}>
                            <input
                                type="text"
                                className={styles.joinInput}
                                placeholder="Enter meeting code or link"
                                value={meetingCode}
                                onChange={(e) => setMeetingCode(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleJoinVideoCall(); }}
                            />
                            <button
                                className={styles.joinBtnAction}
                                onClick={handleJoinVideoCall}
                                disabled={!meetingCode.trim()}
                            >
                                Join
                            </button>
                        </div>
                    </div>

                    {/* Card 3: Schedule Call */}
                    <div className={styles.actionCard}>
                        <div>
                            <div className={styles.cardHeader}>
                                <div className={`${styles.cardIconBox} ${styles.iconSchedule}`}>
                                    <EventIcon />
                                </div>
                                <div>
                                    <h3 className={styles.cardTitle}>Schedule Meeting</h3>
                                    <p className={styles.cardDesc}>Get a shareable link & schedule a call for later.</p>
                                </div>
                            </div>
                        </div>
                        <button className={styles.scheduleBtnAction} onClick={handleOpenScheduleModal}>
                            <EventIcon style={{ fontSize: "1.2rem" }} />
                            <span>Schedule Call</span>
                        </button>
                    </div>
                </div>

                {/* Quick Activity Banner */}
                <div className={styles.quickStatsBanner}>
                    <div className={styles.statsText}>
                        <h3>Review Your Meeting History</h3>
                        <p>Keep track of your past video call sessions and logs.</p>
                    </div>
                    <button className={styles.navBtn} onClick={() => navigate("/history")}>
                        <HistoryIcon style={{ fontSize: "1.2rem" }} />
                        <span>View Call History</span>
                    </button>
                </div>
            </main>

            {/* ---- Schedule Meeting Modal ---- */}
            {showScheduleModal && (
                <div className="scheduleModalOverlay">
                    <div className="scheduleModalContent">
                        <div className="scheduleModalHeader">
                            <h2>Schedule a Meeting</h2>
                            <button className="closeModalBtn" onClick={() => setShowScheduleModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="scheduleModalBody">
                            <div className="scheduleInputGroup">
                                <label>Meeting Title</label>
                                <input
                                    type="text"
                                    value={scheduledTitle}
                                    onChange={(e) => setScheduledTitle(e.target.value)}
                                    placeholder="Enter meeting title"
                                />
                            </div>

                            <div className="scheduleInputGroup">
                                <label>Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                />
                            </div>

                            <div className="scheduleInputGroup">
                                <label>Meeting Link</label>
                                <div className="copyLinkBox">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/${scheduledCode}`}
                                    />
                                    <button className={`copyBtn ${copied ? 'copied' : ''}`} onClick={handleCopyLink}>
                                        {copied ? <CheckIcon className="copyIconSuccess" /> : <ContentCopyIcon className="copyIcon" />}
                                        <span>{copied ? "Copied!" : "Copy"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="scheduleModalFooter">
                            <button className="secondaryBtn" onClick={() => setShowScheduleModal(false)}>
                                Done
                            </button>
                            <button className="primaryBtn" onClick={handleStartScheduledMeeting}>
                                Start Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default withAuth(HomeComponent);
