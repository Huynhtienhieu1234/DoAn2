document.addEventListener("DOMContentLoaded", function () {

    const chatBubble = document.getElementById("chatBubble");
    const chatBox = document.getElementById("chatBox");
    const closeChat = document.getElementById("closeChat");
    const chatInput = document.getElementById("chatInput");
    const sendChat = document.getElementById("sendChat");
    const chatMessages = document.getElementById("chatMessages");

    /* ==============================
       MỞ / ĐÓNG CHAT
    ============================== */
    chatBubble.addEventListener("click", function () {
        chatBox.style.display = "block";
        chatInput.focus();
    });

    closeChat.addEventListener("click", function () {
        chatBox.style.display = "none";
    });

    /* ==============================
       HÀM BỎ DẤU TIẾNG VIỆT
    ============================== */
    function removeVietnameseTones(str) {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D");
    }

    /* ==============================
       BOT TRẢ LỜI
    ============================== */
    function getDefaultReply(msg) {
        msg = removeVietnameseTones(msg.toLowerCase().trim());

        if (msg.includes("xin chao") || msg.includes("hello")) {
            return "Chào bạn 👋 Mình là chatbot hỗ trợ sinh viên!";
        }
        else if (msg.includes("dang ky")) {
            return "👉 Bạn vào mục **Đăng Ký Lao Động** để thực hiện đăng ký nhé.";
        }
        else if (msg.includes("thong ke")) {
            return "📊 Thống kê nằm trong menu **Thống Kê** trên hệ thống.";
        }
        else if (msg.includes("lich")) {
            return "📅 Bạn có thể xem lịch tại mục **Lịch Lao Động**.";
        }
        else if (msg.includes("diem danh")) {
            return "✅ Điểm danh lao động nằm ở mục **Điểm Danh Lao Động**.";
        }
        else {
            return "🤖 Xin lỗi, hiện tại mình chỉ hỗ trợ các câu hỏi cơ bản.";
        }
    }

    /* ==============================
       HIỂN THỊ TIN NHẮN
    ============================== */
    function addMessage(text, sender) {
        const msgDiv = document.createElement("div");
        msgDiv.className = sender === "user" ? "text-end mb-2" : "text-start mb-2";

        msgDiv.innerHTML = `
            <span class="badge ${sender === "user" ? "bg-primary" : "bg-secondary"} p-2">
                ${text}
            </span>
        `;

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /* ==============================
       GỬI TIN NHẮN
    ============================== */
    function sendMessage() {
        const msg = chatInput.value.trim();
        if (msg === "") return;

        addMessage(msg, "user");

        setTimeout(() => {
            const reply = getDefaultReply(msg);
            addMessage(reply, "bot");
        }, 500);

        chatInput.value = "";
    }

    sendChat.addEventListener("click", sendMessage);

    chatInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            sendMessage();
        }
    });

});
