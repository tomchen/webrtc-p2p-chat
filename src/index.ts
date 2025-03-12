const tabs: NodeListOf<HTMLElement> = document.querySelectorAll(".tab");
const tabContents: NodeListOf<HTMLElement> =
  document.querySelectorAll(".tab-content");

const createOfferBtn = document.getElementById(
  "createOfferBtn"
) as HTMLButtonElement;
const offerDisplay = document.getElementById("offerDisplay") as HTMLElement;
const copyOfferBtn = document.getElementById(
  "copyOfferBtn"
) as HTMLButtonElement;
const answerStep = document.getElementById("answerStep") as HTMLElement;
const answerInput = document.getElementById("answerInput") as HTMLInputElement;
const setAnswerBtn = document.getElementById(
  "setAnswerBtn"
) as HTMLButtonElement;

const offerInput = document.getElementById("offerInput") as HTMLInputElement;
const createAnswerBtn = document.getElementById(
  "createAnswerBtn"
) as HTMLButtonElement;
const answerDisplay = document.getElementById("answerDisplay") as HTMLElement;
const copyAnswerBtn = document.getElementById(
  "copyAnswerBtn"
) as HTMLButtonElement;

const statusMessageElem = document.getElementById(
  "statusMessage"
) as HTMLElement;
const messagesElem = document.getElementById("messages") as HTMLElement;
const messageInput = document.getElementById(
  "messageInput"
) as HTMLInputElement;
const sendBtn = document.getElementById("sendBtn") as HTMLButtonElement;

let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.ekiga.net" },
    { urls: "stun:stun.voipbuster.com" },
    { urls: "stun:stun.voipstunt.com" },
  ],
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    const tabId = (tab.getAttribute("data-tab") as string) + "Tab";
    document.getElementById(tabId)?.classList.add("active");
  });
});

function initPeerConnection() {
  if (peerConnection) {
    peerConnection.close();
  }
  peerConnection = new RTCPeerConnection(configuration);

  peerConnection.onicecandidate = (event) => {
    if (!event.candidate) {
      updateConnectionDisplay();
    }
  };

  peerConnection.onconnectionstatechange = () => {
    updateStatus(`Connection state: ${peerConnection?.connectionState}`);
    if (peerConnection?.connectionState === "connected") {
      enableChat();
    }
  };

  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel();
  };
}

function setupDataChannel() {
  if (!dataChannel) {
    return;
  }
  dataChannel.onopen = () => {
    updateStatus("Data channel is open! You are now connected.");
    enableChat();
  };
  dataChannel.onclose = () => {
    updateStatus("Data channel is closed");
    disableChat();
  };
  dataChannel.onmessage = (event) => addMessage(event.data, "received");
}

function updateConnectionDisplay() {
  if (document.getElementById("initiatorTab")?.classList.contains("active")) {
    const offer = btoa(JSON.stringify(peerConnection?.localDescription));
    offerDisplay.textContent = offer;
    offerDisplay.style.display = "block";
    copyOfferBtn.style.display = "inline-block";
    answerStep.style.display = "block";
    updateStatus(
      "Offer created. Share it with your peer and wait for their answer."
    );
  } else {
    const answer = btoa(JSON.stringify(peerConnection?.localDescription));
    answerDisplay.textContent = answer;
    answerDisplay.style.display = "block";
    copyAnswerBtn.style.display = "inline-block";
    updateStatus("Answer created. Send it back to the initiator.");
  }
}

createOfferBtn.addEventListener("click", async () => {
  try {
    initPeerConnection();
    dataChannel = peerConnection!.createDataChannel("chat");
    setupDataChannel();
    const offer = await peerConnection!.createOffer();
    await peerConnection!.setLocalDescription(offer);
    updateStatus("Creating offer...");
    createOfferBtn.disabled = true;
  } catch (error) {
    console.error("Error creating offer:", error);
    updateStatus(`Error: ${(error as Error).message}`);
  }
});

createAnswerBtn.addEventListener("click", async () => {
  try {
    const offerText = offerInput.value.trim();
    if (!offerText) {
      return updateStatus("Please enter a valid offer");
    }
    initPeerConnection();
    const offerData = JSON.parse(atob(offerText));
    await peerConnection!.setRemoteDescription(
      new RTCSessionDescription(offerData)
    );
    const answer = await peerConnection!.createAnswer();
    await peerConnection!.setLocalDescription(answer);
    updateStatus("Creating answer...");
    createAnswerBtn.disabled = true;
  } catch (error) {
    console.error("Error creating answer:", error);
    updateStatus(`Error: ${(error as Error).message}`);
  }
});

setAnswerBtn.addEventListener("click", async () => {
  try {
    const answerText = answerInput.value.trim();
    if (!answerText) {
      return updateStatus("Please enter a valid answer");
    }
    const answerData = JSON.parse(atob(answerText));
    await peerConnection!.setRemoteDescription(
      new RTCSessionDescription(answerData)
    );
    updateStatus("Connecting...");
    setAnswerBtn.disabled = true;
  } catch (error) {
    console.error("Error setting answer:", error);
    updateStatus(`Error: ${(error as Error).message}`);
  }
});

copyOfferBtn.addEventListener("click", () =>
  navigator.clipboard.writeText(offerDisplay.textContent || "")
);
copyAnswerBtn.addEventListener("click", () =>
  navigator.clipboard.writeText(answerDisplay.textContent || "")
);

sendBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (message && dataChannel?.readyState === "open") {
    dataChannel.send(message);
    addMessage(message, "sent");
    messageInput.value = "";
  }
});

messageInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    sendBtn.click();
  }
});

function addMessage(message: string, type: string) {
  const messageElem = document.createElement("div");
  messageElem.classList.add("message", type);
  messageElem.textContent = message;
  messagesElem.appendChild(messageElem);
  messagesElem.scrollTop = messagesElem.scrollHeight;
}

function updateStatus(message: string) {
  statusMessageElem.textContent = `Status: ${message}`;
}

function enableChat() {
  messageInput.disabled = false;
  sendBtn.disabled = false;
  messageInput.focus();
  addMessage("Connected to peer. You can now start chatting!", "received");
}

function disableChat() {
  messageInput.disabled = true;
  sendBtn.disabled = true;
}
