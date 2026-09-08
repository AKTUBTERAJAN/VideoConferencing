import React, { useState, useRef, useEffect } from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'
import KeyboardIcon from '@mui/icons-material/Keyboard';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import EventIcon from '@mui/icons-material/Event';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';

export default function LandingPage() {

    const [meetingCode, setMeetingCode] = useState("");
    const [showMenu, setShowMenu] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduledTitle, setScheduledTitle] = useState("Meetora Video Call");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledCode, setScheduledCode] = useState("");
    const [copied, setCopied] = useState(false);

    //meeting created popup state
    const [showMeetingPopup, setShowMeetingPopup] = useState(false);
    const [instantMeetingCode, setInstantMeetingCode] = useState("");
    const [countdown, setCountdown] = useState(60);
    const [meetingCopied, setMeetingCopied] = useState(false);


    

    const menuRef = useRef(null);
    const router = useNavigate();

    

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleJoin = () => {
        if (!meetingCode.trim()) return;
        const code = meetingCode.trim().split('/').pop();
        router(`/${code}`);
    };

    useEffect(() => {
        if (!showMeetingPopup) return;

        if (countdown <= 0) {
            setShowMeetingPopup(false);
            router(`/${instantMeetingCode}`);
            return;
        }

        const timer = setInterval(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [showMeetingPopup, countdown, instantMeetingCode, router]);

    const handleInstantMeeting = () => {
        setShowMenu(false);

        const randomCode = Math.random()
            .toString(36)
            .substring(2, 9);

        setInstantMeetingCode(randomCode);
        setCountdown(60);
        setMeetingCopied(false);
        setShowMeetingPopup(true);
    };

    const handleOpenScheduleModal = () => {
        setShowMenu(false);
        const randomCode = Math.random().toString(36).substring(2, 9);
        setScheduledCode(randomCode);

        // Default scheduled date to 1 hour from now
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

    const handleCopyMeetingLink = () => {
        const link = `${window.location.origin}/${instantMeetingCode}`;

        navigator.clipboard.writeText(link);

        setMeetingCopied(true);

        setTimeout(() => {
            setMeetingCopied(false);
        }, 2000);
    };

    const handleJoinMeeting = () => {
        setShowMeetingPopup(false);
        router(`/${instantMeetingCode}`);
    };

    const handleStartScheduledMeeting = () => {
        setShowScheduleModal(false);
        router(`/${scheduledCode}`);
    };

    return (
        
        <div className='landingPageContainer'>
            
            <nav>
                <div className='navHeader'>
                    <img src="/Meetora.png" alt="" />
                </div>

                <div className="navMeetingBar">
                    <div className="joinInputContainer">
                        <KeyboardIcon className="keyboardIcon" />
                        <input
                            type="text"
                            placeholder="Enter a code or link"
                            value={meetingCode}
                            onChange={(e) => setMeetingCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleJoin();
                            }}
                        />
                        <button
                            className={`joinBtn ${meetingCode.trim() ? 'active' : ''}`}
                            onClick={handleJoin}
                            disabled={!meetingCode.trim()}
                        >
                            Join
                        </button>
                    </div>

                    <div className="newMeetingMenuWrapper" ref={menuRef}>
                        <button className="newMeetingBtn" onClick={() => setShowMenu(!showMenu)}>
                            <VideoCallIcon className="videoIcon" />
                            <span>New</span>
                        </button>

                        {showMenu && (
                            <div className="newMeetingDropdown">
                                <div className="dropdownItem" onClick={handleInstantMeeting}>
                                    <FlashOnIcon className="menuIcon" />
                                    <div>
                                        <span className="menuTitle">Start an instant meeting</span>
                                        <span className="menuSub">Join a video call right now</span>
                                    </div>
                                </div>
                                <div className="dropdownItem" onClick={handleOpenScheduleModal}>
                                    <EventIcon className="menuIcon" />
                                    <div>
                                        <span className="menuTitle">Schedule a meeting</span>
                                        <span className="menuSub">Get a link for later or pick date & time</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className='navlist'>
                    <p onClick={() => {
                        router("/aljk23")
                    }}>Join as Guest</p>
                    <p onClick={() => {
                        router("/auth")
                    }}>Register</p>
                    <div onClick={() => {
                        router("/auth")
                    }} role='button'>
                        <p>Login</p>
                    </div>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div>
                    <h1><span style={{ color: "#FF9839" }}>Connect</span> with your loved Ones</h1>

                    <p>Cover a distance by  Video Call</p>
                    <div role='button'>
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                <div>
                    <img src="/mobile.png" alt="" />
                </div>
            </div>

            {/* Schedule Meeting Modal */}
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

            {/* Instant Meeting Popup */}
            {showMeetingPopup && (
                <div className="meetingPopupOverlay">

                    <div className="meetingPopup">

                        <div className="meetingPopupHeader">

                            <h2>Meeting Ready 🎥</h2>

                            <button
                                className="closeModalBtn"
                                onClick={() => setShowMeetingPopup(false)}
                            >
                                <CloseIcon />
                            </button>

                        </div>

                        <div className="meetingPopupBody">

                            <p className="meetingPopupText">
                                Your meeting is ready. Share the link with others
                                to invite them.
                            </p>

                            {/* Meeting Code */}
                            <div className="meetingCodeBox">

                                <label>Meeting Code</label>

                                <div className="meetingCode">
                                    {instantMeetingCode}
                                </div>

                            </div>

                            {/* Meeting Link */}
                            <div className="scheduleInputGroup">

                                <label>Meeting Link</label>

                                <div className="copyLinkBox">

                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/${instantMeetingCode}`}
                                    />

                                    <button
                                        className={`copyBtn ${
                                            meetingCopied ? "copied" : ""
                                        }`}
                                        onClick={handleCopyMeetingLink}
                                    >

                                        {meetingCopied ? (
                                            <CheckIcon />
                                        ) : (
                                            <ContentCopyIcon />
                                        )}

                                        <span>
                                            {meetingCopied ? "Copied!" : "Copy"}
                                        </span>

                                    </button>

                                </div>

                            </div>

                            {/* Countdown */}
                            <div className="meetingCountdown">

                                <div className="countdownNumber">
                                    {countdown}
                                </div>

                                <p>
                                    Meeting will start automatically in
                                    <strong> {countdown} seconds</strong>
                                </p>

                            </div>

                        </div>

                        <div className="scheduleModalFooter">

                            <button
                                className="secondaryBtn"
                                onClick={() => setShowMeetingPopup(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className="primaryBtn"
                                onClick={handleJoinMeeting}
                            >
                                Join Now
                            </button>

                        </div>

                    </div>

                </div>
            )}
        </div>
    )
}
