import { useEffect, useRef, useState } from "react"
import ChatIcon from "./Components/ChatIcon";
import CopyIcon from "./Components/CopyIcon";
import { Slide, toast, ToastContainer } from "react-toastify";

export default function App() {

  interface ChatMessage {
    username: string,
    message: string
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const prevUserCountRef = useRef<number>(0);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { username: "System", message: "Welcome to Chat Room" }
  ]);
  const [joined, setJoined] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [newRoomId, setNewRoomId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [userCount, setUserCount] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");



    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === "room-created") {
          setNewRoomId(data.payload.roomId);
          setRoomId(data.payload.roomId);
          toast.success("Room created successfully");
        } else if (data.type === "joined-room") {
          setJoined(true);
          setUserCount(data.payload.userCount);
          prevUserCountRef.current = data.payload.userCount;
        } else if (data.type === "user-count-update") {
          const oldCount = prevUserCountRef.current;
          const newCount = data.payload.userCount;

          setUserCount(newCount);
          prevUserCountRef.current = newCount;

          if (data.payload.userJoined && data.payload.userJoined !== username) {
            toast.info(`${data.payload.userJoined} joined the room`);
          } else if (data.payload.userLeft && data.payload.userLeft !== username) {
            toast.info(`${data.payload.userLeft} left the room`);
          } else if (!data.payload.userJoined && !data.payload.userLeft) {
            if (newCount > oldCount) {
              toast.info(`User joined the room`);
            } else if (newCount < oldCount) {
              toast.info(`User left the room`);
            }
          }
        } else if (data.type === "chat") {
          setMessages(m => [...m, {
            username: data.payload.username,
            message: data.payload.message
          }]);
        } else if (data.type === "room-not-found") {
          toast.error("Room not found");
        } else if (data.type === "disconnect") {
          toast.info("Left the room")
        }

      } catch (error) {
        setMessages(m => [...m, e.data]);
      }
    }

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("started")
    }

    return () => {
      ws.close();
    }

  }, [])


  const sentMessages = () => {
    const m = inputRef.current?.value;
    if (m && m.trim()) {
      wsRef.current?.send(JSON.stringify({
        type: "chat",
        payload: {
          message: m,
          username
        }
      }))
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sentMessages();
    }
  }

  const createRoom = () => {
    wsRef.current?.send(JSON.stringify({
      type: "create-room"
    }));
  }

  const joinRoom = () => {

    if (!username) {
      toast.error("Please enter username");
      return;
    }

    if (!roomId) {
      toast.error("Pease enter room code")
      return;
    }
    wsRef.current?.send(JSON.stringify({
      type: "join",
      payload: { roomId, username },
    }))

  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      toast.success("Room code copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy Room Code")
    }
  }

  const disconnect = () => {
    wsRef.current?.send(JSON.stringify({
      type: "disconnect",
      payload: { roomId, username }
    }))

    setJoined(false);
    setMessages([{ username: "System", message: "Welcome to Chat Room" }]);
    setUserCount(0);
    setNewRoomId("");
    setRoomId("");

  }



  return (
    <>

      {!joined ? (
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="w-full max-w-xl h-auto bg-black border border-neutral-800 rounded-xl p-5 flex flex-col">

            {/* Header */}
            <div className="mb-5">
              <div className="flex items-center gap-2 text-2xl text-white pb-2">
                <ChatIcon /> <span className="font-bold">Real Time Chat</span>
              </div>
              <p className="text-white/60 text-sm">
                Temporary chat room that expires after all users exit.
              </p>
            </div>

            {/* Create Room Id */}
            <button
              className="w-full bg-white rounded-md py-3 font-mono text-lg mb-3 hover:bg-neutral-200 cursor-pointer"
              onClick={createRoom}
            >Create New Room</button>

            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-400 font-mono"
            />
            <div className="flex flex-row gap-2 items-center mb-3">

              <input
                type="text"
                placeholder="Enter Room Code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 mb-3 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-400 font-mono"
              />

              <button
                onClick={joinRoom}
                className="mb-3 bg-white text-black px-4 py-2 rounded-md hover:bg-neutral-200 transition-colors cursor-pointer"
              >Join Room</button>
            </div>

            {newRoomId && (
              <div className="flex justify-center items-center flex-col rounded-lg bg-neutral-800 py-8">
                <p className="text-neutral-300 text-sm font-mono">
                  Share this code with your friends
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-white text-lg font-bold font-mono mt-1">
                    Room Code: {newRoomId}
                  </p>
                  <button
                    className="text-white hover:text-neutral-300 cursor-pointer"
                    onClick={() => copyToClipboard(newRoomId)}
                  ><CopyIcon size="w-5 h-5" /></button>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="h-screen flex items-center justify-center bg-black">

          <div className="w-full max-w-xl h-[750px] bg-black border border-neutral-800 rounded-xl p-5 flex flex-col">

            {/* Header */}
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-2xl text-white pb-2">
                  <ChatIcon /> <span className="font-bold">Real Time Chat</span>
                </div>
                <button
                  onClick={disconnect}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors cursor-pointer"
                >
                  Exit
                </button>
              </div>
              <p className="text-white/60 text-sm">
                Temporary chat room that expires after all users exit.
              </p>
            </div>



            {/* Room Info */}
            <div className="bg-neutral-800 text-neutral-400 rounded-md flex items-center justify-between px-3 py-2 text-sm mb-3 font-mono">
              <div className="flex items-center gap-2">
                <span>
                  Room Code: <span className="text-white">{roomId}</span>
                </span>
                <button
                  className="text-white hover:text-neutral-300 transition-colors flex items-center cursor-pointer"
                  onClick={() => copyToClipboard(roomId)}
                >
                  <CopyIcon size="w-4 h-4" />
                </button>
              </div>
              <span>
                Users: {userCount}
              </span>
            </div>

            {/* Message Area */}
            <div className="flex-1 flex flex-col bg-black border border-neutral-800 rounded-md p-5 overflow-y-auto space-y-2">
              {messages.map((message, index) => (
                <div key={index} className={`mb-3 flex flex-col ${message.username === username ? "items-end" : "items-start"
                  }`}>
                  <span className="text-xs text-gray-400 mb-1">{message.username}</span>
                  <span className="px-3 py-2 rounded-lg max-w-xs bg-neutral-800 text-white font-mono">
                    {message.message}
                  </span>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="flex items-center gap-2 mt-5 ">
              <input
                key="message-input"
                type="text"
                placeholder="Type your message..."
                ref={inputRef}
                onKeyPress={handleKeyPress}
                className="flex-1 border border-neutral-800 bg-neutral-900 rounded-md text-white px-3 py-2 focus:ring-1 focus:ring-neutral-600"
              />
              <button
                onClick={sentMessages}
                className="text-black hover:bg-neutral-300 duration-400 bg-white px-5 py-2 rounded-md font-mono cursor-pointer"
              >Send</button>
            </div>
          </div>
        </div>
      )}

      {/* ToastContainer */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick={false}
        closeButton={false}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={false}
        transition={Slide}
        className="custom-toast-container"
        toastClassName="custom-toast"
      />

    </>
  )
}