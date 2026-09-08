import React, { useEffect, useRef, useState, useMemo, useCallback, useContext } from 'react';
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import PushPinIcon from '@mui/icons-material/PushPin';
import PeopleIcon from '@mui/icons-material/People';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import MessageIcon from '@mui/icons-material/Message';
import server from '../environment';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const server_url = server;
var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
};

// Optimized Video Tile Component with React.memo
const VideoTile = React.memo(({ v, isSpeaking, isPinned, onPin }) => {
    const videoRef = useRef();

    useEffect(() => {
        if (videoRef.current && v.stream) {
            if (videoRef.current.srcObject !== v.stream) {
                videoRef.current.srcObject = v.stream;
            }
        }
    }, [v.stream]);

    const isVideoActive = useMemo(() => {
        if (!v.stream) return false;
        const tracks = v.stream.getVideoTracks();
        return tracks.length > 0 && tracks.some(t => t.enabled && t.readyState === 'live');
    }, [v.stream]);

    const initial = (v.username || v.socketId || "U").charAt(0).toUpperCase();

    return (
        <div 
            className={`${styles.videoTileContainer} ${isSpeaking ? styles.activeSpeaker : ''} ${isPinned ? styles.pinnedTile : ''}`}
            onClick={() => onPin(v.socketId)}
        >
            {isVideoActive ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={styles.tileVideo}
                />
            ) : (
                <div className={styles.avatarCard}>
                    <div className={styles.avatarCircle}>{initial}</div>
                </div>
            )}

            <div className={styles.participantLabel}>
                <span>{v.username || `USER ${v.socketId.slice(0, 4)}`}</span>
                {isPinned && <PushPinIcon style={{ fontSize: '0.9rem', color: '#3b82f6' }} />}
                <span className={`${styles.micIndicator} ${isSpeaking ? styles.speaking : styles.muted}`}>
                    <MicIcon style={{ fontSize: '1rem' }} />
                </span>
            </div>
        </div>
    );
});

