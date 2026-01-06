document.addEventListener("DOMContentLoaded", function () {

    /* ===============================
       TOAST HIỆU ỨNG
    =============================== */
    const toastEl = document.querySelector('.toast');
    if (toastEl) {
        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        toast.show();

        const progressBar = toastEl.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.transition = "width 5s linear";
            progressBar.style.width = "0%";
        }

        setTimeout(() => {
            toastEl.style.animation = "slideOutUp 0.7s forwards";
            setTimeout(() => toastEl.remove(), 700);
        }, 5000);

        const closeBtn = toastEl.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toastEl.style.animation = "slideOutUp 0.5s forwards";
                setTimeout(() => toastEl.remove(), 500);
            });
        }
    }

    /* ===============================
       DROPDOWN USER
    =============================== */
    const userMenu = document.getElementById('userMenu');
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (userMenu && dropdownMenu) {
        userMenu.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        document.addEventListener('click', function (e) {
            if (!userMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    /* ===============================
       CHATBOT
    =============================== */
    const chatBubble = document.getElementById("chatBubble");
    const chatBox = document.getElementById("chatBox");
    const closeChat = document.getElementById("closeChat");
    const sendChat = document.getElementById("sendChat");
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");


        // Bỏ dấu tiếng Việt để so sánh
        function removeVietnameseTones(str) {
            return str.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/đ/g, "d")
                .replace(/Đ/g, "D");
        }

        // Hiển thị tin nhắn
        function addMessage(text, sender) {
            const div = document.createElement("div");
            div.className = sender === "user" ? "text-end mb-2" : "text-start mb-2";
            div.innerHTML = `
        <span class="badge ${sender === " user" ? "bg-primary" : "bg-secondary"} p-2">
        ${text}
    </span>
    `;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Gọi API lấy số ngày lao động
        function getCompletedDaysFromAPI() {
            fetch("/Student/ChatBot/GetCompletedDay")
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        addMessage(`📌 ${data.message} `, "bot");
                    } else {
                        addMessage(`⚠️ ${data.message}`, "bot");
                    }
                })
                .catch(() => {
                    addMessage("❌ Không thể kết nối đến hệ thống.", "bot");
                });
        }

        // Bot xử lý câu hỏi
        function handleBotReply(originalMsg) {
            const msg = removeVietnameseTones(originalMsg.toLowerCase().trim());

            if (msg.includes("xin chao") || msg.includes("hello")) {
                addMessage("👋 Chào bạn! Mình có thể hỗ trợ gì cho bạn?", "bot");
                return;
            }

            if (msg.includes("dang ky")) {
                addMessage("👉 Bạn vào mục **Đăng Ký Lao Động** để thực hiện nhé.", "bot");
                return;
            }

            if (msg.includes("diem danh")) {
                addMessage("✅ Điểm danh tại mục **Điểm Danh Lao Động**.", "bot");
                return;
            }

            if (
                msg.includes("bao nhieu ngay") ||
                msg.includes("da lam bao nhieu") ||
                msg.includes("so ngay lao dong")
            ) {
                addMessage("⏳ Đang kiểm tra số ngày lao động của bạn...", "bot");
                getCompletedDaysFromAPI();
                return;
            }

            addMessage("🤖 Xin lỗi, mình chưa hiểu câu hỏi này. Bạn có thể hỏi về **đăng ký**, **điểm danh**, hoặc **số ngày lao động**.", "bot");
        }

        if (chatBubble && chatBox && closeChat && sendChat && chatInput && chatMessages) {

            // Mở chat
            chatBubble.addEventListener("click", () => {
                chatBox.style.display = "block";
                chatInput.focus();

                if (!chatMessages.hasChildNodes()) {
                    addMessage("👋 Xin chào! Mình là chatbot hỗ trợ lao động sinh viên.", "bot");
                }
            });

            // Đóng chat
            closeChat.addEventListener("click", () => {
                chatBox.style.display = "none";
            });

            function sendMessage() {
                const msg = chatInput.value.trim();
                if (!msg) return;

                // Tin nhắn người dùng
                addMessage(msg, "user");
                chatInput.value = "";

                // Bot trả lời
                setTimeout(() => {
                    handleBotReply(msg);
                }, 400);
            }

            sendChat.addEventListener("click", sendMessage);

            chatInput.addEventListener("keypress", function (e) {
                if (e.key === "Enter") sendMessage();
            });
        }



    
});
