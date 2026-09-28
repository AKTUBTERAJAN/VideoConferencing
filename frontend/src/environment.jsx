let IS_PROD = false;
const server = IS_PROD ?
    "https://videoconferencing-lvzp.onrender.com":
    "http://localhost:5000";

export default server;