export default function VideoMeetComponent() {
    const navigate = useNavigate();
    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();
    let soloVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState();
    const { userData } = useContext(AuthContext);
    let [showModal, setModal] = useState(false);
    let [showParticipantsModal, setShowParticipantsModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState();
    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");

    useEffect(() => {
        if (userData && (userData.name || userData.username)) {
            setUsername(userData.name || userData.username);
        }
    }, [userData]);
    
    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);

    // Active Speaker & Pinning states
    const [activeSpeakerId, setActiveSpeakerId] = useState(null);
    const [pinnedId, setPinnedId] = useState(null);

    const MAX_MAIN_STAGE = 4;

    // Single shared AudioContext for high performance active speaker detection
    const audioCtxRef = useRef(null);
    const analysersMapRef = useRef({});
    const lastSpeakerTimeRef = useRef(0);

    useEffect(() => {
        getPermissions();
        return () => {
            // Hardware Camera & Microphone Release on unmount (Back button / navigation)
            if (window.localStream) {
                try {
                    window.localStream.getTracks().forEach(track => track.stop());
                } catch (e) {}
                window.localStream = null;
            }
            if (localVideoref.current && localVideoref.current.srcObject) {
                try {
                    localVideoref.current.srcObject.getTracks().forEach(track => track.stop());
                    localVideoref.current.srcObject = null;
                } catch (e) {}
            }
            if (soloVideoref.current && soloVideoref.current.srcObject) {
                try {
                    soloVideoref.current.srcObject.getTracks().forEach(track => track.stop());
                    soloVideoref.current.srcObject = null;
                } catch (e) {}
            }
            if (socketRef.current) {
                try { socketRef.current.disconnect(); } catch (e) {}
            }
            if (audioCtxRef.current) {
                try { audioCtxRef.current.close(); } catch (e) {}
            }
            if (connections) {
                for (let id in connections) {
                    try { connections[id].close(); } catch (e) {}
                }
                connections = {};
            }
        };
    }, []);

    // Sync stream to localVideoref & soloVideoref
    useEffect(() => {
        if (window.localStream) {
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }
            if (soloVideoref.current) {
                soloVideoref.current.srcObject = window.localStream;
            }
        }
    }, [videos.length, askForUsername]);

    const getPermissions = async () => {
        try {
            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

            const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (userMediaStream) {
                setVideoAvailable(true);
                setAudioAvailable(true);
                window.localStream = userMediaStream;
                if (localVideoref.current) {
                    localVideoref.current.srcObject = userMediaStream;
                }
                if (soloVideoref.current) {
                    soloVideoref.current.srcObject = userMediaStream;
                }
            }
        } catch (error) {
            console.log("Permission error:", error);
            setVideoAvailable(false);
            setAudioAvailable(false);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [video, audio]);

    let getDislayMedia = () => {
        if (screen && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDislayMediaSuccess)
                .catch((e) => console.log(e));
        }
    };

    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop());
        } catch (e) {}

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }
        if (soloVideoref.current) {
            soloVideoref.current.srcObject = stream;
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            connections[id].addStream(window.localStream);
            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                    })
                    .catch(e => console.log(e));
            });
        }
    };

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e));
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            } catch (e) { }
        }
    };

    let getDislayMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop());
        } catch (e) {}

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }
        if (soloVideoref.current) {
            soloVideoref.current.srcObject = stream;
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            connections[id].addStream(window.localStream);

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                    })
                    .catch(e => console.log(e));
            });
        }
    };

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }));
                            }).catch(e => console.log(e));
                        }).catch(e => console.log(e));
                    }
                }).catch(e => console.log(e));
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
            }
        }
    };

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href, username);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                setVideos((prevVideos) => {
                    const filtered = prevVideos.filter((v) => v.socketId !== id);
                    videoRef.current = filtered;
                    return filtered;
                });
            });

            socketRef.current.on('user-joined', (id, clients, userNamesMap) => {
                clients.forEach((socketListId) => {
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
                    
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
                        }
                    };

                    connections[socketListId].onaddstream = (event) => {
                        let videoExists = videoRef.current.find(v => v.socketId === socketListId);
                        const displayName = (userNamesMap && userNamesMap[socketListId]) ? userNamesMap[socketListId] : `User ${socketListId.slice(0, 4)}`;

                        if (videoExists) {
                            setVideos(prevVideos => {
                                const updated = prevVideos.map(v =>
                                    v.socketId === socketListId ? { ...v, stream: event.stream, username: displayName } : v
                                );
                                videoRef.current = updated;
                                return updated;
                            });
                        } else {
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true,
                                username: displayName
                            };

                            setVideos(prevVideos => {
                                const updated = [...prevVideos, newVideo];
                                videoRef.current = updated;
                                return updated;
                            });
                        }
                    };

                    if (window.localStream) {
                        connections[socketListId].addStream(window.localStream);
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;
                        try {
                            connections[id2].addStream(window.localStream);
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }));
                                })
                                .catch(e => console.log(e));
                        });
                    }
                }
            });
        });
    };

    let handleVideo = () => {
        const nextState = !video;
        setVideo(nextState);
        if (window.localStream) {
            window.localStream.getVideoTracks().forEach(track => {
                track.enabled = nextState;
            });
        }
    };

    let handleAudio = () => {
        const nextState = !audio;
        setAudio(nextState);
        if (window.localStream) {
            window.localStream.getAudioTracks().forEach(track => {
                track.enabled = nextState;
            });
        }
    };

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen]);

    let handleScreen = () => {
        setScreen(!screen);
    };

    let handleEndCall = () => {
    try {
        // 1. window.localStream stop karein
        if (window.localStream) {
            window.localStream.getTracks().forEach(t => t.stop());
            window.localStream = null;
        }

        // 2. Refs clear karein
        if (localVideoref.current && localVideoref.current.srcObject) {
            localVideoref.current.srcObject.getTracks().forEach(t => t.stop());
            localVideoref.current.srcObject = null;
        }

        if (soloVideoref.current && soloVideoref.current.srcObject) {
            soloVideoref.current.srcObject.getTracks().forEach(t => t.stop());
            soloVideoref.current.srcObject = null;
        }

        if (socketRef.current) {
            socketRef.current.disconnect();
        }
    } catch (e) {
        console.error(e);
    }

    const token = localStorage.getItem("token");

    // navigate() ki jagah hard redirect use karein:
    if (token) {
        window.location.href = "/home";
    } else {
        window.location.href = "/";
    }
};

    const addMessage = (data, sender, socketIdSender) => {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data, time: timeStr, socketIdSender: socketIdSender }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    let connect = () => {
        setAskForUsername(false);
        getMedia();
    };

    // ULTRA HIGH PERFORMANCE SINGLE AUDIO CONTEXT ANALYZER LOOP
    useEffect(() => {
        if (!videos || videos.length === 0) return;

        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const audioCtx = audioCtxRef.current;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        videos.forEach(v => {
            if (v.stream && v.stream.getAudioTracks().length > 0 && !analysersMapRef.current[v.socketId]) {
                try {
                    const source = audioCtx.createMediaStreamSource(v.stream);
                    const analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 128;
                    source.connect(analyser);
                    analysersMapRef.current[v.socketId] = analyser;
                } catch (e) {}
            }
        });

        const dataArray = new Uint8Array(64);
        const intervalId = setInterval(() => {
            let loudestId = null;
            let maxVol = 0;

            Object.entries(analysersMapRef.current).forEach(([socketId, analyser]) => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                if (avg > 24 && avg > maxVol) {
                    maxVol = avg;
                    loudestId = socketId;
                }
            });

            const now = Date.now();
            if (loudestId && loudestId !== activeSpeakerId && (now - lastSpeakerTimeRef.current > 1500)) {
                setActiveSpeakerId(loudestId);
                lastSpeakerTimeRef.current = now;
            }
        }, 500);

        return () => {
            clearInterval(intervalId);
        };
    }, [videos, activeSpeakerId]);

    const handlePin = useCallback((id) => {
        setPinnedId(prev => (prev === id ? null : id));
    }, []);

    const bringToMainStage = useCallback((id) => {
        setPinnedId(id);
        setShowParticipantsModal(false);
    }, []);

    const { mainStageVideos, queuedVideos } = useMemo(() => {
        if (!videos || videos.length === 0) {
            return { mainStageVideos: [], queuedVideos: [] };
        }

        let sorted = [...videos];

        sorted.sort((a, b) => {
            if (a.socketId === pinnedId) return -1;
            if (b.socketId === pinnedId) return 1;
            if (a.socketId === activeSpeakerId) return -1;
            if (b.socketId === activeSpeakerId) return 1;
            return 0;
        });

        return {
            mainStageVideos: sorted.slice(0, MAX_MAIN_STAGE),
            queuedVideos: sorted.slice(MAX_MAIN_STAGE)
        };
    }, [videos, pinnedId, activeSpeakerId]);

    const totalParticipantsCount = videos.length + 1;
    const localInitial = (username || "Y").charAt(0).toUpperCase();
    const displayNameUpper = (username || "YOU").toUpperCase();

    return (
        <div>
            {askForUsername === true ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px', background: '#0b0f19', color: '#fff' }}>
                    <h2>Enter into Lobby</h2>
                    <TextField 
                        id="outlined-basic" 
                        label="Username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        variant="outlined" 
                        sx={{ input: { color: 'white' }, label: { color: 'gray' }, fieldset: { borderColor: 'gray' } }}
                    />
                    <Button variant="contained" onClick={connect}>Connect</Button>

                    <div style={{ width: '320px', height: '240px', borderRadius: '16px', overflow: 'hidden', border: '2px solid #334155' }}>
                        <video ref={localVideoref} autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    <div className={styles.mainStage}>

                        {/* TOP HEADER BAR: Participant Count Badge */}
                        <div className={styles.topHeaderBar}>
                            <div 
                                className={styles.participantBadge}
                                onClick={() => setShowParticipantsModal(!showParticipantsModal)}
                                title="Click to view all participants"
                            >
                                <PeopleIcon style={{ fontSize: '1.2rem', color: '#3b82f6' }} />
                                <span>{totalParticipantsCount}</span>
                            </div>
                        </div>

                        {/* PARTICIPANTS LIST MODAL */}
                        {showParticipantsModal && (
                            <div className={styles.participantsModal}>
                                <div className={styles.modalHeader}>
                                    <h3>Participants ({totalParticipantsCount})</h3>
                                    <IconButton size="small" onClick={() => setShowParticipantsModal(false)} style={{ color: '#94a3b8' }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </div>
                                <div className={styles.participantList}>
                                    {/* Local User item */}
                                    <div className={styles.participantItem}>
                                        <div className={styles.participantInfo}>
                                            <div className={styles.participantAvatar}>{localInitial}</div>
                                            <span className={styles.participantName}>{username || "You"} (You)</span>
                                        </div>
                                        <div className={styles.participantActions}>
                                            <span className={`${styles.statusTag} ${styles.onStage}`}>Self</span>
                                            {audio ? <MicIcon style={{ fontSize: '1rem', color: '#22c55e' }} /> : <MicOffIcon style={{ fontSize: '1rem', color: '#ef4444' }} />}
                                        </div>
                                    </div>

                                    {/* Remote Participants */}
                                    {videos.map((v) => {
                                        const isOnStage = mainStageVideos.some(m => m.socketId === v.socketId);
                                        const isSpeaking = activeSpeakerId === v.socketId;
                                        const initial = (v.username || v.socketId || "U").charAt(0).toUpperCase();

                                        return (
                                            <div key={v.socketId} className={styles.participantItem}>
                                                <div className={styles.participantInfo}>
                                                    <div className={styles.participantAvatar}>{initial}</div>
                                                    <span className={styles.participantName}>{v.username || `User ${v.socketId.slice(0, 4)}`}</span>
                                                </div>
                                                <div className={styles.participantActions}>
                                                    <span className={`${styles.statusTag} ${isOnStage ? styles.onStage : styles.inQueue}`}>
                                                        {isOnStage ? "On Screen" : "In Queue"}
                                                    </span>
                                                    {!isOnStage && (
                                                        <IconButton size="small" onClick={() => bringToMainStage(v.socketId)} title="Show on screen" style={{ color: '#3b82f6' }}>
                                                            <PushPinIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                    {isSpeaking ? <MicIcon style={{ fontSize: '1rem', color: '#22c55e' }} /> : <MicIcon style={{ fontSize: '1rem', color: '#94a3b8' }} />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* MAIN VIDEO GRID */}
                        <div 
                            className={styles.conferenceView} 
                            data-count={videos.length === 0 ? "1" : Math.min(mainStageVideos.length, 6)}
                        >
                            {videos.length === 0 ? (
                                /* SOLO USER MAIN STAGE VIDEO TILE (Matching Image 2) */
                                <div className={styles.videoTileContainer}>
                                    {video ? (
                                        <video
                                            ref={soloVideoref}
                                            autoPlay
                                            muted
                                            playsInline
                                            className={styles.tileVideo}
                                        />
                                    ) : (
                                        <div className={styles.avatarCard}>
                                            <div className={styles.avatarCircle}>{localInitial}</div>
                                        </div>
                                    )}

                                    <div className={styles.participantLabel}>
                                        <span>{displayNameUpper}</span>
                                        <span className={`${styles.micIndicator} ${audio ? styles.speaking : styles.muted}`}>
                                            <MicIcon style={{ fontSize: '1rem' }} />
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                mainStageVideos.map((v) => (
                                    <VideoTile
                                        key={v.socketId}
                                        v={v}
                                        isSpeaking={activeSpeakerId === v.socketId}
                                        isPinned={pinnedId === v.socketId}
                                        onPin={handlePin}
                                    />
                                ))
                            )}
                        </div>

                        {/* LOCAL USER PIP CORNER TILE (Only rendered when other users join!) */}
                        {videos.length > 0 && (
                            video ? (
                                <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted playsInline></video>
                            ) : (
                                <div className={styles.meetUserAvatarPiP}>
                                    <div className={styles.avatarCircle}>{localInitial}</div>
                                </div>
                            )
                        )}

                        {/* BOTTOM CONTROLS */}
                        <div className={styles.buttonContainers}>
                            <IconButton onClick={handleVideo} style={{ color: video ? "white" : "#ef4444" }}>
                                {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                            <IconButton onClick={handleEndCall} style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.2)" }}>
                                <CallEndIcon />
                            </IconButton>
                            <IconButton onClick={handleAudio} style={{ color: audio ? "white" : "#ef4444" }}>
                                {audio === true ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>

                            {screenAvailable === true && (
                                <IconButton onClick={handleScreen} style={{ color: screen ? "#3b82f6" : "white" }}>
                                    {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                                </IconButton>
                            )}

                            <Badge badgeContent={newMessages} max={999} color="primary">
                                <IconButton onClick={() => { setModal(!showModal); setNewMessages(0); }} style={{ color: "white" }}>
                                    <ChatIcon />
                                </IconButton>
                            </Badge>
                        </div>
                    </div>

                    {/* GOOGLE MEET DARK THEME CHAT SIDEBAR (Matching Image 1) */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <div className={styles.chatHeader}>
                                    <h2>In-call messages</h2>
                                    <IconButton size="small" onClick={() => setModal(false)} style={{ color: "#e3e3e3" }}>
                                        <CloseIcon />
                                    </IconButton>
                                </div>

                                <div className={styles.chatNoticeCard}>
                                    <MessageIcon fontSize="small" />
                                    <div className={styles.chatNoticeText}>
                                        <h4>Messages will not be saved</h4>
                                        <p>Messages will not be saved for meeting participants when the call ends. You can pin a message to make it visible for people who join later.</p>
                                    </div>
                                </div>

                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? (
                                        messages.map((item, index) => {
                                            const isSelf = item.socketIdSender === socketIdRef.current || item.sender === username;
                                            return (
                                                <div 
                                                    key={index} 
                                                    className={`${styles.chatMessageRow} ${isSelf ? styles.sent : styles.received}`}
                                                >
                                                    {!isSelf && <span className={styles.senderName}>{item.sender || "User"}</span>}
                                                    {item.time && <span className={styles.messageMeta}>{item.time}</span>}
                                                    <div className={styles.messageBubble}>
                                                        {item.data}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p style={{ color: "#8e918f", textAlign: "center", marginTop: "20px", fontSize: "0.85rem" }}>
                                            No messages yet. Send a message to start the conversation.
                                        </p>
                                    )}
                                </div>

                                <div className={styles.chattingArea}>
                                    <input 
                                        value={message} 
                                        onChange={(e) => setMessage(e.target.value)} 
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder="Send a message" 
                                    />
                                    <IconButton size="small" className={styles.sendButton} onClick={sendMessage}>
                                        <SendIcon fontSize="small" />
                                    </IconButton>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
